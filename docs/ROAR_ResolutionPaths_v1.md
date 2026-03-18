## 1. Document Overview
This document is the definitive reference for every possible scenario ROAR Engine can encounter, and the exact resolution path each scenario follows. It defines the complete mapping of case conditions to outcomes --- from fully autonomous resolution to human escalation --- covering all dispute types, data states, edge cases, and failure modes.

This document is the implementation contract for the Triage Agent (WF3). Every scenario defined here must be reflected exactly in the triage rules injected into the Triage Agent's prompt and the n8n Switch node routing logic.

  **Field**             **Value**
  Document Type         Resolution Paths Document

  Version               1.0

  Dispute Scope         Refund disputes and delivery disputes

  Paths Covered         Autonomous Resolution, Human Escalation, Pre-Triage Rejection, System Failure

  Total Scenarios       30 scenarios across 6 categories

  Implemented By        WF3 Triage Agent (n8n), FastAPI case router, Frontend intake validation

### 1.1 Resolution Path Legend
  **Path**           **Color Code**   **Meaning**                                                                           **Who Handles It**
  AUTONOMOUS         Green            All triage rules pass. AI generates resolution plan. Approver reviews and executes.   AI (with agent approval gate)

  ESCALATION         Amber            One or more triage rules fail. Human agent takes over the live chat.                  Human escalation agent

  POST-REJECTION     Red              Approver rejects autonomous resolution plan. Approver joins live chat.                Approver (human)

  PRE-TRIAGE BLOCK   Purple           Dispute blocked before triage. Invalid, duplicate, or out-of-scope.                   System (automated rejection)

  SYSTEM FAILURE     Blue             AI pipeline failure. Safe fallback to escalation.                                     Human escalation agent (fallback)

| Reading this document: each scenario block shows the ID, title, resolution path, conditions required, outcome, resolution action, and policies applied. |
|                                                                                                                                                         |
| Conditions marked ✓ are ALL required to be true for that scenario to apply.                                                                             |
|                                                                                                                                                         |
| Scenarios are evaluated in order within each category --- the first matching scenario wins.                                                             |
|                                                                                                                                                         |
| If no scenario matches (unexpected state): default to ESCALATION path as a safe fallback.                                                               |

## 2. Refund Dispute Scenarios
All scenarios triggered when dispute_type = 'refund'. Evaluated after the information bundle is assembled from OMS and Payment Gateway data sources.

### 2.1 Autonomous Resolution Scenarios --- Refund
| **RREF-001 Standard Refund --- All Rules Pass**                                                                                        |
|                                                                                                                                        |
| **Resolution Path: AUTONOMOUS**                                                                                                        |
| **Conditions (all must be true):**                                                                                                     |
|                                                                                                                                        |
| ✓ sim_transactions.status = 'confirmed'                                                                                              |
|                                                                                                                                        |
| ✓ sim_orders.status IN ('fulfilled', 'returned')                                                                                   |
|                                                                                                                                        |
| ✓ sim_transactions.amount \<= ฿500                                                                                                     |
|                                                                                                                                        |
| ✓ sim_refund_records is empty for this order_id                                                                                        |
|                                                                                                                                        |
| ✓ sim_orders.created_at \>= (today - 7 days)                                                                                           |
|                                                                                                                                        |
| **Outcome:**                                                                                                                           |
|                                                                                                                                        |
| Case routed to autonomous resolution. Resolution plan generated for approver review.                                                   |
|                                                                                                                                        |
| **Resolution Action:**                                                                                                                 |
|                                                                                                                                        |
| Create refund_request record (amount = transaction amount, status = pending). Post resolution message to customer. Mark case resolved. |
|                                                                                                                                        |
| **Policies Applied:**                                                                                                                  |
|                                                                                                                                        |
| POL-001 (return eligibility), POL-006 (refund timeline), POL-011 (7-day window)                                                        |

| **RREF-002 Refund --- Order Returned, Not Yet Processed**                                                        |
|                                                                                                                  |
| **Resolution Path: AUTONOMOUS**                                                                                  |
| **Conditions (all must be true):**                                                                               |
|                                                                                                                  |
| ✓ sim_transactions.status = 'confirmed'                                                                        |
|                                                                                                                  |
| ✓ sim_orders.status = 'returned'                                                                               |
|                                                                                                                  |
| ✓ sim_transactions.amount \<= ฿500                                                                               |
|                                                                                                                  |
| ✓ sim_refund_records is empty                                                                                    |
|                                                                                                                  |
| ✓ Within 7-day window                                                                                            |
|                                                                                                                  |
| **Outcome:**                                                                                                     |
|                                                                                                                  |
| Return was received by the merchant. Refund has not yet been issued. Eligible for autonomous refund processing.  |
|                                                                                                                  |
| **Resolution Action:**                                                                                           |
|                                                                                                                  |
| Create refund_request record. Inform customer refund is being processed. Mark case resolved.                     |
|                                                                                                                  |
| **Policies Applied:**                                                                                            |
|                                                                                                                  |
| POL-001, POL-006, POL-011, POL-014 (return process steps)                                                        |
|                                                                                                                  |
| **Note:**                                                                                                        |
|                                                                                                                  |
| *This scenario covers cases where the customer returns an item and follows up when the refund hasn't appeared.* |

### 2.2 Escalation Scenarios --- Refund
| **EREF-001 High-Value Refund --- Above ฿500 Threshold**                                                                        |
|                                                                                                                                |
| **Resolution Path: ESCALATION**                                                                                                |
| **Conditions (all must be true):**                                                                                             |
|                                                                                                                                |
| ✓ sim_transactions.amount \> ฿500                                                                                              |
|                                                                                                                                |
| **Outcome:**                                                                                                                   |
|                                                                                                                                |
| Refund amount exceeds autonomous resolution ceiling. Human review required to prevent fraudulent high-value refund automation. |
|                                                                                                                                |
| **Resolution Action:**                                                                                                         |
|                                                                                                                                |
| Escalation Agent reviews case with AI-generated summary. Contacts customer via live chat. Manually approves or denies refund.  |
|                                                                                                                                |
| **Policies Applied:**                                                                                                          |
|                                                                                                                                |
| POL-001, POL-006, POL-007 (refund method), POL-022 (resolution SLA)                                                            |
|                                                                                                                                |
| **Note:**                                                                                                                      |
|                                                                                                                                |
| *Trigger: BR-REF-003 fails. ESC-001 active.*                                                                                   |

