# ROAR Complete Resolution Decision Matrix
## All Scenarios: Dispute Type × Resolution Preference × Conditions

---

## DISPUTE TYPE: REFUND

### Scenario 1: Refund Dispute → Customer Wants Refund
**Subtype Examples:** duplicate_charge, not_as_described, quality_issue, return_request

**Condition Set A: Standard Autonomous Refund**
- Payment: ✅ confirmed
- Order: ✅ fulfilled
- Amount: ✅ ≤฿500
- Window: ✅ within 7 days
- Prior refund: ✅ none
- Exception flags: ✅ none

**→ AUTONOMOUS: Create Refund Request**
- Route: WF3 → autonomous → WF5 refund path
- Record: `sim_refund_records` table
- Status flow: `pending_triage → approved_executing → resolved`

---

**Condition Set B: High-Value Refund**
- Same as Set A, BUT:
- Amount: ❌ >฿500

**→ AWAITING APPROVAL: Create Refund Request (After Human Review)**
- Route: WF3 → awaiting_approval → approver reviews → WF5 refund path
- Status flow: `pending_triage → awaiting_approval → approved_executing → resolved`

---

**Condition Set C: Outside Return Window**
- Same as Set A, BUT:
- Window: ❌ >7 days since delivery

**→ ESCALATION: Policy Violation**
- Route: WF3 → escalation
- Reason: "8 days since order (>7 day window)"
- Status: `escalated_human_required`
- Human decides: exception approval or denial

---

**Condition Set D: Prior Refund Exists**
- Same as Set A, BUT:
- Prior refund: ❌ exists

**→ ESCALATION: Duplicate Detection (POL-027)**
- Route: WF3 → escalation
- Reason: "Duplicate refund attempt detected - ฿XXX already refunded"
- Status: `escalated_human_required`
- Human investigates: fraud vs legitimate partial claim

---

**Condition Set E: Payment Not Confirmed**
- Same as Set A, BUT:
- Payment: ❌ not confirmed or failed

**→ ESCALATION: Payment Gateway Issue (POL-007)**
- Route: WF3 → escalation
- Reason: "Payment not confirmed"
- Status: `escalated_human_required`

---

### Scenario 2: Refund Dispute → Customer Wants Replacement
**Subtype Examples:** wrong_item, quality_issue, not_as_described

**Condition Set F: In-Stock Replacement**
- Payment: ✅ confirmed
- Order: ✅ fulfilled
- Amount: ✅ ≤฿500
- Window: ✅ within 7 days
- Prior refund: ✅ none
- Inventory: ✅ all items in stock
- Subtype: ✅ NOT damaged_goods

**→ AUTONOMOUS: Create Replacement Request**
- Route: WF3 → autonomous (replacement) → WF5 replacement path
- Record: `replacement_requests` table with `status: approved`
- New order: `REP-ORD-XXXXX` created
- Status flow: `pending_triage → approved_executing → resolved`

---

**Condition Set G: Out-of-Stock Replacement**
- Same as Set F, BUT:
- Inventory: ❌ out of stock

**→ ESCALATION: Stock Unavailable (POL-028)**
- Route: WF3 → escalation
- Reason: "Replacement requested but out of stock: [item names]"
- Status: `escalated_human_required`
- Human offers: refund, store credit, or waitlist

---

**Condition Set H: Damaged Goods Replacement**
- Same as Set F, BUT:
- Subtype: ❌ damaged_goods

**→ ESCALATION: Always (POL-021)**
- Route: WF3 → escalation
- Reason: "Damaged goods must be escalated per policy"
- Status: `escalated_human_required`
- Human verifies: photo evidence, approves replacement within 48hrs

---

**Condition Set I: High-Value Replacement**
- Same as Set F, BUT:
- Amount: ❌ >฿500

**→ AWAITING APPROVAL: Create Replacement Request (After Human Review)**
- Route: WF3 → awaiting_approval → approver reviews → WF5 replacement path
- Status flow: `pending_triage → awaiting_approval → approved_executing → resolved`

---

### Scenario 3: Refund Dispute → Customer Wants Return
**Subtype Examples:** return_request, changed_mind

**Condition Set J: Standard Return**
- Payment: ✅ confirmed
- Order: ✅ fulfilled
- Amount: ✅ ≤฿500
- Window: ✅ within 7 days
- Prior refund: ✅ none
- Item condition: ✅ returnable (not in POL-023 exclusions)

**→ AWAITING APPROVAL: Create Return Request (Manual Returns)**
- Route: WF3 → awaiting_approval → WF5 return path
- Record: `return_requests` table with `request_type: return`
- Status flow: `pending_triage → awaiting_approval → approved_executing → resolved`
- **Why not autonomous:** Returns require physical item inspection (POL-011)

