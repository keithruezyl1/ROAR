from __future__ import annotations

import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

BASE_URL = os.environ.get("ROAR_BASE_URL", "http://localhost:8000").rstrip("/")
PASSWORD = os.environ.get("ROAR_DEMO_PASSWORD", "password123")
REPORT_PATH = Path(os.environ.get("ROAR_E2E_REPORT_PATH", "ROAR_E2E_LATEST_testing_report.md"))
TRIAGE_TIMEOUT_SECONDS = int(os.environ.get("ROAR_TRIAGE_TIMEOUT_SECONDS", "120"))
POST_ACTION_TIMEOUT_SECONDS = int(os.environ.get("ROAR_POST_ACTION_TIMEOUT_SECONDS", "90"))
REPORT_TIMEOUT_SECONDS = int(os.environ.get("ROAR_REPORT_TIMEOUT_SECONDS", "90"))
POLL_INTERVAL_SECONDS = float(os.environ.get("ROAR_POLL_INTERVAL_SECONDS", "2"))

PROOF_REQUIRED_SUBTYPES = {"damaged_goods", "wrong_item", "not_as_described", "partial_fulfillment"}


@dataclass(frozen=True)
class Scenario:
    order_id: str
    customer_email: str
    customer_name: str
    dispute_type: str
    dispute_subtype: str
    resolution_preference: str
    expected_status: str
    expected_resolution_path: str
    expected_triage_decision: str
    expected_resolution_type: str
    description: str
    manual_action: str | None = None