| **EREF-002 Duplicate Refund Detected**                                                                      |
|                                                                                                             |
| **Resolution Path: ESCALATION**                                                                             |
| **Conditions (all must be true):**                                                                          |
|                                                                                                             |
| ✓ sim_refund_records WHERE order_id = X is non-empty (prior refund exists)                                  |
|                                                                                                             |
| **Outcome:**                                                                                                |
|                                                                                                             |
| A refund has already been issued or is pending for this order. Potential duplicate refund attempt.          |
|                                                                                                             |
| **Resolution Action:**                                                                                      |
|                                                                                                             |
| Escalation Agent reviews both the existing refund record and the new dispute. Contacts customer to clarify. |
|                                                                                                             |
| **Policies Applied:**                                                                                       |
|                                                                                                             |
| POL-006, POL-007, POL-009 (chargeback policy)                                                               |
|                                                                                                             |
| **Note:**                                                                                                   |
|                                                                                                             |
| *Trigger: BR-REF-004 fails. ESC-005 active.*                                                                |

| **EREF-003 Outside Return Window --- 7-Day Breach**                                                                                         |
|                                                                                                                                             |
| **Resolution Path: ESCALATION**                                                                                                             |
| **Conditions (all must be true):**                                                                                                          |
|                                                                                                                                             |
| ✓ sim_orders.created_at \< (today - 7 days)                                                                                                 |
|                                                                                                                                             |
| **Outcome:**                                                                                                                                |
|                                                                                                                                             |
| Customer filed dispute after the 7-day return window. Standard automated processing not available.                                          |
|                                                                                                                                             |
| **Resolution Action:**                                                                                                                      |
|                                                                                                                                             |
| Escalation Agent reviews case context. May exercise discretion based on circumstances (e.g. delayed delivery, damaged goods reported late). |
|                                                                                                                                             |
| **Policies Applied:**                                                                                                                       |
|                                                                                                                                             |
| POL-001, POL-011 (7-day window), POL-012 (item condition)                                                                                   |
|                                                                                                                                             |
| **Note:**                                                                                                                                   |
|                                                                                                                                             |
| *Trigger: BR-REF-005 fails. Agents have discretion to honor late returns for exceptional circumstances.*                                    |

| **EREF-004 Payment Not Confirmed**                                                                                             |
|                                                                                                                                |
| **Resolution Path: ESCALATION**                                                                                                |
| **Conditions (all must be true):**                                                                                             |
|                                                                                                                                |
| ✓ sim_transactions.status != 'confirmed' (e.g. pending, failed, refunded)                                                    |
|                                                                                                                                |
| **Outcome:**                                                                                                                   |
|                                                                                                                                |
| Payment is in an unconfirmed state. Refund cannot be safely processed without payment confirmation.                            |
|                                                                                                                                |
| **Resolution Action:**                                                                                                         |
|                                                                                                                                |
| Escalation Agent investigates payment status with payment team. Contacts customer with update.                                 |
|                                                                                                                                |
| **Policies Applied:**                                                                                                          |
|                                                                                                                                |
| POL-010 (failed transaction), POL-006                                                                                          |
|                                                                                                                                |
| **Note:**                                                                                                                      |
|                                                                                                                                |
| *Trigger: BR-REF-001 fails. ESC-007 active. If status = 'refunded', this may be a duplicate dispute --- agent should check.* |

| **EREF-005 Order Status Ineligible --- Pending or Cancelled**                                                                                                                |
|                                                                                                                                                                              |
| **Resolution Path: ESCALATION**                                                                                                                                              |
| **Conditions (all must be true):**                                                                                                                                           |
|                                                                                                                                                                              |
| ✓ sim_orders.status IN ('pending', 'cancelled')                                                                                                                          |
|                                                                                                                                                                              |
| **Outcome:**                                                                                                                                                                 |
|                                                                                                                                                                              |
| Order has not been fulfilled or returned. A refund dispute for a pending order may indicate a cancellation request instead.                                                  |
|                                                                                                                                                                              |
| **Resolution Action:**                                                                                                                                                       |
|                                                                                                                                                                              |
| Escalation Agent reviews order status. If customer wants to cancel a pending order, follows cancellation policy. If order is cancelled, no refund applicable for most cases. |
|                                                                                                                                                                              |
| **Policies Applied:**                                                                                                                                                        |
|                                                                                                                                                                              |
| POL-003 (cancellation), POL-010 (failed transaction resolution)                                                                                                              |
|                                                                                                                                                                              |
| **Note:**                                                                                                                                                                    |
|                                                                                                                                                                              |
| *Trigger: BR-REF-002 fails. ESC-008 active. Agent should clarify intent with customer.*                                                                                      |

| **EREF-006 Partial Refund Request**                                                                             |
|                                                                                                                 |
| **Resolution Path: ESCALATION**                                                                                 |
| **Conditions (all must be true):**                                                                              |
|                                                                                                                 |
| ✓ Customer message explicitly references receiving partial order or wanting partial refund                      |
|                                                                                                                 |
| ✓ OR sim_order_items shows multiple items but dispute references only some                                      |
|                                                                                                                 |
| **Outcome:**                                                                                                    |
|                                                                                                                 |
| Partial refund situations require human review to determine the correct refund amount.                          |
|                                                                                                                 |
| **Resolution Action:**                                                                                          |
|                                                                                                                 |
| Escalation Agent reviews which items are affected, calculates partial refund amount, and processes accordingly. |
|                                                                                                                 |
| **Policies Applied:**                                                                                           |
|                                                                                                                 |
| POL-008 (partial refund), POL-001, POL-006                                                                      |
|                                                                                                                 |
| **Note:**                                                                                                       |
|                                                                                                                 |
| *Partial refunds are never autonomous per BR-DAT-002 (partial scenarios introduce amount ambiguity).*           |

| **EREF-007 Damaged Goods --- Refund Request**                                                                            |
|                                                                                                                          |
| **Resolution Path: ESCALATION**                                                                                          |
| **Conditions (all must be true):**                                                                                       |
|                                                                                                                          |
| ✓ Customer message describes damage, defect, or wrong item received                                                      |
|                                                                                                                          |
| ✓ Dispute submitted within 48 hours of delivery                                                                          |
|                                                                                                                          |
| **Outcome:**                                                                                                             |
|                                                                                                                          |
| Damaged goods cases require evidence review. Always escalated regardless of transaction amount.                          |
|                                                                                                                          |
| **Resolution Action:**                                                                                                   |
|                                                                                                                          |
| Escalation Agent reviews damage description and evidence. Authorizes full refund or replacement per POL-004.             |
|                                                                                                                          |
| **Policies Applied:**                                                                                                    |
|                                                                                                                          |
| POL-004 (damaged goods), POL-015 (refund vs replacement)                                                                 |
|                                                                                                                          |
| **Note:**                                                                                                                |
|                                                                                                                          |
| *Even if transaction amount is below ฿500, damaged goods cases must be escalated. They cannot be autonomously resolved.* |