---

**Condition Set K: Non-Returnable Item**
- Same as Set J, BUT:
- Item: ❌ in non-returnable list (POL-023)

**→ ESCALATION: Policy Violation**
- Route: WF3 → escalation
- Reason: "Item category not eligible for return: [category]"
- Status: `escalated_human_required`
- Examples: perishables, opened hygiene products, digital goods

---

---

## DISPUTE TYPE: DELIVERY

### Scenario 4: Delivery Dispute → Auto-Resolve to Refund
**Subtype Examples:** delayed, exception, non_receipt

**Condition Set L: Carrier Exception (Autonomous Refund)**
- Payment: ✅ confirmed
- Order: ✅ fulfilled
- Amount: ✅ ≤฿500
- Window: ✅ within complaint window
- Tracking: ✅ shows exception/delayed event
- Tracking: ✅ NOT delivered

**→ AUTONOMOUS: Create Refund Request**
- Route: WF3 → autonomous → WF5 refund path
- Reason: "Carrier exception detected - autonomous refund approved"
- Evidence: Tracking event from `sim_tracking_events`
- Status flow: `pending_triage → approved_executing → resolved`

---

**Condition Set M: In Transit Too Long (Autonomous Refund)**
- Same as Set L, BUT:
- Tracking: ✅ in_transit for >7 days
- Tracking: ✅ NOT delivered

**→ AUTONOMOUS: Create Refund Request**
- Route: WF3 → autonomous → WF5 refund path
- Reason: "Package in transit for X days - autonomous refund approved"

---

**Condition Set N: Delivered But Customer Disputes**
- Payment: ✅ confirmed
- Tracking: ❌ shows DELIVERED
- Customer claim: "never received"

**→ ESCALATION: Investigation Required (POL-027)**
- Route: WF3 → escalation
- Reason: "Delivery marked complete but customer reports non-receipt - investigation required"
- Evidence: Delivered event + customer dispute
- Status: `escalated_human_required`
- Human requests: POD, photos, neighbor confirmation

---

**Condition Set O: Lost Parcel**
- Tracking status: ❌ lost

**→ ESCALATION: Always (POL-004)**
- Route: WF3 → escalation
- Reason: "Lost parcel - always escalated per policy"
- Status: `escalated_human_required`
- Human initiates: carrier investigation within 1 business day

---

**Condition Set P: SLA Breach (Standard Delivery)**
- Delivery date: ❌ >3 days past estimated delivery
- Order: ✅ fulfilled
- Payment: ✅ confirmed

**→ AUTONOMOUS: Shipping Fee Refund Only**
- Route: WF3 → autonomous → WF5 refund path
- Amount: Shipping fee only (not full order)
- Status flow: `pending_triage → approved_executing → resolved`
- Based on: POL-005 (Standard Delivery SLA)

---

**Condition Set Q: Express SLA Breach**
- Delivery date: ❌ >1 day past guaranteed date
- Service: ✅ express delivery
- Order: ✅ fulfilled

**→ AUTONOMOUS: Shipping Fee Refund Only**
- Route: WF3 → autonomous → WF5 refund path
- Based on: POL-002 (Express Delivery SLA)

---

### Scenario 5: Delivery Dispute → Customer Wants Replacement
**Subtype Examples:** non_receipt, lost

**Condition Set R: Lost/Non-Receipt Replacement**
- Tracking: ❌ lost OR exception >7 days
- Inventory: ✅ in stock
- Amount: ✅ ≤฿500

**→ AWAITING APPROVAL: Create Replacement Request**
- Route: WF3 → awaiting_approval → WF5 replacement path
- **Why not autonomous:** Delivery failures require verification (POL-004)
- Human verifies: no carrier fraud, approves replacement

---

**Condition Set S: Delivered But Disputed → Replacement**
- Tracking: ❌ shows delivered
- Customer: wants replacement

**→ ESCALATION: Investigation Required (POL-027)**
- Same as Set N
- Cannot approve replacement until delivery dispute resolved

---

---

## SPECIAL CASES (Cross-Cutting)

### Partial Order Issues (Multi-Item Orders)

**Scenario 6A: Partial Fulfillment (Missing Items)**
- Customer: received 2 of 3 items
- Resolution: partial refund for missing item

**→ ESCALATION: Always (POL-008 + POL-029)**
- Route: WF3 → escalation
- Reason: "Partial refunds require human agent review"
- Human calculates: pro-rated refund for missing items only

---

**Scenario 6B: Partial Damage (Some Items Damaged)**
- Customer: 1 of 3 items damaged
- Resolution: partial replacement for damaged item

