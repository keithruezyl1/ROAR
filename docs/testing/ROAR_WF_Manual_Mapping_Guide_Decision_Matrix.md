# ROAR WF Manual Mapping Guide (Scenario-Complete Matrix Aligned)

This guide is the workflow-facing source of truth for:
- canonical case fields from WF2
- WF3 triage routing rules by canonical subtype
- WF5 record-creation routing and payload contracts

This document is intentionally stricter than the older transport-only mapping guide.
If WF3 logic conflicts with this document, WF3 should be updated to match this matrix.

## 1) WF2 (Data Retrieval Agent) -> case bundle update

### Required case-context fields to preserve
- `case_id`
- `order_id`
- `dispute_type` (`refund|delivery`)
- `dispute_subtype` (canonical matrix subtype)
- `resolution_preference` (`refund|replacement|return`)

### Canonical `dispute_subtype` values
- Refund lane: `duplicate_charge`, `not_as_described`, `damaged_goods`, `wrong_item`, `partial_fulfillment`, `return_request`, `changed_mind`, `other`
- Delivery lane: `non_receipt`, `delayed`, `exception`, `lost`

### Legacy aliases to normalize before WF3
- `package_never_arrived` -> `non_receipt`
- `delivery_late` -> `delayed`
- `wrong_delivery_address` -> `exception`
- `quality_issue` -> `not_as_described`
- `return_for_refund` -> `return_request`

Legacy aliases are accepted by API, but WF should pass canonical values whenever possible.

### `information_bundle` minimum shape expected downstream
```json
{
  "order_data": {
    "order_id": "ORD-3008",
    "order_status": "fulfilled",
    "order_date": "2026-03-25T04:53:42.464514+00:00",
    "fulfilled_at": "2026-03-25T16:53:42.464514+00:00",
    "total_amount": 470
  },
  "payment_records": [
    {
      "transaction_type": "payment",
      "status": "confirmed",
      "amount": 470,
      "payment_method": "credit_card",
      "transaction_date": "2026-03-25T04:53:42.464514+00:00"
    }
  ],
  "tracking_events": [],
  "shipment_data": {
    "status": "in_transit",
    "estimated_delivery": "2026-03-28T00:00:00+00:00"
  },
  "order_items_detail": [
    {
      "item_id": "SKU-NOTEBOOK-001",
      "product_name": "Premium Hardcover Notebook A5",
      "quantity_ordered": 1,
      "quantity_available_now": 310,
      "warehouse_location": "BKK-03",
      "unit_price": 120
    }
  ],
  "affected_item_ids": ["SKU-NOTEBOOK-001"],
  "affected_items_detail": [
    {
      "item_id": "SKU-NOTEBOOK-001",
      "product_name": "Premium Hardcover Notebook A5",
      "quantity_ordered": 1,
      "quantity_available_now": 310,
      "warehouse_location": "BKK-03",
      "unit_price": 120
    }
  ]
}
```

### WF2 bundle guardrails
- `affected_item_ids` and `affected_items_detail` are additive fields.
- Do not replace `order_items_detail` with subset items.
- Refund and return flows may still use full-order context unless explicitly narrowed later.
- Replacement flows should prefer `affected_items_detail` when present.

## 2) WF3 (Triage Agent) -> normalized output contract

### Decision payload contract
WF3 should emit:
- `triage_decision`: `autonomous | awaiting_approval | escalation`
- `resolution_type`: `refund | replacement | return`
- `reason`
- `eligible_amount`
- `requires_human_review`
- optional: `tracking_evidence`, `replacement_items`, `shipping_fee_refund_only`, `affected_item_ids`

### Case PATCH body for each route

#### Autonomous
```json
{
  "status": "approved_executing",
  "resolution_path": "autonomous",
  "triage_decision": {
    "triage_decision": "autonomous",
    "resolution_type": "replacement",
    "reason": "All items in stock - replacement approved",
    "eligible_amount": 470,
    "requires_human_review": false,
    "replacement_items": []
  }
}
```

#### Awaiting approval
```json
{
  "status": "awaiting_approval",
  "resolution_path": "approval",
  "triage_decision": {
    "triage_decision": "awaiting_approval",
    "resolution_type": "return",
    "reason": "Return request requires manual review and inspection",
    "eligible_amount": 470,
    "requires_human_review": true
  }
}
```