| **EREF-008 Non-Returnable Item --- Refund Request**                                                                                             |
|                                                                                                                                                 |
| **Resolution Path: ESCALATION**                                                                                                                 |
| **Conditions (all must be true):**                                                                                                              |
|                                                                                                                                                 |
| ✓ Item category matches non-returnable list (perishables, personal hygiene opened, digital goods redeemed, etc.)                                |
|                                                                                                                                                 |
| **Outcome:**                                                                                                                                    |
|                                                                                                                                                 |
| Non-returnable item refund requests must be reviewed by a human agent. Automated refunds are not permitted.                                     |
|                                                                                                                                                 |
| **Resolution Action:**                                                                                                                          |
|                                                                                                                                                 |
| Escalation Agent reviews the specific circumstances. Applies POL-002 and communicates to customer.                                              |
|                                                                                                                                                 |
| **Policies Applied:**                                                                                                                           |
|                                                                                                                                                 |
| POL-002 (non-returnable categories), POL-001                                                                                                    |
|                                                                                                                                                 |
| **Note:**                                                                                                                                       |
|                                                                                                                                                 |
| *Items in the non-returnable list escalate regardless of all other rule outcomes. This overrides autonomous path even if all other rules pass.* |

| **EREF-009 COD Order --- Refund to Cash Not Possible**                                                                                        |
|                                                                                                                                               |
| **Resolution Path: ESCALATION**                                                                                                               |
| **Conditions (all must be true):**                                                                                                            |
|                                                                                                                                               |
| ✓ sim_transactions.payment_method = 'cod'                                                                                                   |
|                                                                                                                                               |
| ✓ Customer requesting cash refund                                                                                                             |
|                                                                                                                                               |
| **Outcome:**                                                                                                                                  |
|                                                                                                                                               |
| Cash on Delivery orders cannot receive cash refunds --- only store credit. Requires human agent to communicate policy and offer store credit. |
|                                                                                                                                               |
| **Resolution Action:**                                                                                                                        |
|                                                                                                                                               |
| Escalation Agent explains COD refund policy. Offers store credit as the only available refund option.                                         |
|                                                                                                                                               |
| **Policies Applied:**                                                                                                                         |
|                                                                                                                                               |
| POL-006 (COD store credit), POL-007 (refund method)                                                                                           |

## 3. Delivery Dispute Scenarios
All scenarios triggered when dispute_type = 'delivery'. Evaluated after the information bundle is assembled from OMS, Logistics, and Inventory data sources.

### 3.1 Autonomous Resolution Scenarios --- Delivery
| **RDEL-001 Standard Delayed Delivery --- All Rules Pass**                                                                                                      |
|                                                                                                                                                                |
| **Resolution Path: AUTONOMOUS**                                                                                                                                |
| **Conditions (all must be true):**                                                                                                                             |
|                                                                                                                                                                |
| ✓ sim_shipments.status = 'delayed'                                                                                                                           |
|                                                                                                                                                                |
| ✓ sim_shipments.shipped_at IS NOT NULL                                                                                                                         |
|                                                                                                                                                                |
| ✓ No prior open case for same order_id                                                                                                                         |
|                                                                                                                                                                |
| ✓ Current date \> sim_shipments.estimated_delivery + 3 days                                                                                                    |
|                                                                                                                                                                |
| **Outcome:**                                                                                                                                                   |
|                                                                                                                                                                |
| Shipment is confirmed delayed beyond SLA breach threshold. All autonomous conditions met.                                                                      |
|                                                                                                                                                                |
| **Resolution Action:**                                                                                                                                         |
|                                                                                                                                                                |
| Generate redelivery resolution plan. Inform customer of expected new delivery window. Create return_request only if replacement is needed. Mark case resolved. |
|                                                                                                                                                                |
| **Policies Applied:**                                                                                                                                          |
|                                                                                                                                                                |
| POL-016 (standard delivery SLA), POL-020 (carrier responsibility), POL-023 (delivery SLA)                                                                      |

| **RDEL-002 Express Delivery SLA Breach**                                                                           |
|                                                                                                                    |
| **Resolution Path: AUTONOMOUS**                                                                                    |
| **Conditions (all must be true):**                                                                                 |
|                                                                                                                    |
| ✓ sim_shipments.status = 'delayed'                                                                               |
|                                                                                                                    |
| ✓ sim_shipments.shipped_at IS NOT NULL                                                                             |
|                                                                                                                    |
| ✓ Order tagged as express delivery                                                                                 |
|                                                                                                                    |
| ✓ Current date \> sim_shipments.estimated_delivery + 1 day (express breach = 1 day)                                |
|                                                                                                                    |
| ✓ No prior open case                                                                                               |
|                                                                                                                    |
| **Outcome:**                                                                                                       |
|                                                                                                                    |
| Express delivery SLA breached. Eligible for autonomous resolution including shipping fee refund.                   |
|                                                                                                                    |
| **Resolution Action:**                                                                                             |
|                                                                                                                    |
| Generate redelivery plan plus shipping fee refund. Inform customer. Mark case resolved.                            |
|                                                                                                                    |
| **Policies Applied:**                                                                                              |
|                                                                                                                    |
| POL-017 (express delivery SLA), POL-016, POL-020                                                                   |
|                                                                                                                    |
| **Note:**                                                                                                          |
|                                                                                                                    |
| *Express orders have a reduced breach threshold (1 day vs 3 days). Resolution includes shipping fee compensation.* |

### 3.2 Escalation Scenarios --- Delivery
| **EDEL-001 Lost Parcel**                                                                                                                                                 |
|                                                                                                                                                                          |
| **Resolution Path: ESCALATION**                                                                                                                                          |
| **Conditions (all must be true):**                                                                                                                                       |
|                                                                                                                                                                          |
| ✓ sim_shipments.status = 'lost'                                                                                                                                        |
|                                                                                                                                                                          |
| **Outcome:**                                                                                                                                                             |
|                                                                                                                                                                          |
| Parcel is confirmed lost by the carrier. Always escalated --- carrier investigation required before resolution.                                                          |
|                                                                                                                                                                          |
| **Resolution Action:**                                                                                                                                                   |
|                                                                                                                                                                          |
| Escalation Agent initiates carrier investigation. Informs customer of timeline. Resolves with refund or replacement once investigation concludes or at agent discretion. |
|                                                                                                                                                                          |
| **Policies Applied:**                                                                                                                                                    |
|                                                                                                                                                                          |
| POL-019 (lost parcel), POL-020 (carrier responsibility), POL-023                                                                                                         |
|                                                                                                                                                                          |
| **Note:**                                                                                                                                                                |
|                                                                                                                                                                          |
| *Trigger: BR-DEL-001 fails (status = lost, not delayed). ESC-002 active. Agent may resolve in customer's favor immediately without waiting for carrier confirmation.*   |