SCENARIOS: list[Scenario] = [
    Scenario("ORD-1001", "sarah.miller@demo.com", "Sarah Miller", "refund", "not_as_described", "refund", "approved_executing", "autonomous", "autonomous", "refund", "Refund autonomous path within threshold"),
    Scenario("ORD-1002", "sarah.miller@demo.com", "Sarah Miller", "refund", "not_as_described", "refund", "awaiting_approval", "approval", "awaiting_approval", "refund", "Refund approval path over threshold"),
    Scenario("ORD-1003", "sarah.miller@demo.com", "Sarah Miller", "refund", "not_as_described", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Refund outside return window escalation", "create_refund"),
    Scenario("ORD-1004", "sarah.miller@demo.com", "Sarah Miller", "refund", "duplicate_charge", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Duplicate refund detection escalation", "mark_duplicate"),
    Scenario("ORD-1005", "sarah.miller@demo.com", "Sarah Miller", "refund", "not_as_described", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Payment not confirmed escalation", "create_refund"),
    Scenario("ORD-2001", "james.wong@demo.com", "James Wong", "delivery", "non_receipt", "refund", "approved_executing", "autonomous", "autonomous", "refund", "Delivery refund autonomous after long in-transit"),
    Scenario("ORD-2002", "james.wong@demo.com", "James Wong", "delivery", "delayed", "refund", "approved_executing", "autonomous", "autonomous", "refund", "Delivery refund autonomous after exception"),
    Scenario("ORD-2003", "james.wong@demo.com", "James Wong", "delivery", "non_receipt", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Delivered conflict escalation", "create_refund"),
    Scenario("ORD-2004", "james.wong@demo.com", "James Wong", "delivery", "lost", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Lost parcel escalation", "create_refund"),
    Scenario("ORD-2005", "james.wong@demo.com", "James Wong", "delivery", "delayed", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Delayed delivery insufficient evidence escalation", "create_refund"),
    Scenario("ORD-3001", "priya.sharma@demo.com", "Priya Sharma", "refund", "return_request", "return", "awaiting_approval", "approval", "awaiting_approval", "return", "Return request approval path"),
    Scenario("ORD-3002", "priya.sharma@demo.com", "Priya Sharma", "refund", "changed_mind", "return", "escalated_human_required", "escalation", "escalation", "return", "Return outside window escalation", "create_return"),
    Scenario("ORD-3003", "priya.sharma@demo.com", "Priya Sharma", "refund", "damaged_goods", "refund", "approved_executing", "autonomous", "autonomous", "refund", "Damaged goods refund autonomous path"),
    Scenario("ORD-3004", "priya.sharma@demo.com", "Priya Sharma", "refund", "partial_fulfillment", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Partial fulfillment escalation", "create_refund"),
    Scenario("ORD-4001", "somchai.rep@demo.com", "Somchai Replacement", "refund", "not_as_described", "replacement", "approved_executing", "autonomous", "autonomous", "replacement", "Replacement autonomous path"),
    Scenario("ORD-4002", "somchai.rep@demo.com", "Somchai Replacement", "refund", "wrong_item", "replacement", "awaiting_approval", "approval", "awaiting_approval", "replacement", "Replacement approval path over threshold"),
    Scenario("ORD-4003", "somchai.rep@demo.com", "Somchai Replacement", "refund", "damaged_goods", "replacement", "escalated_human_required", "escalation", "escalation", "replacement", "Damaged goods replacement escalation", "create_replacement"),
    Scenario("ORD-5001", "nida.wrong@demo.com", "Nida Wrongitem", "refund", "wrong_item", "refund", "approved_executing", "autonomous", "autonomous", "refund", "Wrong item refund autonomous path"),
    Scenario("ORD-5002", "nida.wrong@demo.com", "Nida Wrongitem", "refund", "wrong_item", "replacement", "approved_executing", "autonomous", "autonomous", "replacement", "Wrong item replacement autonomous path"),
    Scenario("ORD-5003", "nida.wrong@demo.com", "Nida Wrongitem", "refund", "wrong_item", "replacement", "escalated_human_required", "escalation", "escalation", "replacement", "Wrong item replacement out-of-stock escalation", "create_replacement"),
    Scenario("ORD-6001", "apinya.lost@demo.com", "Apinya Notreceived", "delivery", "non_receipt", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Delivered conflict escalation", "create_refund"),
    Scenario("ORD-6002", "apinya.lost@demo.com", "Apinya Notreceived", "delivery", "non_receipt", "replacement", "awaiting_approval", "approval", "awaiting_approval", "replacement", "Delivery replacement approval path"),
    Scenario("ORD-6003", "apinya.lost@demo.com", "Apinya Notreceived", "delivery", "lost", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Lost parcel escalation", "create_refund"),
    Scenario("ORD-7001", "chanida.partial@demo.com", "Chanida Partial", "refund", "partial_fulfillment", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Partial fulfillment escalation", "create_refund"),
    Scenario("ORD-7002", "chanida.partial@demo.com", "Chanida Partial", "refund", "other", "refund", "escalated_human_required", "escalation", "escalation", "refund", "Other escalation", "create_refund"),
]


class ApiError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, response_text: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text


def slugify(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def build_png_bytes(width: int = 256, height: int = 256, rgba: tuple[int, int, int, int] = (220, 40, 40, 255)) -> bytes:
    import struct
    import zlib

    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    row = bytes([0]) + bytes(rgba) * width
    raw = row * height
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


class RoarMatrixRunner:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.tokens: dict[str, str] = {}
        self.user_meta: dict[str, dict[str, Any]] = {}
        self.created_case_ids: list[str] = []
        self.created_case_refs: list[str] = []
        self.agent_headers: dict[str, str] = {}
        self.approver_headers: dict[str, str] = {}
        self.escalation_headers: dict[str, str] = {}
        self.scenario_results: list[dict[str, Any]] = []

    def _request(self, method: str, path: str, *, headers: dict[str, str] | None = None, expected: int | tuple[int, ...] = 200, **kwargs: Any) -> Any:
        url = f"{self.base_url}{path}"
        response = self.session.request(method, url, headers=headers, timeout=30, **kwargs)
        expected_codes = (expected,) if isinstance(expected, int) else expected
        if response.status_code not in expected_codes:
            raise ApiError(
                f"{method} {path} failed with HTTP {response.status_code}",
                status_code=response.status_code,
                response_text=response.text,
            )
        if response.content:
            content_type = response.headers.get("content-type", "")
            if "application/json" in content_type:
                return response.json()
            try:
                return response.json()
            except Exception:
                return response.text
        return None

    def login(self, email: str) -> None:
        data = self._request("POST", "/auth/login", json={"email": email, "password": PASSWORD})
        self.tokens[email] = data["access_token"]
        self.user_meta[email] = data
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        if data["role"] == "approver":
            self.approver_headers = headers
            self.agent_headers = headers
        elif data["role"] == "escalation":
            self.escalation_headers = headers

    def ensure_logins(self) -> None:
        for email in sorted({s.customer_email for s in SCENARIOS} | {"approver@roar.app", "escalation@roar.app"}):
            self.login(email)

    def customer_headers(self, email: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.tokens[email]}"}

    def create_case(self, scenario: Scenario) -> dict[str, Any]:
        payload = {
            "order_id": scenario.order_id,
            "dispute_type": scenario.dispute_type,
            "dispute_subtype": scenario.dispute_subtype,
            "resolution_preference": scenario.resolution_preference,
            "customer_name": scenario.customer_name,
            "customer_email": scenario.customer_email,
            "intake_message": f"E2E matrix test for {scenario.order_id}: {scenario.description}. Requested resolution: {scenario.resolution_preference}.",
        }
        data = self._request("POST", "/cases", json=payload, headers=self.customer_headers(scenario.customer_email), expected=201)
        self.created_case_ids.append(data["id"])
        self.created_case_refs.append(data["reference_number"])
        return data

    def get_case(self, case_id: str) -> dict[str, Any]:
        return self._request("GET", f"/cases/{case_id}", headers=self.agent_headers)

    def get_messages(self, case_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/cases/{case_id}/messages")["messages"]

    def get_refund_requests(self, case_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/cases/{case_id}/refund_requests", headers=self.agent_headers)["refund_requests"]

    def get_return_requests(self, case_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/cases/{case_id}/return_requests", headers=self.agent_headers)["return_requests"]

    def get_replacement_requests(self, case_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/cases/{case_id}/replacement_requests", headers=self.agent_headers)["replacement_requests"]

    def get_report(self, case_id: str) -> dict[str, Any]:
        return self._request("GET", f"/cases/{case_id}/report", headers=self.agent_headers)

    def get_order_items(self, order_id: str) -> list[dict[str, Any]]:
        return self._request("GET", f"/orders/{order_id}/items_with_inventory", headers=self.agent_headers)

    def upload_proof(self, scenario: Scenario, case_id: str) -> dict[str, Any]:
        files = [("files", (f"{slugify(scenario.order_id)}-proof.png", build_png_bytes(), "image/png"))]
        return self._request("POST", f"/cases/{case_id}/proof-uploads", headers=self.customer_headers(scenario.customer_email), files=files)

    def wait_for_predicate(self, label: str, fn, timeout_seconds: int) -> Any:
        deadline = time.time() + timeout_seconds
        last_exc: Exception | None = None
        while time.time() < deadline:
            try:
                result = fn()
                if result:
                    return result
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
            time.sleep(POLL_INTERVAL_SECONDS)
        if last_exc is not None:
            raise RuntimeError(f"Timed out waiting for {label}: {last_exc}") from last_exc
        raise RuntimeError(f"Timed out waiting for {label}")

    def wait_for_triage(self, scenario: Scenario, case_id: str) -> dict[str, Any]:
        deadline = time.time() + TRIAGE_TIMEOUT_SECONDS
        proof_uploaded = False
        last_case = self.get_case(case_id)
        while time.time() < deadline:
            last_case = self.get_case(case_id)
            status = last_case["status"]
            if status == "awaiting_customer_proof" and scenario.dispute_subtype in PROOF_REQUIRED_SUBTYPES and not proof_uploaded:
                self.upload_proof(scenario, case_id)
                proof_uploaded = True
                time.sleep(POLL_INTERVAL_SECONDS)
                continue
            if status in {"approved_executing", "awaiting_approval", "escalated_human_required"}:
                return last_case
            time.sleep(POLL_INTERVAL_SECONDS)
        raise RuntimeError(f"Triage did not settle for case {case_id}; last status={last_case.get('status')}")

    def approve_case(self, case_id: str) -> dict[str, Any]:
        return self._request("POST", f"/cases/{case_id}/approve", headers=self.approver_headers)

    def claim_case(self, case_id: str) -> dict[str, Any]:
        return self._request("POST", f"/cases/{case_id}/claim", headers=self.escalation_headers)

    def close_case(self, case_id: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/cases/{case_id}/close",
            headers=self.agent_headers,
            json={"closed_by": "agent", "close_reason": "resolved"},
        )

    def approve_refund_request(self, refund_request_id: str) -> dict[str, Any]:
        return self._request("POST", f"/refund_requests/{refund_request_id}/approve", headers=self.approver_headers)

    def create_refund_request(self, case: dict[str, Any], amount: float | None = None, reason: str | None = None) -> dict[str, Any]:
        triage = case.get("triage_decision") or {}
        payload = {
            "case_id": case["id"],
            "order_id": case["order_id"],
            "amount": float(amount if amount is not None else triage.get("eligible_amount") or 0),
            "reason": reason or triage.get("reason") or "Manual refund created during E2E follow-through",
            "status": "pending",
        }
        return self._request("POST", "/refund_requests", headers=self.escalation_headers, json=payload, expected=201)

    def mark_duplicate_refund(self, case_id: str) -> dict[str, Any]:
        return self._request("POST", f"/cases/{case_id}/mark-duplicate-refund", headers=self.escalation_headers)

    def create_return_request(self, case: dict[str, Any]) -> dict[str, Any]:
        items = self.get_order_items(case["order_id"])
        payload = {
            "case_id": case["id"],
            "order_id": case["order_id"],
            "item_ids": [item["item_id"] for item in items],
            "return_reason": (case.get("triage_decision") or {}).get("reason") or "Manual return created during E2E follow-through",
            "status": "pending",
        }
        return self._request("POST", "/return_requests", headers=self.escalation_headers, json=payload, expected=201)

    def approve_return_request(self, return_request_id: str) -> dict[str, Any]:
        return self._request("PATCH", f"/return_requests/{return_request_id}", headers=self.escalation_headers, json={"status": "approved"})

    def build_replacement_items(self, case: dict[str, Any]) -> list[dict[str, Any]]:
        triage = case.get("triage_decision") or {}
        items = triage.get("replacement_items")
        if not isinstance(items, list) or not items:
            bundle = case.get("information_bundle") or {}
            items = bundle.get("affected_items_detail") or bundle.get("order_items_detail") or []
        if not items:
            items = self.get_order_items(case["order_id"])

        normalized: list[dict[str, Any]] = []
        for item in items:
            normalized.append(
                {
                    "item_id": item.get("item_id") or item.get("sku"),
                    "quantity": int(item.get("quantity") or item.get("quantity_ordered") or 1),
                    "quantity_ordered": int(item.get("quantity_ordered") or item.get("quantity") or 1),
                    "product_name": item.get("product_name") or item.get("item_name"),
                    "item_name": item.get("item_name") or item.get("product_name"),
                    "warehouse_location": item.get("warehouse_location"),
                    "quantity_available_now": item.get("quantity_available_now"),
                    "unit_price": item.get("unit_price"),
                    "order_id": case["order_id"],
                }
            )
        return normalized

    def create_replacement_request(self, case: dict[str, Any]) -> dict[str, Any]:
        triage = case.get("triage_decision") or {}
        payload = {
            "case_id": case["id"],
            "order_id": case["order_id"],
            "reason": triage.get("reason") or "Manual replacement created during E2E follow-through",
            "replacement_items": self.build_replacement_items(case),
            "eligible_amount": triage.get("eligible_amount"),
            "status": "pending",
        }
        return self._request("POST", "/replacement-requests", headers=self.escalation_headers, json=payload, expected=201)

    def patch_replacement_request(self, replacement_request_id: str, status_value: str, reason: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"status": status_value}
        if reason:
            payload["reason"] = reason
        return self._request("PATCH", f"/replacement-requests/{replacement_request_id}", headers=self.agent_headers, json=payload)

    def fetch_evidence(self, case_id: str) -> dict[str, Any]:
        evidence = {
            "case": self.get_case(case_id),
            "messages": self.get_messages(case_id),
            "refund_requests": self.get_refund_requests(case_id),
            "return_requests": self.get_return_requests(case_id),
            "replacement_requests": self.get_replacement_requests(case_id),
        }
        try:
            evidence["report"] = self.get_report(case_id)
        except ApiError:
            evidence["report"] = None
        return evidence

    def capture_n8n_logs(self, tail: int = 80) -> str | None:
        try:
            result = subprocess.run(
                ["docker", "logs", "roar-n8n", "--tail", str(tail)],
                check=False,
                capture_output=True,
                text=True,
                timeout=15,
            )
            data = result.stderr or result.stdout
            return data.strip() or None
        except Exception:
            return None

    def classify_failure(self, *, actual_case: dict[str, Any] | None = None, error: str | None = None, report_found: bool | None = None) -> str:
        if error:
            lowered = error.lower()
            if "pending_triage" in lowered or "triage did not settle" in lowered or "timed out waiting for case report" in lowered:
                return "workflow orchestration defect"
            if "awaiting_customer_proof" in lowered or "proof" in lowered:
                return "contract mismatch between workflow guide and backend behavior"
            if "http 4" in lowered or "invalid" in lowered or "forbidden" in lowered:
                return "backend rule defect"
        if actual_case:
            if actual_case.get("status") == "awaiting_customer_proof":
                return "contract mismatch between workflow guide and backend behavior"
            if actual_case.get("status") == "pending_triage":
                return "workflow orchestration defect"
            return "contract mismatch between workflow guide and backend behavior"
        if report_found is False:
            return "workflow orchestration defect"
        return "test-environment/runtime failure"

    def assert_route(self, scenario: Scenario, case: dict[str, Any]) -> list[str]:
        mismatches: list[str] = []
        if case.get("status") != scenario.expected_status:
            mismatches.append(f"status expected {scenario.expected_status} but got {case.get('status')}")
        if case.get("resolution_path") != scenario.expected_resolution_path:
            mismatches.append(f"resolution_path expected {scenario.expected_resolution_path} but got {case.get('resolution_path')}")
        triage = case.get("triage_decision") or {}
        if triage.get("triage_decision") != scenario.expected_triage_decision:
            mismatches.append(f"triage_decision expected {scenario.expected_triage_decision} but got {triage.get('triage_decision')}")
        if triage.get("resolution_type") != scenario.expected_resolution_type:
            mismatches.append(f"resolution_type expected {scenario.expected_resolution_type} but got {triage.get('resolution_type')}")
        return mismatches

    def follow_approval_branch(self, scenario: Scenario, case_id: str) -> list[str]:
        notes: list[str] = []
        self.approve_case(case_id)
        if scenario.expected_resolution_type == "refund":
            refund_requests = self.wait_for_predicate(
                f"refund_requests for {case_id}",
                lambda: self.get_refund_requests(case_id),
                POST_ACTION_TIMEOUT_SECONDS,
            )
            notes.append(f"refund_requests after approval: {len(refund_requests)}")
            pending = next((item for item in refund_requests if item.get("status") == "pending"), None)
            if pending:
                self.approve_refund_request(pending["id"])
                notes.append(f"approved refund_request {pending['id']}")
        elif scenario.expected_resolution_type == "replacement":
            replacement_requests = self.wait_for_predicate(
                f"replacement_requests for {case_id}",
                lambda: self.get_replacement_requests(case_id),
                POST_ACTION_TIMEOUT_SECONDS,
            )
            notes.append(f"replacement_requests after approval: {len(replacement_requests)}")
            current = replacement_requests[0]
            if current.get("status") == "pending":
                current = self.patch_replacement_request(current["id"], "approved")
            if current.get("status") == "approved":
                current = self.patch_replacement_request(current["id"], "executing")
            if current.get("status") == "executing":
                current = self.patch_replacement_request(current["id"], "completed")
            notes.append(f"replacement_request final status: {current.get('status')}")
        elif scenario.expected_resolution_type == "return":
            return_requests = self.wait_for_predicate(
                f"return_requests for {case_id}",
                lambda: self.get_return_requests(case_id),
                POST_ACTION_TIMEOUT_SECONDS,
            )
            notes.append(f"return_requests after approval: {len(return_requests)}")
        return notes

    def follow_escalation_branch(self, scenario: Scenario, case_id: str) -> list[str]:
        notes: list[str] = []
        claimed = self.claim_case(case_id)
        notes.append(f"claimed_by={claimed.get('assigned_to')}")
        case = self.get_case(case_id)
        if scenario.manual_action == "mark_duplicate":
            self.mark_duplicate_refund(case_id)
            notes.append("marked duplicate refund")
        elif scenario.manual_action == "create_refund":
            created = self.create_refund_request(case)
            notes.append(f"created refund_request {created.get('id')}")
        elif scenario.manual_action == "create_return":
            created = self.create_return_request(case)
            notes.append(f"created return_request {created.get('id')}")
            approved = self.approve_return_request(created["id"])
            notes.append(f"approved return_request {approved.get('id')}")
        elif scenario.manual_action == "create_replacement":
            created = self.create_replacement_request(case)
            notes.append(f"created replacement_request {created.get('id')}")
            current = created
            if current.get("status") == "pending":
                current = self.patch_replacement_request(current["id"], "approved")
            if current.get("status") == "approved":
                current = self.patch_replacement_request(current["id"], "executing")
            if current.get("status") == "executing":
                current = self.patch_replacement_request(current["id"], "completed")
            notes.append(f"replacement_request final status: {current.get('status')}")
        return notes

    def follow_autonomous_branch(self, scenario: Scenario, case_id: str) -> list[str]:
        notes: list[str] = []
        if scenario.expected_resolution_type == "refund":
            try:
                refund_requests = self.wait_for_predicate(
                    f"refund_requests for {case_id}",
                    lambda: self.get_refund_requests(case_id),
                    min(30, POST_ACTION_TIMEOUT_SECONDS),
                )
                notes.append(f"refund_requests after autonomous routing: {len(refund_requests)}")
            except Exception as exc:  # noqa: BLE001
                notes.append(f"refund execution artifact not observed within window: {exc}")
        elif scenario.expected_resolution_type == "replacement":
            try:
                replacement_requests = self.wait_for_predicate(
                    f"replacement_requests for {case_id}",
                    lambda: self.get_replacement_requests(case_id),
                    min(30, POST_ACTION_TIMEOUT_SECONDS),
                )
                notes.append(f"replacement_requests after autonomous routing: {len(replacement_requests)}")
            except Exception as exc:  # noqa: BLE001
                notes.append(f"replacement execution artifact not observed within window: {exc}")
        return notes

    def close_and_fetch_report(self, case_id: str) -> dict[str, Any] | None:
        self.close_case(case_id)
        return self.wait_for_predicate(
            f"case report for {case_id}",
            lambda: self.get_report(case_id),
            REPORT_TIMEOUT_SECONDS,
        )

    def run_scenario(self, scenario: Scenario) -> dict[str, Any]:
        result: dict[str, Any] = {
            "scenario": scenario,
            "status": "failed",
            "case_id": None,
            "reference_number": None,
            "expected": {
                "status": scenario.expected_status,
                "resolution_path": scenario.expected_resolution_path,
                "triage_decision": scenario.expected_triage_decision,
                "resolution_type": scenario.expected_resolution_type,
            },
            "actual": {},
            "notes": [],
            "defect_classification": None,
            "failure": None,
            "n8n_logs": None,
        }
        try:
            created = self.create_case(scenario)
            result["case_id"] = created["id"]
            result["reference_number"] = created["reference_number"]
            case = self.wait_for_triage(scenario, created["id"])
            route_mismatches = self.assert_route(scenario, case)
            result["actual"]["triage_case"] = case
            result["notes"].append(f"triage_status={case.get('status')}")

            if case["status"] == "awaiting_approval":
                result["notes"].extend(self.follow_approval_branch(scenario, created["id"]))
            elif case["status"] == "escalated_human_required":
                result["notes"].extend(self.follow_escalation_branch(scenario, created["id"]))
            elif case["status"] == "approved_executing":
                result["notes"].extend(self.follow_autonomous_branch(scenario, created["id"]))

            report = self.close_and_fetch_report(created["id"])
            evidence = self.fetch_evidence(created["id"])
            evidence["report"] = report
            result["actual"]["evidence"] = evidence

            artifact_mismatches: list[str] = []
            if scenario.expected_status == "escalated_human_required" and not case.get("escalation_summary"):
                artifact_mismatches.append("expected escalation_summary for escalated case")
            if scenario.expected_resolution_type == "refund" and scenario.expected_status != "escalated_human_required" and not evidence["refund_requests"]:
                artifact_mismatches.append("expected refund_requests artifact after non-escalation refund flow")
            if scenario.expected_resolution_type == "replacement" and scenario.expected_status != "escalated_human_required" and not evidence["replacement_requests"]:
                artifact_mismatches.append("expected replacement_requests artifact after non-escalation replacement flow")
            if scenario.expected_resolution_type == "return" and scenario.expected_status == "awaiting_approval" and not evidence["return_requests"]:
                artifact_mismatches.append("expected return_requests artifact after approval flow")
            if not evidence["report"]:
                artifact_mismatches.append("expected case report after close")

            all_mismatches = route_mismatches + artifact_mismatches
            if all_mismatches:
                result["failure"] = "; ".join(all_mismatches)
                result["defect_classification"] = self.classify_failure(actual_case=case, report_found=bool(evidence["report"]))
            else:
                result["status"] = "passed"
        except Exception as exc:  # noqa: BLE001
            result["failure"] = str(exc)
            current_case = None
            if result["case_id"]:
                try:
                    current_case = self.get_case(result["case_id"])
                    result["actual"]["triage_case"] = current_case
                except Exception:
                    current_case = None
                try:
                    if current_case and current_case.get("status") != "closed":
                        self.close_case(result["case_id"])
                        try:
                            report = self.wait_for_predicate(
                                f"case report for failed case {result['case_id']}",
                                lambda: self.get_report(result["case_id"]),
                                min(30, REPORT_TIMEOUT_SECONDS),
                            )
                        except Exception:
                            report = None
                        try:
                            evidence = self.fetch_evidence(result["case_id"])
                            evidence["report"] = report
                            result["actual"]["evidence"] = evidence
                        except Exception:
                            pass
                except Exception:
                    pass
            result["defect_classification"] = self.classify_failure(actual_case=current_case, error=result["failure"])
            if result["defect_classification"] == "workflow orchestration defect":
                result["n8n_logs"] = self.capture_n8n_logs()
        return result

    def generate_report(self) -> str:
        passed = sum(1 for item in self.scenario_results if item["status"] == "passed")
        failed = sum(1 for item in self.scenario_results if item["status"] == "failed")
        partial = sum(1 for item in self.scenario_results if item["status"] == "partial")
        grouped_defects: dict[str, list[dict[str, Any]]] = {}
        for item in self.scenario_results:
            if item["status"] == "passed":
                continue
            grouped_defects.setdefault(item["defect_classification"] or "unclassified", []).append(item)

        lines: list[str] = []
        lines.append("# ROAR Latest E2E Testing Report")
        lines.append("")
        lines.append("## Summary")
        lines.append(f"- Base URL: `{self.base_url}`")
        lines.append(f"- Total scenarios executed: {len(self.scenario_results)}")
        lines.append(f"- Passed: {passed}")
        lines.append(f"- Failed: {failed}")
        lines.append(f"- Partial: {partial}")
        lines.append(f"- Report generated at: `{time.strftime('%Y-%m-%d %H:%M:%S')}`")
        lines.append("")
        lines.append("## Scenario Results")
        lines.append("")

        for item in self.scenario_results:
            scenario: Scenario = item["scenario"]
            lines.append(f"### {scenario.order_id} — {scenario.description}")
            lines.append("")
            lines.append(f"- Result: **{item['status']}**")
            lines.append(f"- Customer: `{scenario.customer_email}`")
            lines.append(f"- Expected route: `{scenario.expected_status}` / `{scenario.expected_resolution_path}` / `{scenario.expected_triage_decision}` / `{scenario.expected_resolution_type}`")
            if item["case_id"]:
                lines.append(f"- Case ID: `{item['case_id']}`")
            if item["reference_number"]:
                lines.append(f"- Reference: `{item['reference_number']}`")
            if item["defect_classification"]:
                lines.append(f"- Classification: `{item['defect_classification']}`")
            triage_case = item["actual"].get("triage_case") or {}
            triage = triage_case.get("triage_decision") or {}
            if triage_case:
                lines.append(f"- Actual route: `{triage_case.get('status')}` / `{triage_case.get('resolution_path')}` / `{triage.get('triage_decision')}` / `{triage.get('resolution_type')}`")
                lines.append(f"- Triage reason: `{triage.get('reason')}`")
            if item["failure"]:
                lines.append(f"- Failure: {item['failure']}")
            evidence = item["actual"].get("evidence") or {}
            if evidence:
                lines.append("- Artifacts:")
                lines.append(f"  - refund_requests: {len(evidence.get('refund_requests') or [])}")
                lines.append(f"  - return_requests: {len(evidence.get('return_requests') or [])}")
                lines.append(f"  - replacement_requests: {len(evidence.get('replacement_requests') or [])}")
                lines.append(f"  - messages: {len(evidence.get('messages') or [])}")
                lines.append(f"  - report_present: {bool(evidence.get('report'))}")
                lines.append(f"  - escalation_summary_present: {bool((evidence.get('case') or {}).get('escalation_summary'))}")
            if item["notes"]:
                lines.append("- Notes:")
                for note in item["notes"]:
                    lines.append(f"  - {note}")
            if item["n8n_logs"]:
                lines.append("- Workflow/runtime notes:")
                lines.append("```text")
                lines.append(item["n8n_logs"][-4000:])
                lines.append("```")
            lines.append("")

        lines.append("## Defect Summary")
        if grouped_defects:
            severity_order = [
                "workflow orchestration defect",
                "backend rule defect",
                "contract mismatch between workflow guide and backend behavior",
                "test-environment/runtime failure",
                "unclassified",
            ]
            for classification in severity_order:
                items = grouped_defects.get(classification)
                if not items:
                    continue
                lines.append(f"### {classification}")
                lines.append("")
                for item in items:
                    scenario = item["scenario"]
                    lines.append(f"- `{scenario.order_id}` `{scenario.description}`: {item['failure']}")
                lines.append("")
        else:
            lines.append("- No defects detected.")
            lines.append("")

        lines.append("## Residual Data")
        lines.append("- This run creates real case, chat, request, and report records in the local database.")
        lines.append(f"- Created case IDs: {', '.join(f'`{case_id}`' for case_id in self.created_case_ids) if self.created_case_ids else 'none'}")
        lines.append(f"- Created case references: {', '.join(f'`{ref}`' for ref in self.created_case_refs) if self.created_case_refs else 'none'}")
        lines.append("")
        return "\n".join(lines)

    def run(self) -> int:
        self.ensure_logins()
        for index, scenario in enumerate(SCENARIOS, start=1):
            print(f"[{index}/{len(SCENARIOS)}] Running {scenario.order_id} {scenario.description}", flush=True)
            result = self.run_scenario(scenario)
            self.scenario_results.append(result)
            print(f"    -> {result['status']}", flush=True)
        report = self.generate_report()
        REPORT_PATH.write_text(report, encoding="utf-8")
        print(f"Wrote report to {REPORT_PATH}", flush=True)
        return 0 if all(item["status"] == "passed" for item in self.scenario_results) else 1


def main() -> int:
    return RoarMatrixRunner(BASE_URL).run()


if __name__ == "__main__":
    sys.exit(main())
