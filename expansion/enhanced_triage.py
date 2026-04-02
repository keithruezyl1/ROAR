# api/services/enhanced_triage.py
"""
Enhanced triage logic for ROAR Engine
Uses payment history, tracking events, and inventory data for intelligent routing
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


class EnhancedTriageService:
    """
    Deterministic triage logic that uses all three data sources:
    - Payment records (duplicate detection, payment method context)
    - Tracking events (delivery status intelligence)
    - Inventory data (replacement feasibility)
    """
    
    AUTONOMOUS_REFUND_THRESHOLD = 500.00  # Baht
    AUTONOMOUS_REPLACEMENT_THRESHOLD = 500.00  # Baht
    
    @staticmethod
    def check_payment_duplicate(payment_records: List[Dict], order_id: str) -> Optional[str]:
        """
        Check if a prior refund exists for this order.
        Returns escalation reason if duplicate detected, None otherwise.
        """
        prior_refunds = [
            p for p in payment_records
            if p.get('transaction_type') == 'refund' and p.get('related_order_id') == order_id
        ]
        
        if prior_refunds:
            total_refunded = sum(p.get('amount', 0) for p in prior_refunds)
            return f"Duplicate refund attempt detected - ฿{total_refunded:.2f} already refunded for this order"
        
        return None
    
    @staticmethod
    def analyze_tracking_events(
        tracking_events: List[Dict],
        dispute_type: str
    ) -> Dict[str, Any]:
        """
        Parse tracking events to determine delivery status and exceptions.
        Returns routing decision based on tracking intelligence.
        """
        # Find key events
        delivered = next((e for e in tracking_events if e.get('event_type') == 'delivered'), None)
        in_transit = next((e for e in tracking_events if e.get('event_type') == 'in_transit'), None)
        exception = next((e for e in tracking_events if e.get('event_type') in ['exception', 'delayed']), None)
        
        # Scenario 1: Delivered but customer disputes non-receipt
        if delivered and dispute_type == 'delivery':
            return {
                'requires_escalation': True,
                'reason': 'Delivery marked complete but customer reports non-receipt - investigation required',
                'evidence': f"Delivered at {delivered.get('location', 'unknown location')} on {delivered.get('event_time', 'unknown date')}"
            }
        
        # Scenario 2: Exception or delay detected - autonomous approval
        if exception and not delivered:
            return {
                'requires_escalation': False,
                'reason': 'Carrier exception detected - autonomous refund approved',
                'evidence': f"Exception event: {exception.get('event_type')} at {exception.get('location', 'unknown')}"
            }
        
        # Scenario 3: In transit for too long (>7 days)
        if in_transit and not delivered:
            event_time = datetime.fromisoformat(in_transit.get('event_time', datetime.now().isoformat()))
            days_in_transit = (datetime.now(event_time.tzinfo) - event_time).days
            
            if days_in_transit > 7:
                return {
                    'requires_escalation': False,
                    'reason': f'Package in transit for {days_in_transit} days - autonomous refund approved',
                    'evidence': f"Last tracking update: {in_transit.get('event_type')} on {event_time.date()}"
                }
        
        # Default: no special routing based on tracking
        return {
            'requires_escalation': False,
            'reason': None,
            'evidence': None
        }
    
    @staticmethod
    def check_inventory_availability(
        order_items: List[Dict],
        resolution_preference: Optional[str]
    ) -> Dict[str, Any]:
        """
        Check if replacement is feasible based on inventory availability.
        """
        if resolution_preference != 'replacement':
            return {'feasible': None, 'reason': None}
        
        # Check if all items are in stock
        all_in_stock = all(
            item.get('quantity_available_now', 0) >= item.get('quantity_ordered', 0)
            for item in order_items
        )
        
        out_of_stock_items = [
            item['product_name']
            for item in order_items
            if item.get('quantity_available_now', 0) < item.get('quantity_ordered', 0)
        ]
        
        if not all_in_stock:
            return {
                'feasible': False,
                'reason': f"Replacement requested but out of stock: {', '.join(out_of_stock_items)}"
            }
        
        return {
            'feasible': True,
            'reason': 'All items in stock - replacement approved'
        }
    
    @classmethod
    def execute_triage(
        cls,
        case_data: Dict[str, Any],
        information_bundle: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main triage execution logic.
        Returns comprehensive triage decision with routing and resolution type.
        """
        order_data = information_bundle.get('order_data', {})
        payment_records = information_bundle.get('payment_records', [])
        tracking_events = information_bundle.get('tracking_events', [])
        order_items = information_bundle.get('order_items_detail', [])
        
        dispute_type = case_data.get('dispute_type')
        resolution_preference = case_data.get('resolution_preference')
        
        # Step 1: Check for payment duplicates (CRITICAL - always check first)
        duplicate_reason = cls.check_payment_duplicate(payment_records, order_data.get('order_id'))
        if duplicate_reason:
            return {
                'triage_decision': 'escalation',
                'resolution_type': None,
                'reason': duplicate_reason,
                'eligible_amount': 0,
                'requires_human_review': True
            }
        
        # Step 2: Analyze tracking events (delivery intelligence)
        tracking_analysis = cls.analyze_tracking_events(tracking_events, dispute_type)
        if tracking_analysis['requires_escalation']:
            return {
                'triage_decision': 'escalation',
                'resolution_type': 'refund',
                'reason': tracking_analysis['reason'],
                'tracking_evidence': tracking_analysis['evidence'],
                'eligible_amount': order_data.get('total_amount', 0),
                'requires_human_review': True
            }
        
        # Step 3: Calculate eligible amount
        total_amount = order_data.get('total_amount', 0)
        
        # Step 4: Check inventory for replacement requests
        inventory_check = cls.check_inventory_availability(order_items, resolution_preference)
        
        if resolution_preference == 'replacement':
            if not inventory_check['feasible']:
                # Out of stock - escalate for alternatives (store credit, refund, etc.)
                return {
                    'triage_decision': 'escalation',
                    'resolution_type': None,
                    'reason': inventory_check['reason'],
                    'eligible_amount': total_amount,
                    'requires_human_review': True
                }
            
            # Replacement is feasible - check threshold
            if total_amount <= cls.AUTONOMOUS_REPLACEMENT_THRESHOLD:
                return {
                    'triage_decision': 'autonomous',
                    'resolution_type': 'replacement',
                    'reason': inventory_check['reason'],
                    'replacement_items': order_items,
                    'eligible_amount': total_amount,
                    'requires_human_review': False
                }
            else:
                # High-value replacement needs approval
                return {
                    'triage_decision': 'awaiting_approval',
                    'resolution_type': 'replacement',
                    'reason': f'Replacement approved pending review - order value ฿{total_amount:.2f}',
                    'replacement_items': order_items,
                    'eligible_amount': total_amount,
                    'requires_human_review': True
                }
        
        # Step 5: Default refund logic (existing autonomous refund rules)
        # Check all 5 conditions for autonomous refund
        payment_confirmed = any(
            p.get('transaction_type') == 'payment' and p.get('status') == 'completed'
            for p in payment_records
        )
        
        order_fulfilled = order_data.get('order_status') in ['fulfilled', 'returned']
        
        order_date = datetime.fromisoformat(order_data.get('order_date', datetime.now().isoformat()))
        days_since_order = (datetime.now(order_date.tzinfo) - order_date).days
        within_return_window = days_since_order <= 7
        
        # All conditions must pass
        if (payment_confirmed and 
            order_fulfilled and 
            total_amount <= cls.AUTONOMOUS_REFUND_THRESHOLD and
            within_return_window):
            
            return {
                'triage_decision': 'autonomous',
                'resolution_type': 'refund',
                'reason': 'Autonomous refund approved - all policy conditions met',
                'eligible_amount': total_amount,
                'requires_human_review': False,
                'tracking_evidence': tracking_analysis.get('evidence')
            }
        
        # Step 6: Escalation for any failed condition
        failed_conditions = []
        if not payment_confirmed:
            failed_conditions.append('payment not confirmed')
        if not order_fulfilled:
            failed_conditions.append('order not fulfilled')
        if total_amount > cls.AUTONOMOUS_REFUND_THRESHOLD:
            failed_conditions.append(f'amount ฿{total_amount:.2f} exceeds threshold')
        if not within_return_window:
            failed_conditions.append(f'{days_since_order} days since order (>7 day window)')
        
        return {
            'triage_decision': 'escalation',
            'resolution_type': 'refund',
            'reason': f"Escalation required: {', '.join(failed_conditions)}",
            'eligible_amount': total_amount,
            'requires_human_review': True
        }