| **EDEL-002 Failed Delivery --- Carrier Fault**                                                                                                                 |
|                                                                                                                                                                |
| **Resolution Path: ESCALATION**                                                                                                                                |
| **Conditions (all must be true):**                                                                                                                             |
|                                                                                                                                                                |
| ✓ sim_shipments.status = 'failed'                                                                                                                            |
|                                                                                                                                                                |
| ✓ Failure reason indicates carrier issue (not customer unavailability)                                                                                         |
|                                                                                                                                                                |
| **Outcome:**                                                                                                                                                   |
|                                                                                                                                                                |
| Delivery failed due to carrier error. Requires human review to determine cause and resolution.                                                                 |
|                                                                                                                                                                |
| **Resolution Action:**                                                                                                                                         |
|                                                                                                                                                                |
| Escalation Agent investigates failure reason. If carrier fault confirmed: arrange redelivery or refund. If customer fault: communicate failed delivery policy. |
|                                                                                                                                                                |
| **Policies Applied:**                                                                                                                                          |
|                                                                                                                                                                |
| POL-018 (failed delivery attempt), POL-020 (carrier responsibility)                                                                                            |
|                                                                                                                                                                |
| **Note:**                                                                                                                                                      |
|                                                                                                                                                                |
| *Trigger: BR-DEL-001 fails (status = failed). Distinguish carrier fault from customer unavailability --- impacts resolution.*                                  |

| **EDEL-003 Item Not Yet Shipped**                                                                                                                               |
|                                                                                                                                                                 |
| **Resolution Path: ESCALATION**                                                                                                                                 |
| **Conditions (all must be true):**                                                                                                                              |
|                                                                                                                                                                 |
| ✓ sim_shipments.shipped_at IS NULL                                                                                                                              |
|                                                                                                                                                                 |
| ✓ sim_orders.status = 'fulfilled' (order accepted but not dispatched)                                                                                         |
|                                                                                                                                                                 |
| **Outcome:**                                                                                                                                                    |
|                                                                                                                                                                 |
| Order was accepted but item has not been dispatched. This is a fulfillment delay, not a delivery dispute.                                                       |
|                                                                                                                                                                 |
| **Resolution Action:**                                                                                                                                          |
|                                                                                                                                                                 |
| Escalation Agent contacts fulfillment team to expedite dispatch. Updates customer on expected ship date.                                                        |
|                                                                                                                                                                 |
| **Policies Applied:**                                                                                                                                           |
|                                                                                                                                                                 |
| POL-016 (delivery SLA), POL-003 (cancellation --- customer may want to cancel)                                                                                  |
|                                                                                                                                                                 |
| **Note:**                                                                                                                                                       |
|                                                                                                                                                                 |
| *Trigger: BR-DEL-002 fails. ESC-009 active. If dispatch delay exceeds 2 business days from order date, escalation agent may authorize cancellation and refund.* |

| **EDEL-004 Duplicate Delivery Complaint**                                                                                |
|                                                                                                                          |
| **Resolution Path: ESCALATION**                                                                                          |
| **Conditions (all must be true):**                                                                                       |
|                                                                                                                          |
| ✓ An open case already exists for the same order_id (status != closed)                                                   |
|                                                                                                                          |
| **Outcome:**                                                                                                             |
|                                                                                                                          |
| Customer has already filed a delivery dispute for this order. Duplicate complaint requires human review.                 |
|                                                                                                                          |
| **Resolution Action:**                                                                                                   |
|                                                                                                                          |
| Escalation Agent reviews the existing open case and the new submission. Merges context and continues with a single case. |
|                                                                                                                          |
| **Policies Applied:**                                                                                                    |
|                                                                                                                          |
| POL-022, POL-023                                                                                                         |
|                                                                                                                          |
| **Note:**                                                                                                                |
|                                                                                                                          |
| *Trigger: BR-DEL-003 fails. ESC-003 active. Agent should check if original case was resolved incorrectly.*               |

| **EDEL-005 Within SLA Window --- Dispute Filed Too Early**                                                                                                       |
|                                                                                                                                                                  |
| **Resolution Path: ESCALATION**                                                                                                                                  |
| **Conditions (all must be true):**                                                                                                                               |
|                                                                                                                                                                  |
| ✓ sim_shipments.estimated_delivery + 3 days \>= today (SLA not yet breached)                                                                                     |
|                                                                                                                                                                  |
| ✓ Shipment is in-transit or delayed                                                                                                                              |
|                                                                                                                                                                  |
| **Outcome:**                                                                                                                                                     |
|                                                                                                                                                                  |
| Customer filed a delivery dispute before the SLA breach threshold. Dispute is premature.                                                                         |
|                                                                                                                                                                  |
| **Resolution Action:**                                                                                                                                           |
|                                                                                                                                                                  |
| System posts message informing customer to wait until the breach date. If customer persists, escalation agent provides reassurance and expected delivery update. |
|                                                                                                                                                                  |
| **Policies Applied:**                                                                                                                                            |
|                                                                                                                                                                  |
| POL-016 (standard SLA), POL-021 (response time SLA)                                                                                                              |
|                                                                                                                                                                  |
| **Note:**                                                                                                                                                        |
|                                                                                                                                                                  |
| *Trigger: BR-DEL-004 fails. ESC-010 active. Not a hard escalation --- system message first. If customer re-files after breach date, process normally.*           |

| **EDEL-006 Damaged in Transit**                                                                                       |
|                                                                                                                       |
| **Resolution Path: ESCALATION**                                                                                       |
| **Conditions (all must be true):**                                                                                    |
|                                                                                                                       |
| ✓ sim_shipments.status = 'delivered'                                                                                |
|                                                                                                                       |
| ✓ Customer describes item arrived damaged during delivery                                                             |
|                                                                                                                       |
| ✓ Damage report submitted within 48 hours of delivery                                                                 |
|                                                                                                                       |
| **Outcome:**                                                                                                          |
|                                                                                                                       |
| Item was damaged during transit. Carrier responsibility. Always escalated for evidence review.                        |
|                                                                                                                       |
| **Resolution Action:**                                                                                                |
|                                                                                                                       |
| Escalation Agent reviews damage description. Initiates carrier damage claim. Offers full refund or replacement.       |
|                                                                                                                       |
| **Policies Applied:**                                                                                                 |
|                                                                                                                       |
| POL-004 (damaged goods), POL-020 (carrier responsibility), POL-015 (refund vs replacement)                            |
|                                                                                                                       |
| **Note:**                                                                                                             |
|                                                                                                                       |
| *Even though shipment status is delivered, the dispute is a delivery dispute because the damage occurred in transit.* |

