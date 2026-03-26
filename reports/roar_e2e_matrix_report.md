# ROAR E2E Matrix Report

## Summary
- Total scenarios executed: 7
- Passed: 2
- Failed: 5
- Partial: 0
- Skipped: 0

## Scenario Results

### A_refund_autonomous_happy: Refund autonomous happy path (WF4 not used, WF5 refund execution)

- Status: **failed**
- Case: `ec1178c4-4095-462f-80e0-6062fa61311f`
- Reference: `CASE-00051`
- Expected: awaiting_approval -> approve -> resolved; refund_requests created; ai resolution message posted
- Actual: Exception thrown during scenario execution
- Failure: Timed out waiting for triage for case ec1178c4-4095-462f-80e0-6062fa61311f

**Evidence (key fields):**
- used_order_id: `ORD-10042-A-19cd00`

---

### B_refund_escalation_threshold: Refund escalates due to threshold (WF4 summary + system message; no autonomous refund)

- Status: **failed**
- Case: `5e559017-8112-4972-a6fc-ecc8ea7d9c16`
- Reference: `CASE-00052`
- Expected: escalated_human_required; escalation_summary saved; WF4 system message posted; no refund_requests before escalation actions
- Actual: Exception thrown during scenario execution
- Failure: Timed out waiting for triage for case 5e559017-8112-4972-a6fc-ecc8ea7d9c16

**Evidence (key fields):**
- used_order_id: `ORD-10043-B-04d895`

---

### C_refund_escalation_partial: Escalation partial refund action (manual escalation agent action surface)

- Status: **failed**
- Case: `e0c0e24e-dacc-486e-b66d-491c2785ab95`
- Reference: `CASE-00053`
- Expected: escalation -> claim -> POST /refund_requests creates refund_request with partial template message
- Actual: Exception thrown during scenario execution
- Failure: Timed out waiting for triage for case e0c0e24e-dacc-486e-b66d-491c2785ab95

**Evidence (key fields):**
- used_order_id: `ORD-10043-C-423765`

---

### D_delivery_autonomous_return_path: Delivery autonomous path creates return_requests (WF5 execution path)

- Status: **failed**
- Case: `0b016b5d-161a-4041-b080-1e0fe0c1c0d9`
- Reference: `CASE-00054`
- Expected: awaiting_approval -> approve -> resolved; return_requests created; ai resolution message posted
- Actual: Exception thrown during scenario execution
- Failure: Timed out waiting for triage for case 0b016b5d-161a-4041-b080-1e0fe0c1c0d9

**Evidence (key fields):**
- used_order_id: `ORD-20088-D-b01027`

---

### E1_invalid_malformed_request: Invalid create_case payload returns 422

- Status: **passed**
- Expected: POST /cases with invalid dispute_type -> 422
- Actual: Received HTTP 422 as expected.
- Failure: create_case failed (422): {'detail': 'Invalid dispute_type'}

---

### E2_missing_information_bundle_escalates: Missing sim_* data forces triage escalation (WF4 artifacts present)

- Status: **failed**
- Case: `e463c7fd-558f-4c4d-babe-3f89f4cda883`
- Reference: `CASE-00055`
- Expected: escalated_human_required; escalation_summary saved; WF4 system message posted; no autonomous refund execution
- Actual: Exception thrown during scenario execution
- Failure: Timed out waiting for triage for case e463c7fd-558f-4c4d-babe-3f89f4cda883

**Evidence (key fields):**
- used_order_id: `ORD-99999-E2-100a40`

---

### F_duplicate_open_case: Duplicate open case for same order_id returns 409

- Status: **passed**
- Case: `21a94419-e045-4252-bc1f-9ab245a9a1fe`
- Reference: `CASE-00056`
- Expected: second POST /cases for same order_id while first is open -> 409
- Actual: Received HTTP 409 for duplicate open case.

**Evidence (key fields):**
- used_order_id: `ORD-10042-F-4a4875`

---

## Residual Test Data

This harness creates real cases/messages/refund_requests/return_requests in the local PostgreSQL DB. It attempts to close created cases to trigger WF6 reports, but it does not delete DB records to avoid unsafe cleanup. If cleanup is needed, delete by reference_number (or case_id) listed in the report results.

### Cloned sim_* order_ids

- `ORD-10042-A-19cd00`
- `ORD-10043-B-04d895`
- `ORD-10043-C-423765`
- `ORD-20088-D-b01027`