#### Escalation
```json
{
  "status": "escalated_human_required",
  "resolution_path": "escalation",
  "triage_decision": {
    "triage_decision": "escalation",
    "resolution_type": "refund",
    "reason": "Delivery marked complete but customer reports non-receipt - investigation required",
    "eligible_amount": 470,
    "requires_human_review": true,
    "tracking_evidence": "Delivered at ..."
  }
}
```

## 3) WF3 Decision Matrix (Source of Truth)

### Global pre-checks (apply before subtype routing)

#### G1. Duplicate refund detection
Apply when final `resolution_type` candidate is `refund`.

Conditions:
- prior refund exists on order

Outcome:
- `triage_decision = escalation`
- `resolution_type = refund`
- reason should mention duplicate refund risk and total refunded amount

#### G2. Payment confirmation required
Apply to all autonomous / approval candidate paths.

Conditions:
- payment status is not one of `confirmed | completed | succeeded | paid`

Outcome:
- `triage_decision = escalation`
- `resolution_type = preferred route if known, otherwise refund`
- reason should mention payment not confirmed

#### G3. Delivered-but-disputed conflict
Apply to delivery disputes for `non_receipt` and `lost`.

Conditions:
- tracking contains delivered event
- customer is claiming non-receipt / lost parcel

Outcome:
- `triage_decision = escalation`
- `resolution_type = customer preference when present`
- include `tracking_evidence`

#### G4. Thresholds
- Autonomous refund threshold: `THB 500`
- Autonomous replacement threshold: `THB 500`
- Return requests are never autonomous in this matrix
- Return/refund policy window: `7 days`

#### G5. Amount basis
- Replacement: use affected-item subset amount when `affected_items_detail` exists, otherwise full order amount
- Refund: use full order amount unless a later subtype rule explicitly limits to shipping fee only or missing-item subset
- Return: use full order amount unless a later subtype rule explicitly narrows to selected items

## 4) Scenario-Complete Matrix by Canonical Subtype

### Refund lane subtypes

#### `duplicate_charge`
Allowed resolution types:
- `refund`

Rules:
- if prior refund exists -> `escalation / refund`
- else if payment not confirmed -> `escalation / refund`
- else if amount <= THB 500 -> `autonomous / refund`
- else -> `awaiting_approval / refund`

Notes:
- do not route to replacement or return

#### `not_as_described`
Allowed resolution types:
- `refund`
- `replacement`

Rules when preference = `replacement`:
- if payment not confirmed -> `escalation / replacement`
- if affected replacement items out of stock / unknown -> `escalation / replacement`
- if affected replacement amount <= THB 500 -> `autonomous / replacement`
- else -> `awaiting_approval / replacement`

Rules when preference = `refund`:
- if prior refund exists -> `escalation / refund`
- else if payment not confirmed -> `escalation / refund`
- else if outside 7-day window -> `escalation / refund`
- else if amount <= THB 500 -> `autonomous / refund`
- else -> `awaiting_approval / refund`

#### `damaged_goods`
Allowed resolution types:
- `refund`
- `replacement`

Rules when preference = `replacement`:
- always `escalation / replacement`
- reason should mention damaged goods replacement requires human review

Rules when preference = `refund`:
- if prior refund exists -> `escalation / refund`
- else if payment not confirmed -> `escalation / refund`
- else if outside 7-day window -> `escalation / refund`
- else if amount <= THB 500 -> `autonomous / refund`
- else -> `awaiting_approval / refund`

#### `wrong_item`
Allowed resolution types:
- `refund`
- `replacement`

Rules when preference = `replacement`:
- if payment not confirmed -> `escalation / replacement`
- if affected replacement items out of stock / unknown -> `escalation / replacement`
- if affected replacement amount <= THB 500 -> `autonomous / replacement`
- else -> `awaiting_approval / replacement`

Rules when preference = `refund`:
- if prior refund exists -> `escalation / refund`
- else if payment not confirmed -> `escalation / refund`
- else if outside 7-day window -> `escalation / refund`
- else if amount <= THB 500 -> `autonomous / refund`
- else -> `awaiting_approval / refund`

#### `partial_fulfillment`
Allowed resolution types:
- `refund`

Rules:
- always `escalation / refund`
- reason should mention partial fulfillment requires human review

Notes:
- later optimization may support subset refunding of missing items, but current matrix keeps it human-reviewed

#### `return_request`
Allowed resolution types:
- `return`

Rules:
- if order status not eligible -> `escalation / return`
- else if outside 7-day window -> `escalation / return`
- else -> `awaiting_approval / return`

Notes:
- never autonomous because physical item inspection is required