| **EDEL-007 Wrong Item Delivered**                                                                                    |
|                                                                                                                      |
| **Resolution Path: ESCALATION**                                                                                      |
| **Conditions (all must be true):**                                                                                   |
|                                                                                                                      |
| ✓ sim_shipments.status = 'delivered'                                                                               |
|                                                                                                                      |
| ✓ Customer reports receiving a different item than ordered                                                           |
|                                                                                                                      |
| ✓ sim_order_items does not match customer's description of received item                                            |
|                                                                                                                      |
| **Outcome:**                                                                                                         |
|                                                                                                                      |
| Wrong item was delivered. Requires human verification and replacement dispatch.                                      |
|                                                                                                                      |
| **Resolution Action:**                                                                                               |
|                                                                                                                      |
| Escalation Agent verifies order vs. reported received item. Arranges correct item dispatch and return of wrong item. |
|                                                                                                                      |
| **Policies Applied:**                                                                                                |
|                                                                                                                      |
| POL-004 (damaged/wrong goods), POL-014 (return process), POL-015 (replacement)                                       |
|                                                                                                                      |
| **Note:**                                                                                                            |
|                                                                                                                      |
| *Wrong item disputes are always escalated regardless of order value.*                                                |

| **EDEL-008 Partial Delivery --- Some Items Missing**                                                                                   |
|                                                                                                                                        |
| **Resolution Path: ESCALATION**                                                                                                        |
| **Conditions (all must be true):**                                                                                                     |
|                                                                                                                                        |
| ✓ sim_shipments.status = 'delivered'                                                                                                 |
|                                                                                                                                        |
| ✓ Customer reports receiving only some items from a multi-item order                                                                   |
|                                                                                                                                        |
| ✓ sim_order_items shows multiple items                                                                                                 |
|                                                                                                                                        |
| **Outcome:**                                                                                                                           |
|                                                                                                                                        |
| Partial delivery. Requires human review to determine which items are missing and appropriate resolution.                               |
|                                                                                                                                        |
| **Resolution Action:**                                                                                                                 |
|                                                                                                                                        |
| Escalation Agent reviews order manifest vs. reported missing items. Arranges delivery of missing items or partial refund.              |
|                                                                                                                                        |
| **Policies Applied:**                                                                                                                  |
|                                                                                                                                        |
| POL-008 (partial refund), POL-016, POL-015                                                                                             |
|                                                                                                                                        |
| **Note:**                                                                                                                              |
|                                                                                                                                        |
| *Partial delivery disputes may result in either a replacement shipment for missing items or a partial refund --- determined by agent.* |

## 4. Pre-Triage Block Scenarios
Cases blocked before reaching the Triage Agent. These are handled by the Intake Agent (WF1), FastAPI validation, or frontend rules.

| **BLOCK-001 Insufficient Context --- Intake Fails**                                                                                                                                        |
|                                                                                                                                                                                            |
| **Resolution Path: PRE-TRIAGE BLOCK**                                                                                                                                                      |
| **Conditions (all must be true):**                                                                                                                                                         |
|                                                                                                                                                                                            |
| ✓ Intake Agent asked 3 follow-up questions                                                                                                                                                 |
|                                                                                                                                                                                            |
| ✓ Customer did not provide sufficient information to classify intent                                                                                                                       |
|                                                                                                                                                                                            |
| ✓ No usable order reference or dispute description                                                                                                                                         |
|                                                                                                                                                                                            |
| **Outcome:**                                                                                                                                                                               |
|                                                                                                                                                                                            |
| Case cannot proceed to triage without minimum viable context.                                                                                                                              |
|                                                                                                                                                                                            |
| **Resolution Action:**                                                                                                                                                                     |
|                                                                                                                                                                                            |
| Intake Agent posts message: 'We were unable to gather enough information to process your dispute. Please contact support directly with your order reference.' Case status set to closed. |
|                                                                                                                                                                                            |
| **Policies Applied:**                                                                                                                                                                      |
|                                                                                                                                                                                            |
| POL-013 (proof of purchase)                                                                                                                                                                |
|                                                                                                                                                                                            |
| **Note:**                                                                                                                                                                                  |
|                                                                                                                                                                                            |
| *This scenario should be rare. If the customer provides any order reference + any description of a problem, intake should classify as valid_dispute.*                                      |

| **BLOCK-002 Duplicate Case --- Same Order Already Open**                                                                                                               |
|                                                                                                                                                                        |
| **Resolution Path: PRE-TRIAGE BLOCK**                                                                                                                                  |
| **Conditions (all must be true):**                                                                                                                                     |
|                                                                                                                                                                        |
| ✓ Customer submits a new dispute                                                                                                                                       |
|                                                                                                                                                                        |
| ✓ An open case (status != closed) already exists for the same order_id                                                                                                 |
|                                                                                                                                                                        |
| ✓ Detected at intake form submission (FastAPI case creation check)                                                                                                     |
|                                                                                                                                                                        |
| **Outcome:**                                                                                                                                                           |
|                                                                                                                                                                        |
| Duplicate submission detected. Customer already has an active case for this order.                                                                                     |
|                                                                                                                                                                        |
| **Resolution Action:**                                                                                                                                                 |
|                                                                                                                                                                        |
| FastAPI returns HTTP 409. Frontend displays: 'You already have an open dispute for this order. Please check your case status.' Link to existing case status tracker. |
|                                                                                                                                                                        |
| **Policies Applied:**                                                                                                                                                  |
|                                                                                                                                                                        |
| No policy --- system rule                                                                                                                                              |
|                                                                                                                                                                        |
| **Note:**                                                                                                                                                              |
|                                                                                                                                                                        |
| *Duplicate detection at form submission prevents duplicate cases from being created. If the existing case is closed, a new case may be submitted.*                     |

| **BLOCK-003 Invalid Order ID --- Not Found in OMS**                                                                                                                                                                |
|                                                                                                                                                                                                                    |
| **Resolution Path: PRE-TRIAGE BLOCK**                                                                                                                                                                              |
| **Conditions (all must be true):**                                                                                                                                                                                 |
|                                                                                                                                                                                                                    |
| ✓ Customer provides an order_id                                                                                                                                                                                    |
|                                                                                                                                                                                                                    |
| ✓ WF2 Data Retrieval Agent queries sim_orders --- no record found                                                                                                                                                  |
|                                                                                                                                                                                                                    |
| ✓ OMS returns empty result for the provided order_id                                                                                                                                                               |
|                                                                                                                                                                                                                    |
| **Outcome:**                                                                                                                                                                                                       |
|                                                                                                                                                                                                                    |
| Order ID does not exist in the system. Cannot proceed to triage without a valid order record.                                                                                                                      |
|                                                                                                                                                                                                                    |
| **Resolution Action:**                                                                                                                                                                                             |
|                                                                                                                                                                                                                    |
| WF2 sets information_bundle.order = null. WF3 Triage Agent detects null order data, triggers ESC-006 (null data source). Case escalated with note: 'Order ID not found in OMS --- manual verification required.' |
|                                                                                                                                                                                                                    |
| **Policies Applied:**                                                                                                                                                                                              |
|                                                                                                                                                                                                                    |
| POL-013 (proof of purchase)                                                                                                                                                                                        |
|                                                                                                                                                                                                                    |
| **Note:**                                                                                                                                                                                                          |
|                                                                                                                                                                                                                    |
| *Do not block at intake --- attempt data retrieval first. Only trigger this path when OMS query returns empty. Customer may have a typo in order ID.*                                                              |

