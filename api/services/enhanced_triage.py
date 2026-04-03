"""
Enhanced triage logic for ROAR Engine.

Copied from `expansion/enhanced_triage.py` for backend integration.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from api.services.decision_matrix import (
    choose_window_basis_dates,
    days_since,
    normalize_dispute_subtype,
    normalize_resolution_preference,
)
from api.services.affected_items import filter_order_items_to_affected


class EnhancedTriageService:
    """
    Deterministic triage logic that can incorporate:
    - Payment records (duplicate detection, payment method context)
    - Tracking events (delivery status intelligence)
    - Inventory data (replacement feasibility)
    """

    AUTONOMOUS_REFUND_THRESHOLD = 500.00
    AUTONOMOUS_REPLACEMENT_THRESHOLD = 500.00
    RETURN_WINDOW_DAYS = 7

    PAYMENT_OK_STATUSES = {"confirmed", "completed", "succeeded", "paid"}
    ORDER_ELIGIBLE_STATUSES = {"fulfilled", "returned"}
    DELIVERY_EXCEPTION_EVENTS = {"exception", "delayed"}

    @staticmethod
    def check_payment_duplicate(payment_records: List[Dict[str, Any]], order_id: str) -> Optional[str]:
        prior_refunds = [p for p in payment_records if str(p.get("transaction_type") or "").lower() == "refund"]
        if prior_refunds:
            total_refunded = sum(float(p.get("amount", 0) or 0) for p in prior_refunds)
            return f"Duplicate refund attempt detected - THB {total_refunded:.2f} already refunded for this order"
        return None

    @staticmethod
    def _event(tracking_events: List[Dict[str, Any]], event_type: str) -> Dict[str, Any] | None:
        return next((e for e in tracking_events if str(e.get("event_type") or "").lower() == event_type), None)

    @staticmethod
    def check_inventory_availability(order_items: List[Dict[str, Any]], resolution_preference: Optional[str]) -> Dict[str, Any]:
        if resolution_preference != "replacement":
            return {"feasible": None, "reason": None}

        all_in_stock = all(
            float(item.get("quantity_available_now", 0) or 0) >= float(item.get("quantity_ordered", 0) or 0)
            for item in order_items
        )

        out_of_stock_items = [
            str(item.get("product_name") or item.get("item_name") or item.get("item_id") or "unknown")
            for item in order_items
            if float(item.get("quantity_available_now", 0) or 0) < float(item.get("quantity_ordered", 0) or 0)
        ]

        if not all_in_stock:
            return {"feasible": False, "reason": f"Replacement requested but out of stock: {', '.join(out_of_stock_items)}"}

        return {"feasible": True, "reason": "All items in stock - replacement approved"}

    @staticmethod
    def _resolve_affected_order_items(information_bundle: Dict[str, Any], order_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        raw_ids = information_bundle.get("affected_item_ids")
        affected_item_ids = [
            str(item_id).strip()
            for item_id in (raw_ids if isinstance(raw_ids, list) else [])
            if str(item_id).strip()
        ]
        return filter_order_items_to_affected(order_items, affected_item_ids)

    @staticmethod
    def _amount_for_items(order_items: List[Dict[str, Any]]) -> float:
        total = 0.0
        for item in order_items:
            quantity = float(item.get("quantity_ordered") or item.get("quantity") or 0)
            unit_price = float(item.get("unit_price") or 0)
            total += quantity * unit_price
        return total

    @classmethod
    def execute_triage(cls, case_data: Dict[str, Any], information_bundle: Dict[str, Any]) -> Dict[str, Any]:
        # Accept both old and new bundle shapes.
        order_data = information_bundle.get("order_data", {}) or {}
        order_raw = information_bundle.get("order", {}) or {}
        shipment_data = information_bundle.get("shipment_data") or information_bundle.get("shipment") or {}
        payment_records = information_bundle.get("payment_records", []) or []
        if not payment_records:
            txn = information_bundle.get("transaction")
            if isinstance(txn, dict):
                payment_records = [{
                    "transaction_type": "payment",
                    "status": txn.get("status"),
                    "amount": txn.get("amount"),
                    "payment_method": txn.get("payment_method"),
                    "transaction_date": txn.get("transacted_at"),
                }]
            for refund in information_bundle.get("refund_records", []) or []:
                payment_records.append({
                    "transaction_type": "refund",
                    "status": refund.get("status"),
                    "amount": refund.get("refund_amount"),
                    "transaction_date": refund.get("refund_date"),
                })
        tracking_events = information_bundle.get("tracking_events", []) or []
        order_items = information_bundle.get("order_items_detail", []) or []
        affected_order_items = cls._resolve_affected_order_items(information_bundle, order_items)

        dispute_type = str(case_data.get("dispute_type") or "").lower()
        subtype = normalize_dispute_subtype(case_data.get("dispute_subtype"))
        resolution_preference = normalize_resolution_preference(case_data.get("resolution_preference")) or "refund"
        total_amount = float(order_data.get("total_amount", order_raw.get("total_amount", 0)) or 0)
        affected_amount = cls._amount_for_items(affected_order_items)
        case_id = case_data.get("case_id")
        # 1) Duplicate detection
        duplicate_reason = cls.check_payment_duplicate(payment_records, str(order_data.get("order_id") or ""))
        if duplicate_reason:
            return {
                "triage_decision": "escalation",
                "resolution_type": None,
                "reason": duplicate_reason,
                "eligible_amount": 0,
                "requires_human_review": True,
                "case_id": case_id,
            }

        # 2) Payment confirmation
        payment_confirmed = any(
            str(p.get("transaction_type") or "").lower() == "payment"
            and str(p.get("status") or "").lower() in cls.PAYMENT_OK_STATUSES
            for p in payment_records
        )
        if not payment_confirmed:
            return {
                "triage_decision": "escalation",
                "resolution_type": "refund",
                "reason": "Payment not confirmed",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        delivered_event = cls._event(tracking_events, "delivered")
        lost_event = cls._event(tracking_events, "lost")
        exception_event = next(
            (e for e in tracking_events if str(e.get("event_type") or "").lower() in cls.DELIVERY_EXCEPTION_EVENTS),
            None,
        )
        in_transit_event = cls._event(tracking_events, "in_transit")

        # 3) Tracking conflicts (delivered + dispute)
        if dispute_type == "delivery" and delivered_event is not None and subtype in {"non_receipt", "lost"}:
            return {
                "triage_decision": "escalation",
                "resolution_type": resolution_preference,
                "reason": "Delivery marked complete but customer reports non-receipt - investigation required",
                "tracking_evidence": f"Delivered at {delivered_event.get('location', 'unknown')} on {delivered_event.get('event_time', 'unknown')}",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        # 4) Hard-stop policies
        if dispute_type == "delivery" and lost_event is not None:
            return {
                "triage_decision": "escalation",
                "resolution_type": resolution_preference,
                "reason": "Lost parcel - always escalated per policy",
                "tracking_evidence": f"Lost event at {lost_event.get('location', 'unknown')} on {lost_event.get('event_time', 'unknown')}",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        if subtype == "partial_fulfillment":
            return {
                "triage_decision": "escalation",
                "resolution_type": resolution_preference,
                "reason": "Partial refunds require human agent review",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        if subtype == "damaged_goods" and resolution_preference == "replacement":
            return {
                "triage_decision": "escalation",
                "resolution_type": "replacement",
                "reason": "Damaged goods must be escalated per policy",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        # Delivered/fulfilled date first, then safe fallback.
        window_basis = choose_window_basis_dates([
            ("delivered_event", delivered_event.get("event_time") if delivered_event else None),
            ("fulfilled_at", order_data.get("fulfilled_at") or order_raw.get("fulfilled_at")),
            ("order_date", order_data.get("order_date") or order_raw.get("created_at")),
        ])
        days_window = days_since(window_basis.date)
        within_return_window = days_window is not None and days_window <= cls.RETURN_WINDOW_DAYS
        order_status = str(order_data.get("order_status") or order_raw.get("status") or "").lower()
        order_status_ok = order_status in cls.ORDER_ELIGIBLE_STATUSES

        # 5) Resolution preference routing
        inventory_check = cls.check_inventory_availability(affected_order_items, resolution_preference)

        if resolution_preference == "replacement":
            replacement_amount = affected_amount if affected_order_items else total_amount
            # Delivery replacement scenario (R) is approval-only when eligible.
            if dispute_type == "delivery" and subtype in {"non_receipt", "lost"}:
                if inventory_check["feasible"] is False:
                    return {
                        "triage_decision": "escalation",
                        "resolution_type": "replacement",
                        "reason": inventory_check["reason"],
                        "eligible_amount": replacement_amount,
                        "requires_human_review": True,
                        "case_id": case_id,
                    }
                return {
                    "triage_decision": "awaiting_approval",
                    "resolution_type": "replacement",
                    "reason": "Delivery failure replacement requires human approval",
                    "replacement_items": affected_order_items,
                    "eligible_amount": replacement_amount,
                    "requires_human_review": True,
                    "case_id": case_id,
                }

            # Refund lane replacement (F/G/H/I)
            if inventory_check["feasible"] is False:
                return {
                    "triage_decision": "escalation",
                    "resolution_type": "replacement",
                    "reason": inventory_check["reason"],
                    "eligible_amount": replacement_amount,
                    "requires_human_review": True,
                    "case_id": case_id,
                }
            if replacement_amount <= cls.AUTONOMOUS_REPLACEMENT_THRESHOLD:
                return {
                    "triage_decision": "autonomous",
                    "resolution_type": "replacement",
                    "reason": inventory_check["reason"],
                    "replacement_items": affected_order_items,
                    "eligible_amount": replacement_amount,
                    "requires_human_review": False,
                    "case_id": case_id,
                }
            return {
                "triage_decision": "awaiting_approval",
                "resolution_type": "replacement",
                "reason": f"Replacement approved pending review - order value THB {replacement_amount:.2f}",
                "replacement_items": affected_order_items,
                "eligible_amount": replacement_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        if resolution_preference == "return":
            if subtype in {"return_request", "changed_mind"} and order_status_ok and within_return_window:
                return {
                    "triage_decision": "awaiting_approval",
                    "resolution_type": "return",
                    "reason": "Return request requires manual review and inspection",
                    "eligible_amount": total_amount,
                    "requires_human_review": True,
                    "case_id": case_id,
                }
            return {
                "triage_decision": "escalation",
                "resolution_type": "return",
                "reason": "Return request violates policy constraints",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        # 6/7/8) Refund lane and delivery refund auto-rules.
        if dispute_type == "delivery":
            # Plain non-receipt cases can auto-refund when payment is confirmed and
            # tracking does not show delivery or a lost-parcel hard stop. This aligns
            # the seeded delivery refund path with the manual E2E guide expectations.
            if subtype == "non_receipt" and delivered_event is None and lost_event is None:
                return {
                    "triage_decision": "autonomous",
                    "resolution_type": "refund",
                    "reason": "Non-receipt with no delivery confirmation - autonomous refund approved",
                    "eligible_amount": total_amount,
                    "requires_human_review": False,
                    "case_id": case_id,
                }

            if exception_event and delivered_event is None:
                return {
                    "triage_decision": "autonomous",
                    "resolution_type": "refund",
                    "reason": "Carrier exception detected - autonomous refund approved",
                    "tracking_evidence": f"Exception event: {exception_event.get('event_type')} at {exception_event.get('location', 'unknown')}",
                    "eligible_amount": total_amount,
                    "requires_human_review": False,
                    "case_id": case_id,
                }

            if in_transit_event and delivered_event is None:
                in_transit_basis = choose_window_basis_dates([("in_transit", in_transit_event.get("event_time"))])
                days_in_transit = days_since(in_transit_basis.date)
                if days_in_transit is not None and days_in_transit > 7:
                    return {
                        "triage_decision": "autonomous",
                        "resolution_type": "refund",
                        "reason": f"Package in transit for {days_in_transit} days - autonomous refund approved",
                        "tracking_evidence": f"Last tracking update: in_transit on {in_transit_basis.date.date() if in_transit_basis.date else 'unknown'}",
                        "eligible_amount": total_amount,
                        "requires_human_review": False,
                        "case_id": case_id,
                    }

            # SLA breach: shipping fee refund only.
            estimated_delivery = shipment_data.get("estimated_delivery")
            fulfilled_or_delivered = choose_window_basis_dates([
                ("delivered_event", delivered_event.get("event_time") if delivered_event else None),
                ("fulfilled_at", order_data.get("fulfilled_at") or order_raw.get("fulfilled_at")),
            ])
            estimate_dt = choose_window_basis_dates([("estimated_delivery", estimated_delivery)])
            if estimate_dt.date and fulfilled_or_delivered.date:
                overdue_days = days_since(estimate_dt.date, fulfilled_or_delivered.date)
                if overdue_days is not None and overdue_days > 3:
                    shipping_fee = float(order_data.get("shipping_fee") or order_raw.get("shipping_fee") or 0)
                    return {
                        "triage_decision": "autonomous",
                        "resolution_type": "refund",
                        "reason": "Delivery SLA breached - shipping fee refund only",
                        "shipping_fee_refund_only": True,
                        "eligible_amount": shipping_fee,
                        "requires_human_review": False,
                        "case_id": case_id,
                    }

        if not order_status_ok:
            return {
                "triage_decision": "escalation",
                "resolution_type": "refund",
                "reason": f"Order status is '{order_status or 'unknown'}'",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        if total_amount > cls.AUTONOMOUS_REFUND_THRESHOLD:
            return {
                "triage_decision": "awaiting_approval",
                "resolution_type": "refund",
                "reason": f"High-value refund requires approval (THB {total_amount:.2f})",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        if not within_return_window:
            day_msg = str(days_window) if days_window is not None else "unknown"
            return {
                "triage_decision": "escalation",
                "resolution_type": "refund",
                "reason": f"{day_msg} days since order (>7 day window)",
                "eligible_amount": total_amount,
                "requires_human_review": True,
                "case_id": case_id,
            }

        return {
            "triage_decision": "autonomous",
            "resolution_type": "refund",
            "reason": "Autonomous refund approved - all policy conditions met",
            "eligible_amount": total_amount,
            "requires_human_review": False,
            "case_id": case_id,
        }