**→ ESCALATION: Always (POL-021)**
- Route: WF3 → escalation
- Reason: "Damaged goods must be escalated"
- Human approves: replacement for damaged item only

---

---

## SUMMARY TABLE

| # | Dispute Type | Resolution Pref | Key Condition | Route | Creates |
|---|--------------|-----------------|---------------|-------|---------|
| A | refund | refund | standard ≤฿500 | **AUTONOMOUS** | refund_request |
| B | refund | refund | >฿500 | **APPROVAL** | refund_request |
| C | refund | refund | >7 days | **ESCALATION** | — |
| D | refund | refund | prior refund | **ESCALATION** | — |
| E | refund | refund | payment not confirmed | **ESCALATION** | — |
| F | refund | replacement | in stock, ≤฿500, not damaged | **AUTONOMOUS** | replacement_request |
| G | refund | replacement | out of stock | **ESCALATION** | — |
| H | refund | replacement | damaged goods | **ESCALATION** | — |
| I | refund | replacement | >฿500 | **APPROVAL** | replacement_request |
| J | refund | return | standard return | **APPROVAL** | return_request |
| K | refund | return | non-returnable item | **ESCALATION** | — |
| L | delivery | (auto-refund) | carrier exception | **AUTONOMOUS** | refund_request |
| M | delivery | (auto-refund) | in transit >7 days | **AUTONOMOUS** | refund_request |
| N | delivery | (any) | delivered but disputed | **ESCALATION** | — |
| O | delivery | (any) | lost parcel | **ESCALATION** | — |
| P | delivery | (auto-refund) | standard SLA breach | **AUTONOMOUS** | refund_request (shipping fee) |
| Q | delivery | (auto-refund) | express SLA breach | **AUTONOMOUS** | refund_request (shipping fee) |
| R | delivery | replacement | lost/exception + in stock | **APPROVAL** | replacement_request |
| S | delivery | replacement | delivered but disputed | **ESCALATION** | — |
| 6A | (any) | (any) | partial fulfillment | **ESCALATION** | — |
| 6B | (any) | (any) | partial damage | **ESCALATION** | — |

---

## DECISION TREE (Simplified)

```
START: New Dispute
  │
  ├─ Is there a prior refund? ──YES──> ESCALATE (duplicate)
  │                            NO
  │                             ↓
  ├─ Is payment confirmed? ────NO───> ESCALATE (payment issue)
  │                           YES
  │                            ↓
  ├─ Is tracking = "delivered" AND customer disputes? ──YES──> ESCALATE (investigation)
  │                                                     NO
  │                                                      ↓
  ├─ Is tracking = "lost"? ────YES──> ESCALATE (carrier investigation)
  │                            NO
  │                             ↓
  ├─ Is subtype = "damaged_goods"? ──YES──> ESCALATE (photo verification)
  │                                  NO
  │                                   ↓
  ├─ Is this a partial issue (multi-item)? ──YES──> ESCALATE (item-level review)
  │                                          NO
  │                                           ↓
  ├─ Resolution preference = "replacement"? ──YES──> Check inventory
  │   │                                               │
  │   │                                      In stock? ──NO──> ESCALATE
  │   │                                               YES
  │   │                                                ↓
  │   │                                       Amount ≤฿500? ──NO──> APPROVAL
  │   │                                                      YES
  │   │                                                       ↓
  │   └──────────────────────────────────────> AUTONOMOUS (replacement)
  │
  ├─ Resolution preference = "return"? ──YES──> APPROVAL (physical inspection required)
  │
  ├─ Resolution preference = "refund"? ──YES──> Check amount
  │   │                                          │
  │   │                                 Amount ≤฿500? ──NO──> APPROVAL
  │   │                                                 YES
  │   │                                                  ↓
  │   │                                  Within 7 days? ──NO──> ESCALATE
  │   │                                                  YES
  │   │                                                   ↓
  │   └────────────────────────────────> AUTONOMOUS (refund)
  │
  └─ Delivery dispute with exception/delay? ──YES──> AUTONOMOUS (refund)
                                              NO
                                               ↓
                                         ESCALATE (unclear)
```

---

## IMPLEMENTATION CHECKLIST

For each scenario, WF3 must check in this order:

1. ✅ **Duplicate detection** (payment records)
2. ✅ **Payment confirmation** (payment records)
3. ✅ **Tracking conflicts** (tracking events vs. dispute type)
4. ✅ **Policy hard-stops** (damaged goods, lost parcel, partial issues)
5. ✅ **Resolution preference routing** (refund/replacement/return)
6. ✅ **Inventory availability** (for replacements only)
7. ✅ **Amount threshold** (฿500 for autonomous)
8. ✅ **Return window** (7 days)

---

END OF DECISION MATRIX