| **BLOCK-004 Dispute Submitted for Non-Returnable Item**                                                                                                  |
|                                                                                                                                                          |
| **Resolution Path: PRE-TRIAGE BLOCK**                                                                                                                    |
| **Conditions (all must be true):**                                                                                                                       |
|                                                                                                                                                          |
| ✓ Item category in sim_order_items matches non-returnable category list                                                                                  |
|                                                                                                                                                          |
| ✓ Detected during triage (not pre-triage --- item category is checked in triage)                                                                         |
|                                                                                                                                                          |
| **Outcome:**                                                                                                                                             |
|                                                                                                                                                          |
| Non-returnable item dispute. Escalated to human agent regardless of all other rule outcomes.                                                             |
|                                                                                                                                                          |
| **Resolution Action:**                                                                                                                                   |
|                                                                                                                                                          |
| WF3 Triage Agent detects non-returnable item category. Sets routing_decision = escalation with justification referencing POL-002.                        |
|                                                                                                                                                          |
| **Policies Applied:**                                                                                                                                    |
|                                                                                                                                                          |
| POL-002 (non-returnable categories)                                                                                                                      |
|                                                                                                                                                          |
| **Note:**                                                                                                                                                |
|                                                                                                                                                          |
| *Technically this triggers during triage (not pre-triage), but the outcome is always escalation --- no autonomous path exists for non-returnable items.* |

## 5. Post-Approval Resolution Paths
Scenarios that occur after a resolution plan has been generated and presented to an approver. These paths are determined by the approver's action.

| **APR-001 Resolution Plan Approved --- Autonomous Execution**                                                                                                                  |
|                                                                                                                                                                                |
| **Resolution Path: AUTONOMOUS**                                                                                                                                                |
| **Conditions (all must be true):**                                                                                                                                             |
|                                                                                                                                                                                |
| ✓ Case status = awaiting_approval                                                                                                                                              |
|                                                                                                                                                                                |
| ✓ Approver clicks Approve                                                                                                                                                      |
|                                                                                                                                                                                |
| ✓ Approver role confirmed via JWT                                                                                                                                              |
|                                                                                                                                                                                |
| **Outcome:**                                                                                                                                                                   |
|                                                                                                                                                                                |
| Resolution plan approved. AI Resolution Agent executes the plan immediately.                                                                                                   |
|                                                                                                                                                                                |
| **Resolution Action:**                                                                                                                                                         |
|                                                                                                                                                                                |
| WF5 phase 2 triggered. Refund or return record created. Case status updated to resolved. Customer notified via chat message. Case awaits customer close or inactivity timeout. |
|                                                                                                                                                                                |
| **Policies Applied:**                                                                                                                                                          |
|                                                                                                                                                                                |
| Applicable to case's dispute type policies                                                                                                                                    |

| **APR-002 Resolution Plan Rejected --- Approver Joins Chat**                                                                                                                                     |
|                                                                                                                                                                                                  |
| **Resolution Path: POST-REJECTION**                                                                                                                                                              |
| **Conditions (all must be true):**                                                                                                                                                               |
|                                                                                                                                                                                                  |
| ✓ Case status = awaiting_approval                                                                                                                                                                |
|                                                                                                                                                                                                  |
| ✓ Approver clicks Reject                                                                                                                                                                         |
|                                                                                                                                                                                                  |
| ✓ Rejection reason provided (min 50 characters)                                                                                                                                                  |
|                                                                                                                                                                                                  |
| ✓ Optional policy citations included                                                                                                                                                             |
|                                                                                                                                                                                                  |
| **Outcome:**                                                                                                                                                                                     |
|                                                                                                                                                                                                  |
| Resolution plan rejected. Case status set to rejected_human_required. Approver is immediately redirected to live customer chat.                                                                  |
|                                                                                                                                                                                                  |
| **Resolution Action:**                                                                                                                                                                           |
|                                                                                                                                                                                                  |
| Approver manually handles the dispute in the live chat. Applies judgment beyond automated rules. Conversation continues until customer closes, inactivity, or approver closes with valid reason. |
|                                                                                                                                                                                                  |
| **Policies Applied:**                                                                                                                                                                            |
|                                                                                                                                                                                                  |
| Rejection reason references applicable policies                                                                                                                                                  |
|                                                                                                                                                                                                  |
| **Note:**                                                                                                                                                                                        |
|                                                                                                                                                                                                  |
| *The approver cannot navigate away from the live chat once redirected. Valid close reasons: Resolved, Customer unresponsive, Duplicate case.*                                                    |

| **APR-003 Resolution Plan Stale --- Approver Inactive**                                                                                                |
|                                                                                                                                                        |
| **Resolution Path: ESCALATION**                                                                                                                        |
| **Conditions (all must be true):**                                                                                                                     |
|                                                                                                                                                        |
| ✓ Case status = awaiting_approval                                                                                                                      |
|                                                                                                                                                        |
| ✓ No approver action taken within 4 business hours                                                                                                     |
|                                                                                                                                                        |
| ✓ System timeout trigger fires                                                                                                                         |
|                                                                                                                                                        |
| **Outcome:**                                                                                                                                           |
|                                                                                                                                                        |
| Resolution plan has been waiting for approval beyond the SLA. Case auto-escalated.                                                                     |
|                                                                                                                                                        |
| **Resolution Action:**                                                                                                                                 |
|                                                                                                                                                        |
| System updates case status to escalated_human_required. Escalation team notified. Case appears in escalation dashboard with 'Approval timeout' flag. |
|                                                                                                                                                        |
| **Policies Applied:**                                                                                                                                  |
|                                                                                                                                                        |
| POL-024 (escalation response SLA), POL-022 (refund resolution SLA)                                                                                     |
|                                                                                                                                                        |
| **Note:**                                                                                                                                              |
|                                                                                                                                                        |
| *This scenario requires a FastAPI background task that checks awaiting_approval cases older than 4 business hours and triggers re-escalation.*         |