#### `changed_mind`
Allowed resolution types:
- `return`

Rules:
- if order status not eligible -> `escalation / return`
- else if outside 7-day window -> `escalation / return`
- else -> `awaiting_approval / return`

Notes:
- never autonomous because physical item inspection is required

#### `other`
Allowed resolution types:
- `refund`

Rules:
- always `escalation / refund`
- reason should mention uncategorized dispute requires manual review

### Delivery lane subtypes

#### `non_receipt`
Allowed resolution types:
- `refund`
- `replacement`

Rules when tracking shows delivered:
- always `escalation`
- include `tracking_evidence`

Rules when preference = `replacement` and not delivered:
- if inventory not feasible -> `escalation / replacement`
- else -> `awaiting_approval / replacement`

Rules when preference = `refund` and not delivered:
- if carrier exception exists and not delivered -> `autonomous / refund`
- else if in_transit > 7 days and not delivered -> `autonomous / refund`
- else -> `escalation / refund`

#### `delayed`
Allowed resolution types:
- `refund`

Rules:
- if delivered and SLA breach > 3 days -> `autonomous / refund` with `shipping_fee_refund_only = true`
- else if exception event exists and not delivered -> `autonomous / refund`
- else if in_transit > 7 days and not delivered -> `autonomous / refund`
- else -> `escalation / refund`

Notes:
- delivery delay does not route to replacement in this matrix

#### `exception`
Allowed resolution types:
- `refund`

Rules:
- if exception event exists and not delivered -> `autonomous / refund`
- else if delivered -> `escalation / refund`
- else -> `escalation / refund`

#### `lost`
Allowed resolution types:
- `refund`
- `replacement`

Rules when tracking shows delivered:
- `escalation`

Rules when tracking shows lost:
- always `escalation`
- reason should mention lost parcel per policy

Rules when preference = `replacement` and not delivered but severe failure is otherwise established:
- if inventory feasible -> `awaiting_approval / replacement`
- else -> `escalation / replacement`

Rules when preference = `refund` and not delivered:
- if lost event exists -> `escalation / refund`
- else if exception event exists or in_transit > 7 days -> `autonomous / refund`
- else -> `escalation / refund`

## 5) WF5 (Resolution Agent) -> request creation by `resolution_type`

Use the triage outcome `resolution_type` to choose API:
- `refund` -> `POST /refund_requests`
- `replacement` -> `POST /replacement-requests`
- `return` -> `POST /return_requests`

Do not cross-create a different record type.

### Replacement create example
```json
{
  "case_id": "8ea90806-7e78-4977-8cfa-d94a0b5fcb73",
  "order_id": "ORD-3008",
  "status": "approved",
  "reason": "Autonomous replacement approved: inventory available and amount within threshold",
  "eligible_amount": 120,
  "replacement_items": [
    {
      "item_id": "SKU-NOTEBOOK-001",
      "quantity": 1,
      "product_name": "Premium Hardcover Notebook A5",
      "warehouse_location": "BKK-03"
    }
  ]
}
```

### Return create example
```json
{
  "case_id": "8ea90806-7e78-4977-8cfa-d94a0b5fcb73",
  "order_id": "ORD-3008",
  "status": "pending",
  "item_ids": ["SKU-NOTEBOOK-001"],
  "return_reason": "Changed my mind"
}
```

### Refund create example
```json
{
  "case_id": "8ea90806-7e78-4977-8cfa-d94a0b5fcb73",
  "order_id": "ORD-3008",
  "amount": 470,
  "reason": "Autonomous refund approved",
  "status": "pending"
}
```

## 6) WF5 -> final case PATCH after record creation

When request creation succeeds, patch case to:
```json
{
  "status": "resolved"
}
```

Keep status transitions valid:
- `pending_triage -> approved_executing | awaiting_approval | escalated_human_required`
- `awaiting_approval -> approved_executing | rejected_human_required`
- `approved_executing -> resolved`
- `resolved -> closed`

## 7) Practical guardrails
- Always pass auth header on protected PATCH/POST nodes.
- Keep `resolution_preference` and `resolution_type` distinct:
  - preference = customer request from intake
  - type = final route chosen by triage
- Prefer canonical subtypes in all WF payloads; aliases are fallback only.
- WF3 should not route to a `resolution_type` that is not allowed for the canonical subtype.
- WF3 replacement decisions must prefer `affected_items_detail` over full-order `order_items_detail` when present.
- WF5 record creation should trust `triage_decision.resolution_type`, not the execute-model free-text output.