## 6. System Failure and Edge Case Paths
Scenarios triggered by AI pipeline failures, data anomalies, or unexpected system states. All system failure paths default to escalation as a safe fallback.

| **FAIL-001 AI Triage Pipeline Failure**                                                                                                                                |
|                                                                                                                                                                        |
| **Resolution Path: SYSTEM FAILURE**                                                                                                                                    |
| **Conditions (all must be true):**                                                                                                                                     |
|                                                                                                                                                                        |
| ✓ WF3 Triage Agent LLM call fails after 3 retries                                                                                                                      |
|                                                                                                                                                                        |
| ✓ OR WF3 returns unparseable JSON                                                                                                                                      |
|                                                                                                                                                                        |
| ✓ OR WF3 routing_decision field is missing                                                                                                                             |
|                                                                                                                                                                        |
| **Outcome:**                                                                                                                                                           |
|                                                                                                                                                                        |
| Triage could not be completed by AI. Safe default to escalation.                                                                                                       |
|                                                                                                                                                                        |
| **Resolution Action:**                                                                                                                                                 |
|                                                                                                                                                                        |
| Case status set to escalated_human_required with triage_decision.justification = 'AI triage processing failed --- manual review required.' Escalation team notified. |
|                                                                                                                                                                        |
| **Policies Applied:**                                                                                                                                                  |
|                                                                                                                                                                        |
| POL-024 (escalation SLA)                                                                                                                                               |
|                                                                                                                                                                        |
| **Note:**                                                                                                                                                              |
|                                                                                                                                                                        |
| *Always default to escalation on AI failure. Never default to autonomous --- risk of incorrect auto-resolution is higher than unnecessary human review.*               |

| **FAIL-002 Data Source Null or Unavailable**                                                                                                             |
|                                                                                                                                                          |
| **Resolution Path: SYSTEM FAILURE**                                                                                                                      |
| **Conditions (all must be true):**                                                                                                                       |
|                                                                                                                                                          |
| ✓ WF2 Data Retrieval returns null for one or more data sources                                                                                           |
|                                                                                                                                                          |
| ✓ OR Supabase query returns HTTP 5xx error                                                                                                               |
|                                                                                                                                                          |
| **Outcome:**                                                                                                                                             |
|                                                                                                                                                          |
| Information bundle is incomplete. Triage cannot proceed reliably with missing data.                                                                      |
|                                                                                                                                                          |
| **Resolution Action:**                                                                                                                                   |
|                                                                                                                                                          |
| WF2 sets null for missing source in bundle. WF3 Triage Agent detects null source, all rules referencing that source fail, routing_decision = escalation. |
|                                                                                                                                                          |
| **Policies Applied:**                                                                                                                                    |
|                                                                                                                                                          |
| No policy --- data integrity rule BR-DAT-001                                                                                                             |
|                                                                                                                                                          |
| **Note:**                                                                                                                                                |
|                                                                                                                                                          |
| *Trigger: ESC-006 (null data source). Escalation agent reviews case manually with partial data and contacts customer.*                                   |

| **FAIL-003 Conflicting Data Signals Between Sources**                                                                                        |
|                                                                                                                                              |
| **Resolution Path: SYSTEM FAILURE**                                                                                                          |
| **Conditions (all must be true):**                                                                                                           |
|                                                                                                                                              |
| ✓ sim_transactions.status = 'refunded' BUT sim_refund_records is empty                                                                     |
|                                                                                                                                              |
| ✓ OR sim_orders.status = 'fulfilled' BUT sim_shipments.shipped_at IS NULL                                                                  |
|                                                                                                                                              |
| ✓ OR any two source fields are logically inconsistent                                                                                        |
|                                                                                                                                              |
| **Outcome:**                                                                                                                                 |
|                                                                                                                                              |
| Conflicting data signals indicate a potential data integrity issue or a complex case that requires human judgment.                           |
|                                                                                                                                              |
| **Resolution Action:**                                                                                                                       |
|                                                                                                                                              |
| WF3 Triage Agent flags the conflict in rules_evaluated. Sets routing_decision = escalation with justification citing the conflicting fields. |
|                                                                                                                                              |
| **Policies Applied:**                                                                                                                        |
|                                                                                                                                              |
| No policy --- data integrity rule BR-DAT-002                                                                                                 |
|                                                                                                                                              |
| **Note:**                                                                                                                                    |
|                                                                                                                                              |
| *Escalation agent reviews the case with both data sources and investigates the inconsistency before resolving.*                              |

| **FAIL-004 Resolution Execution Failure**                                                                                                                                                                 |
|                                                                                                                                                                                                           |
| **Resolution Path: SYSTEM FAILURE**                                                                                                                                                                       |
| **Conditions (all must be true):**                                                                                                                                                                        |
|                                                                                                                                                                                                           |
| ✓ WF5 phase 2 Resolution Agent LLM call fails after 3 retries                                                                                                                                             |
|                                                                                                                                                                                                           |
| ✓ OR refund_request record creation fails                                                                                                                                                                 |
|                                                                                                                                                                                                           |
| **Outcome:**                                                                                                                                                                                              |
|                                                                                                                                                                                                           |
| Resolution execution failed after approval. Case remains resolved in status but execution needs manual follow-up.                                                                                         |
|                                                                                                                                                                                                           |
| **Resolution Action:**                                                                                                                                                                                    |
|                                                                                                                                                                                                           |
| WF5 sets resolution_actions outcome = 'failed'. Case remains resolved. Note flagged for manual follow-up. Customer notified: 'Your resolution is being processed. We will follow up within 24 hours.' |
|                                                                                                                                                                                                           |
| **Policies Applied:**                                                                                                                                                                                     |
|                                                                                                                                                                                                           |
| POL-022 (refund SLA), POL-025 (autonomous execution SLA)                                                                                                                                                  |
|                                                                                                                                                                                                           |
| **Note:**                                                                                                                                                                                                 |
|                                                                                                                                                                                                           |
| *This scenario should trigger an internal alert to the operations team for manual execution of the failed resolution action.*                                                                             |

| **FAIL-005 Case Report Generation Failure**                                                                                                               |
|                                                                                                                                                           |
| **Resolution Path: SYSTEM FAILURE**                                                                                                                       |
| **Conditions (all must be true):**                                                                                                                        |
|                                                                                                                                                           |
| ✓ WF6 Case Report Agent LLM call fails after 3 retries                                                                                                    |
|                                                                                                                                                           |
| ✓ OR report write to DB fails                                                                                                                             |
|                                                                                                                                                           |
| **Outcome:**                                                                                                                                              |
|                                                                                                                                                           |
| Case report could not be generated. Case is still closed --- report failure does not block closure.                                                       |
|                                                                                                                                                           |
| **Resolution Action:**                                                                                                                                    |
|                                                                                                                                                           |
| WF6 N6 fallback: construct minimal report from raw case fields without LLM. Write minimal report. Case status = closed. Internal alert for report review. |
|                                                                                                                                                           |
| **Policies Applied:**                                                                                                                                     |
|                                                                                                                                                           |
| No policy --- audit integrity rule                                                                                                                        |
|                                                                                                                                                           |
| **Note:**                                                                                                                                                 |
|                                                                                                                                                           |
| *WF6 N7 has Continue on Error enabled. Minimal fallback report is always created. Never skip report generation.*                                          |

| **FAIL-006 Inactivity Timeout --- No Customer Response**                                                                                                                                                                                      |
|                                                                                                                                                                                                                                               |
| **Resolution Path: SYSTEM FAILURE**                                                                                                                                                                                                           |
| **Conditions (all must be true):**                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                               |
| ✓ No customer message received for 15 minutes (INACTIVITY_TIMEOUT_MINUTES)                                                                                                                                                                    |
|                                                                                                                                                                                                                                               |
| ✓ Case is in any active status (not closed)                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                               |
| **Outcome:**                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                               |
| Customer became unresponsive. Case auto-closes after inactivity timeout.                                                                                                                                                                      |
|                                                                                                                                                                                                                                               |
| **Resolution Action:**                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                               |
| FastAPI background task fires POST /cases/:id/close with closed_by = 'timeout', close_reason = 'unresponsive'. WF6 triggered. Case report generated. Chat locked. Customer sees: 'This conversation has been closed due to inactivity.' |
|                                                                                                                                                                                                                                               |
| **Policies Applied:**                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                               |
| No policy --- system constant INACTIVITY_TIMEOUT_MINUTES                                                                                                                                                                                      |
|                                                                                                                                                                                                                                               |
| **Note:**                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                               |
| *Timer resets on every customer message (BR-CLO-002). The 15-minute clock only runs when there is no customer activity.*                                                                                                                      |

## 7. Complete Scenario Reference Table
Quick reference for all 30 scenarios. Use this table for implementation verification and testing checklist alignment.

  **ID**      **Title**                                      **Type**        **Path**           **Primary Trigger Rule**
  RREF-001    Standard Refund --- All Rules Pass             Refund          AUTONOMOUS         All BR-REF-001 through BR-REF-005 pass

  RREF-002    Refund --- Order Returned, Not Yet Processed   Refund          AUTONOMOUS         sim_orders.status = returned + all other rules pass

  EREF-001    High-Value Refund --- Above ฿500               Refund          ESCALATION         BR-REF-003 fails --- ESC-001

  EREF-002    Duplicate Refund Detected                      Refund          ESCALATION         BR-REF-004 fails --- ESC-005

  EREF-003    Outside Return Window                          Refund          ESCALATION         BR-REF-005 fails

  EREF-004    Payment Not Confirmed                          Refund          ESCALATION         BR-REF-001 fails --- ESC-007

  EREF-005    Order Status Ineligible                        Refund          ESCALATION         BR-REF-002 fails --- ESC-008

  EREF-006    Partial Refund Request                         Refund          ESCALATION         Amount ambiguity --- BR-DAT-002

  EREF-007    Damaged Goods --- Refund                       Refund          ESCALATION         Damage evidence required --- always escalated

  EREF-008    Non-Returnable Item                            Refund          ESCALATION         POL-002 override --- always escalated

  EREF-009    COD Order --- Cash Refund Not Possible         Refund          ESCALATION         payment_method = cod

  RDEL-001    Standard Delayed Delivery --- All Rules Pass   Delivery        AUTONOMOUS         All BR-DEL-001 through BR-DEL-004 pass

  RDEL-002    Express Delivery SLA Breach                    Delivery        AUTONOMOUS         Express order + 1-day breach threshold

  EDEL-001    Lost Parcel                                    Delivery        ESCALATION         BR-DEL-001 fails --- status = lost

  EDEL-002    Failed Delivery --- Carrier Fault              Delivery        ESCALATION         BR-DEL-001 fails --- status = failed

  EDEL-003    Item Not Yet Shipped                           Delivery        ESCALATION         BR-DEL-002 fails --- ESC-009

  EDEL-004    Duplicate Delivery Complaint                   Delivery        ESCALATION         BR-DEL-003 fails --- ESC-003

  EDEL-005    Within SLA Window --- Too Early                Delivery        ESCALATION         BR-DEL-004 fails --- ESC-010

  EDEL-006    Damaged in Transit                             Delivery        ESCALATION         Damage in transit --- always escalated

  EDEL-007    Wrong Item Delivered                           Delivery        ESCALATION         Item mismatch --- always escalated

  EDEL-008    Partial Delivery --- Items Missing             Delivery        ESCALATION         Partial fulfillment --- amount ambiguity

  BLOCK-001   Insufficient Context --- Intake Fails          Pre-Triage      PRE-TRIAGE BLOCK   Intake Agent: insufficient_context after 3 questions

  BLOCK-002   Duplicate Case --- Same Order Open             Pre-Triage      PRE-TRIAGE BLOCK   FastAPI: existing open case for order_id

  BLOCK-003   Invalid Order ID --- Not in OMS                Pre-Triage      PRE-TRIAGE BLOCK   WF2: OMS returns empty result

  BLOCK-004   Non-Returnable Item Detected                   Pre-Triage      PRE-TRIAGE BLOCK   Triage: item category in non-returnable list

  APR-001     Resolution Plan Approved                       Post-Approval   AUTONOMOUS         Approver approves --- WF5 phase 2 triggered

  APR-002     Resolution Plan Rejected                       Post-Approval   POST-REJECTION     Approver rejects --- approver joins live chat

  APR-003     Resolution Plan Stale --- Approval Timeout     Post-Approval   ESCALATION         4-hour approval SLA breach

  FAIL-001    AI Triage Pipeline Failure                     System          SYSTEM FAILURE     WF3 LLM fails after 3 retries

  FAIL-002    Data Source Null or Unavailable                System          SYSTEM FAILURE     WF2 query returns null --- ESC-006

  FAIL-003    Conflicting Data Signals                       System          SYSTEM FAILURE     Logical inconsistency between sources --- BR-DAT-002

  FAIL-004    Resolution Execution Failure                   System          SYSTEM FAILURE     WF5 phase 2 execution fails

  FAIL-005    Case Report Generation Failure                 System          SYSTEM FAILURE     WF6 report write fails

  FAIL-006    Inactivity Timeout                             System          SYSTEM FAILURE     INACTIVITY_TIMEOUT_MINUTES elapsed

*--- End of Document ---*
