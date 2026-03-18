## 1. Document Overview
This document defines the complete set of policy records seeded into ROAR Engine's database. These are the actual content records stored in the policies table and displayed on the /policies page. Each record has a unique slug used for deep-linking from rejection reasons and referenced by the Triage Agent during rule evaluation.

These policies are written for a generic Thai retail e-commerce and online delivery context. They apply to any retail enterprise operating an online ordering and delivery channel. They are not specific to any single brand.

| These records are seeded via supabase/seed/001_policies.sql (see §7 for the SQL).                                  |
|                                                                                                                    |
| Slugs are permanent --- never change a slug after seeding. All rejection reasons and case reports reference slugs. |
|                                                                                                                    |
| All monetary values are in Thai Baht (฿). All time windows are calendar days unless stated otherwise.              |
|                                                                                                                    |
| Policies are read-only in MVP. No UI editing. Changes require a new seed migration.                                |

  **Field**             **Value**
  Document Type         Policy Records Specification

  Version               1.0

  Total Records         25 policies across 5 categories

  Currency              Thai Baht (฿)

  Context               Generic Thai retail e-commerce and online delivery

  Seeded Via            seed/001_policies.sql

  Referenced By         Triage Agent (WF3), Rejection Modal (frontend), Case Report Agent (WF6)

### 1.1 Policy Registry
  **ID**    **Slug**                          **Title**                                  **Category**
  POL-001   store-return-eligibility          Return Eligibility --- General             store

  POL-002   store-item-exclusions             Non-Returnable Item Categories             store

  POL-003   store-order-cancellation          Order Cancellation Policy                  store

  POL-004   store-damaged-goods               Damaged Goods on Arrival                   store

  POL-005   store-exchange-policy             Exchange Policy                            store

  POL-006   payment-refund-timeline           Refund Processing Timeline                 payment

  POL-007   payment-refund-methods            Refund Method Policy                       payment

  POL-008   payment-partial-refund            Partial Refund Policy                      payment

  POL-009   payment-chargeback-policy         Chargeback and Dispute Policy              payment

  POL-010   payment-failed-transaction        Failed Transaction Resolution              payment

  POL-011   return-window-7-days              Return Window --- 7-Day Standard           return

  POL-012   return-condition-requirements     Item Condition for Returns                 return

  POL-013   return-proof-of-purchase          Proof of Purchase Requirements             return

  POL-014   return-process-steps              Return Process --- Step by Step            return

  POL-015   return-refund-vs-replacement      Refund vs Replacement Options              return

  POL-016   delivery-standard-sla             Standard Delivery SLA                      delivery

  POL-017   delivery-express-sla              Express Delivery SLA                       delivery

  POL-018   delivery-failed-attempt           Failed Delivery Attempt Policy             delivery

  POL-019   delivery-lost-parcel              Lost Parcel Policy                         delivery

  POL-020   delivery-carrier-responsibility   Carrier Responsibility Policy              delivery

  POL-021   sla-response-time                 Customer Support Response Time SLA         sla

  POL-022   sla-resolution-time-refund        Refund Dispute Resolution Time SLA         sla

  POL-023   sla-resolution-time-delivery      Delivery Dispute Resolution Time SLA       sla

  POL-024   sla-escalation-response           Escalated Case Response Time SLA           sla

  POL-025   sla-autonomous-resolution         Autonomous Resolution Execution Time SLA   sla

## 2. Store Policies
General store-level policies governing returns, exchanges, cancellations, and damaged goods. These apply across all product categories unless overridden by a category-specific policy.

| **Return Eligibility --- General**                                                                                                          |
|                                                                                                                                             |
| **Slug:** store-return-eligibility \| Category: store \| ID: POL-001                                                                        |
| Customers are eligible to return purchased items within 7 calendar days from the date of order delivery.                                    |
|                                                                                                                                             |
| To be eligible for a return, the following conditions must all be met:                                                                      |
|                                                                                                                                             |
| 1\. The return request must be submitted within the 7-day return window.                                                                    |
|                                                                                                                                             |
| 2\. The item must be in its original condition --- unused, undamaged, and in original packaging.                                            |
|                                                                                                                                             |
| 3\. Proof of purchase (order reference number) must be provided.                                                                            |
|                                                                                                                                             |
| 4\. The item must not be on the non-returnable items list (see POL-002).                                                                    |
|                                                                                                                                             |
| Returns initiated after the 7-day window are not eligible for automated processing and will require manual review by a customer care agent. |

| **Non-Returnable Item Categories**                                                                                                                      |
|                                                                                                                                                         |
| **Slug:** store-item-exclusions \| Category: store \| ID: POL-002                                                                                       |
| The following item categories are not eligible for return under any circumstances:                                                                      |
|                                                                                                                                                         |
| • Perishable goods (fresh food, beverages, prepared meals)                                                                                              |
|                                                                                                                                                         |
| • Personal hygiene products (once opened or used)                                                                                                       |
|                                                                                                                                                         |
| • Digital goods and gift cards (once redeemed)                                                                                                          |
|                                                                                                                                                         |
| • Customized or personalized items                                                                                                                      |
|                                                                                                                                                         |
| • Items marked as 'Final Sale' or 'Non-Returnable' at time of purchase                                                                              |
|                                                                                                                                                         |
| • Hazardous materials                                                                                                                                   |
|                                                                                                                                                         |
| If a customer submits a return request for a non-returnable item, the case must be escalated to a human agent regardless of other triage rule outcomes. |

| **Order Cancellation Policy**                                                                                                         |
|                                                                                                                                       |
| **Slug:** store-order-cancellation \| Category: store \| ID: POL-003                                                                  |
| Orders may be cancelled at no charge if the cancellation request is submitted before the order status changes to 'shipped'.         |
|                                                                                                                                       |
| Once an order has been shipped, cancellation is no longer possible. The customer must instead submit a return request after delivery. |
|                                                                                                                                       |
| Cancellation requests must reference the order ID.                                                                                    |
|                                                                                                                                       |
| Refunds for successfully cancelled orders are processed within 3--5 business days to the original payment method.                     |
|                                                                                                                                       |
| Orders paid via cash on delivery (COD) that are cancelled before shipment do not require a financial refund.                          |

| **Damaged Goods on Arrival**                                                                                                                                                                                 |
|                                                                                                                                                                                                              |
| **Slug:** store-damaged-goods \| Category: store \| ID: POL-004                                                                                                                                              |
| If a customer receives an item that is damaged, defective, or materially different from what was ordered, they are eligible for a full refund or replacement regardless of the standard 7-day return window. |
|                                                                                                                                                                                                              |
| Damaged goods claims must be submitted within 48 hours of the delivery timestamp.                                                                                                                            |
|                                                                                                                                                                                                              |
| The customer must provide: (1) the order reference number, (2) a description of the damage, and (3) photographic evidence where possible.                                                                    |
|                                                                                                                                                                                                              |
| Damaged goods claims are automatically escalated to a human agent --- they are not eligible for autonomous resolution due to the evidence verification requirement.                                          |
|                                                                                                                                                                                                              |
| A replacement will be dispatched within 2 business days of claim approval, subject to stock availability.                                                                                                    |

| **Exchange Policy**                                                                                                            |
|                                                                                                                                |
| **Slug:** store-exchange-policy \| Category: store \| ID: POL-005                                                              |
| Exchanges are available for eligible items within the standard 7-day return window.                                            |
|                                                                                                                                |
| Exchanges are processed as a return of the original item followed by a new order for the replacement item.                     |
|                                                                                                                                |
| If the replacement item is higher in value, the customer must pay the price difference.                                        |
|                                                                                                                                |
| If the replacement item is lower in value, a partial refund for the price difference will be issued within 3--5 business days. |
|                                                                                                                                |
| Exchanges for items of equal value incur no additional charge.                                                                 |
|                                                                                                                                |
| Exchange requests follow the same eligibility conditions as standard returns (see POL-001).                                    |

## 3. Payment Policies
Policies governing refund processing, payment methods, chargebacks, and failed transactions. These are referenced by the Triage Agent when evaluating refund disputes.

| **Refund Processing Timeline**                                                                                         |
|                                                                                                                        |
| **Slug:** payment-refund-timeline \| Category: payment \| ID: POL-006                                                  |
| Once a refund has been approved (either autonomously or by a human agent), the following processing timelines apply:   |
|                                                                                                                        |
| • Credit/Debit Card: 3--5 business days for the refund to appear on the customer's statement.                         |
|                                                                                                                        |
| • PromptPay / Bank Transfer: 1--2 business days.                                                                       |
|                                                                                                                        |
| • Digital Wallet (TrueMoney, Rabbit LINE Pay): 1--3 business days.                                                     |
|                                                                                                                        |
| • Cash on Delivery (COD): Store credit is issued within 1 business day. Cash refunds are not supported for COD orders. |
|                                                                                                                        |
| Refund timelines begin from the date of approval, not the date of the original transaction.                            |
|                                                                                                                        |
| Customers should allow the full processing period before raising a follow-up inquiry.                                  |

| **Refund Method Policy**                                                                                                                                                                                    |
|                                                                                                                                                                                                             |
| **Slug:** payment-refund-methods \| Category: payment \| ID: POL-007                                                                                                                                        |
| Refunds are issued to the original payment method used at the time of purchase.                                                                                                                             |
|                                                                                                                                                                                                             |
| Refunds cannot be redirected to a different payment method, account, or recipient.                                                                                                                          |
|                                                                                                                                                                                                             |
| If the original payment method is no longer active (e.g. expired card, closed wallet), the customer must contact support directly --- automated refunds cannot be processed and the case will be escalated. |
|                                                                                                                                                                                                             |
| Store credit may be offered as an alternative refund method at the customer's request, but cannot be forced as a substitute for a valid payment method refund.                                             |

| **Partial Refund Policy**                                                                                                                         |
|                                                                                                                                                   |
| **Slug:** payment-partial-refund \| Category: payment \| ID: POL-008                                                                              |
| Partial refunds are available in the following scenarios:                                                                                         |
|                                                                                                                                                   |
| • Only some items in a multi-item order are being returned (remaining items were received in acceptable condition).                               |
|                                                                                                                                                   |
| • An item was received in a condition slightly below expectation but is still usable, and the customer and agent agree on a partial compensation. |
|                                                                                                                                                   |
| Partial refunds are not eligible for autonomous resolution --- they require human agent review to determine the correct refund amount.            |
|                                                                                                                                                   |
| The maximum partial refund amount is the pro-rated value of the returned or affected items within the order.                                      |
|                                                                                                                                                   |
| Partial refunds follow the same processing timeline as full refunds (see POL-006).                                                                |

| **Chargeback and Dispute Policy**                                                                                                                                                          |
|                                                                                                                                                                                            |
| **Slug:** payment-chargeback-policy \| Category: payment \| ID: POL-009                                                                                                                    |
| Customers who have initiated a chargeback through their bank or card issuer for an order should not also submit a dispute through ROAR Engine for the same order.                          |
|                                                                                                                                                                                            |
| If a chargeback is already in progress for an order, any ROAR Engine dispute submitted for the same order ID will be automatically escalated to a human agent.                             |
|                                                                                                                                                                                            |
| Duplicate resolution through both channels (chargeback + ROAR Engine) for the same transaction is not permitted.                                                                           |
|                                                                                                                                                                                            |
| Customers are encouraged to use ROAR Engine's dispute resolution process instead of chargebacks --- our resolution SLA (see POL-022) is faster than the standard bank chargeback process. |

| **Failed Transaction Resolution**                                                                                                                                                                     |
|                                                                                                                                                                                                       |
| **Slug:** payment-failed-transaction \| Category: payment \| ID: POL-010                                                                                                                              |
| If a customer was charged for an order but the transaction status shows as 'failed' in our payment system, the following applies:                                                                   |
|                                                                                                                                                                                                       |
| • If the charge appears on the customer's statement but our system shows 'failed': this is a payment gateway discrepancy. The case must be escalated --- autonomous resolution is not available.   |
|                                                                                                                                                                                                       |
| • If our system confirms the transaction failed and no charge was made: no refund is applicable. The customer should retry their order.                                                               |
|                                                                                                                                                                                                       |
| Failed transaction disputes that involve a confirmed charge (sim_transactions.status = confirmed but order was not fulfilled) are treated as refund disputes and follow standard refund triage rules. |

## 4. Return Policies
Detailed policies governing the return process, item condition requirements, proof of purchase, and the step-by-step return procedure.

| **Return Window --- 7-Day Standard**                                                                                                                |
|                                                                                                                                                     |
| **Slug:** return-window-7-days \| Category: return \| ID: POL-011                                                                                   |
| The standard return window for all eligible items is 7 calendar days from the confirmed delivery date.                                              |
|                                                                                                                                                     |
| The delivery date is determined by the logistics tracking record --- specifically the timestamp of the 'delivered' event in the tracking history. |
|                                                                                                                                                     |
| Day 1 of the return window begins on the calendar day following the confirmed delivery date.                                                        |
|                                                                                                                                                     |
| Return requests submitted on Day 7 are accepted until 23:59 Bangkok time (UTC+7).                                                                   |
|                                                                                                                                                     |
| Return requests submitted on Day 8 or later are outside the window and are not eligible for automated processing.                                   |
|                                                                                                                                                     |
| Exception: damaged goods on arrival (POL-004) are not subject to the 7-day window --- they must be reported within 48 hours of delivery.            |

| **Item Condition for Returns**                                                                                                  |
|                                                                                                                                 |
| **Slug:** return-condition-requirements \| Category: return \| ID: POL-012                                                      |
| To be accepted for return, items must meet the following condition requirements:                                                |
|                                                                                                                                 |
| • Unused: the item has not been used, worn, consumed, or activated.                                                             |
|                                                                                                                                 |
| • Undamaged: the item has no damage beyond any that was present upon receipt.                                                   |
|                                                                                                                                 |
| • Complete: all original components, accessories, and documentation are included.                                               |
|                                                                                                                                 |
| • Original packaging: the item must be in its original packaging in resaleable condition.                                       |
|                                                                                                                                 |
| Items that do not meet these condition requirements may be rejected for return.                                                 |
|                                                                                                                                 |
| Items that arrive damaged (damage caused during return shipping) are the customer's responsibility unless adequately packaged. |

| **Proof of Purchase Requirements**                                                                                                                             |
|                                                                                                                                                                |
| **Slug:** return-proof-of-purchase \| Category: return \| ID: POL-013                                                                                          |
| A valid proof of purchase is required for all return and refund requests.                                                                                      |
|                                                                                                                                                                |
| Accepted proof of purchase:                                                                                                                                    |
|                                                                                                                                                                |
| • Order reference number (provided at time of purchase and visible in order history)                                                                           |
|                                                                                                                                                                |
| • Order confirmation email or receipt                                                                                                                          |
|                                                                                                                                                                |
| The order reference number is the primary identifier used by ROAR Engine. Customers must provide this when submitting a dispute.                               |
|                                                                                                                                                                |
| Disputes submitted without a valid, traceable order reference number cannot proceed to triage and will be flagged as insufficient context by the Intake Agent. |

| **Return Process --- Step by Step**                                                                                   |
|                                                                                                                       |
| **Slug:** return-process-steps \| Category: return \| ID: POL-014                                                     |
| The standard return process follows these steps:                                                                      |
|                                                                                                                       |
| 1\. Customer submits a return dispute via ROAR Engine with the order reference number and a description of the issue. |
|                                                                                                                       |
| 2\. ROAR Engine's AI triage system verifies eligibility against return policies and SLA rules.                       |
|                                                                                                                       |
| 3\. If eligible for autonomous resolution: a return request is generated and the customer receives instructions.      |
|                                                                                                                       |
| 4\. If escalation is required: a human agent reviews the case and contacts the customer.                              |
|                                                                                                                       |
| 5\. Once approved, the customer receives a return authorization and packaging instructions.                           |
|                                                                                                                       |
| 6\. The refund or replacement is processed within the applicable SLA after the return is confirmed.                   |
|                                                                                                                       |
| Customers should not ship items back before receiving a return authorization.                                         |

| **Refund vs Replacement Options**                                                                                                                               |
|                                                                                                                                                                 |
| **Slug:** return-refund-vs-replacement \| Category: return \| ID: POL-015                                                                                       |
| For eligible return and dispute cases, customers may choose between a full refund or a replacement item.                                                        |
|                                                                                                                                                                 |
| Refund: the original transaction amount is returned to the customer's original payment method within the applicable processing timeline (see POL-006).         |
|                                                                                                                                                                 |
| Replacement: a new item of the same SKU is dispatched within 2 business days, subject to inventory availability.                                                |
|                                                                                                                                                                 |
| If the requested replacement item is out of stock, a full refund will be issued automatically.                                                                  |
|                                                                                                                                                                 |
| The resolution type (refund vs replacement) is determined by ROAR Engine's Resolution Agent based on the dispute type, triage outcome, and stock availability. |
|                                                                                                                                                                 |
| Customers may express a preference in their dispute message, and the Resolution Agent will attempt to honor it if both options are available.                   |

## 5. Delivery Policies
Policies governing delivery SLAs, failed delivery attempts, lost parcels, and carrier responsibility. These are referenced by the Triage Agent when evaluating delivery disputes.

| **Standard Delivery SLA**                                                                                                                                                        |
|                                                                                                                                                                                  |
| **Slug:** delivery-standard-sla \| Category: delivery \| ID: POL-016                                                                                                             |
| Standard delivery orders are expected to be delivered within the following timeframes from order confirmation:                                                                   |
|                                                                                                                                                                                  |
| • Bangkok Metropolitan Area (BMA): 1--3 business days                                                                                                                            |
|                                                                                                                                                                                  |
| • Central Thailand (excluding BMA): 2--4 business days                                                                                                                           |
|                                                                                                                                                                                  |
| • Northern / Northeastern / Southern Thailand: 3--5 business days                                                                                                                |
|                                                                                                                                                                                  |
| These SLAs represent the expected delivery window under normal operating conditions.                                                                                             |
|                                                                                                                                                                                  |
| A delivery dispute is valid only if the current date exceeds the estimated delivery date by more than 3 calendar days (DELIVERY_SLA_BREACH_DAYS).                                |
|                                                                                                                                                                                  |
| Delays within the SLA window are not eligible for dispute resolution --- customers should monitor tracking and contact support if the delay extends beyond the breach threshold. |

| **Express Delivery SLA**                                                                                                                                        |
|                                                                                                                                                                 |
| **Slug:** delivery-express-sla \| Category: delivery \| ID: POL-017                                                                                             |
| Express delivery orders placed before 14:00 Bangkok time on a business day are eligible for same-day or next-day delivery within the Bangkok Metropolitan Area. |
|                                                                                                                                                                 |
| Express delivery outside Bangkok Metropolitan Area follows the standard delivery SLA (see POL-016) regardless of the express designation.                       |
|                                                                                                                                                                 |
| Express delivery SLA breach threshold is 1 calendar day past the guaranteed delivery date (reduced from the standard 3-day breach threshold).                   |
|                                                                                                                                                                 |
| If an express delivery order is not delivered by the guaranteed date + 1 day, the case is immediately eligible for dispute resolution.                          |
|                                                                                                                                                                 |
| Express delivery orders that miss the SLA are eligible for a shipping fee refund in addition to the standard dispute resolution options.                        |

| **Failed Delivery Attempt Policy**                                                                                                                                                            |
|                                                                                                                                                                                               |
| **Slug:** delivery-failed-attempt \| Category: delivery \| ID: POL-018                                                                                                                        |
| If a delivery attempt fails because no one was available to receive the parcel, the following applies:                                                                                        |
|                                                                                                                                                                                               |
| • The carrier will make up to 2 re-delivery attempts on subsequent business days.                                                                                                             |
|                                                                                                                                                                                               |
| • After 2 failed attempts, the parcel will be held at the nearest carrier depot for 5 business days.                                                                                          |
|                                                                                                                                                                                               |
| • If uncollected after the holding period, the parcel is returned to the sender and a return-to-sender fee applies.                                                                           |
|                                                                                                                                                                                               |
| Failed delivery attempts due to customer unavailability are not eligible for a delivery dispute --- the dispute must be for delays or lost parcels.                                           |
|                                                                                                                                                                                               |
| If a delivery is marked as 'failed' due to an incorrect address provided by the merchant (not the customer), the case is eligible for a full refund and must be escalated to a human agent. |

| **Lost Parcel Policy**                                                                                                                                                           |
|                                                                                                                                                                                  |
| **Slug:** delivery-lost-parcel \| Category: delivery \| ID: POL-019                                                                                                              |
| A parcel is considered lost when the shipment status is 'lost' in the logistics tracking system.                                                                               |
|                                                                                                                                                                                  |
| Lost parcel cases are never eligible for autonomous resolution --- they must be escalated to a human agent.                                                                      |
|                                                                                                                                                                                  |
| The human agent will initiate a carrier investigation. Investigation timelines vary by carrier but typically take 3--7 business days.                                            |
|                                                                                                                                                                                  |
| If the carrier confirms the parcel is lost, the customer is eligible for:                                                                                                        |
|                                                                                                                                                                                  |
| • A full replacement of the original order (subject to inventory availability), or                                                                                               |
|                                                                                                                                                                                  |
| • A full refund of the original transaction amount.                                                                                                                              |
|                                                                                                                                                                                  |
| The carrier investigation does not need to conclude before a refund or replacement is authorized --- agents may resolve the case in the customer's favor pending investigation. |

| **Carrier Responsibility Policy**                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                          |
| **Slug:** delivery-carrier-responsibility \| Category: delivery \| ID: POL-020                                                                                                                                                           |
| The merchant is responsible for ensuring items are dispatched in adequate packaging and handed to the carrier in good condition.                                                                                                         |
|                                                                                                                                                                                                                                          |
| Once an item has been confirmed handed to the carrier (sim_shipments.shipped_at IS NOT NULL), carrier responsibility applies for:                                                                                                        |
|                                                                                                                                                                                                                                          |
| • Damage sustained during transit                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                          |
| • Delivery delays beyond the carrier's stated SLA                                                                                                                                                                                       |
|                                                                                                                                                                                                                                          |
| • Lost parcels                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                          |
| The customer's dispute is with the merchant's order fulfillment service --- ROAR Engine handles disputes at the merchant level. Carrier claims are managed internally and do not require the customer to contact the carrier directly. |
|                                                                                                                                                                                                                                          |
| In cases where carrier damage is suspected, the case must be escalated to a human agent for carrier claim initiation.                                                                                                                    |

## 6. SLA Standards
Service Level Agreement standards for ROAR Engine's dispute resolution system. These define the system's performance commitments to customers and internal teams.

| **Customer Support Response Time SLA**                                                                        |
|                                                                                                               |
| **Slug:** sla-response-time \| Category: sla \| ID: POL-021                                                   |
| ROAR Engine commits to the following initial response times after a dispute is submitted:                     |
|                                                                                                               |
| • AI-handled intake (Intake Agent response): within 30 seconds of form submission.                            |
|                                                                                                               |
| • Case creation confirmation: within 2 minutes of intent classification.                                      |
|                                                                                                               |
| • First system status update to customer: within 5 minutes of case creation.                                  |
|                                                                                                               |
| These response time SLAs apply to AI-handled touchpoints. Human agent response times are governed by POL-024. |

| **Refund Dispute Resolution Time SLA**                                                                                           |
|                                                                                                                                  |
| **Slug:** sla-resolution-time-refund \| Category: sla \| ID: POL-022                                                             |
| The target resolution times for refund disputes are as follows:                                                                  |
|                                                                                                                                  |
| • Autonomous resolution (approved by agent): resolution plan generated and executed within 10 minutes of case creation.          |
|                                                                                                                                  |
| • Human-escalated resolution: human agent response within 4 business hours of escalation. Full resolution within 1 business day. |
|                                                                                                                                  |
| • Rejected and human-handled: human agent joins chat within 15 minutes of rejection. Resolution within 4 business hours.         |
|                                                                                                                                  |
| Refund processing time (the actual money movement) is governed by POL-006 and is separate from the resolution SLA.               |
|                                                                                                                                  |
| Resolution SLA clock starts from the moment the case is created, not from the moment the customer submits the form.              |

| **Delivery Dispute Resolution Time SLA**                                                                                                                                                         |
|                                                                                                                                                                                                  |
| **Slug:** sla-resolution-time-delivery \| Category: sla \| ID: POL-023                                                                                                                           |
| The target resolution times for delivery disputes are as follows:                                                                                                                                |
|                                                                                                                                                                                                  |
| • Autonomous resolution (approved by agent): resolution plan generated and executed within 10 minutes of case creation.                                                                          |
|                                                                                                                                                                                                  |
| • Human-escalated resolution (delayed shipment): human agent response within 4 business hours. Resolution within 1 business day.                                                                 |
|                                                                                                                                                                                                  |
| • Lost parcel escalation: human agent response within 2 business hours due to higher urgency. Carrier investigation initiated within 1 business day. Customer resolution within 3 business days. |
|                                                                                                                                                                                                  |
| • Rejected and human-handled: human agent joins chat within 15 minutes of rejection. Resolution within 4 business hours.                                                                         |

| **Escalated Case Response Time SLA**                                                                                           |
|                                                                                                                                |
| **Slug:** sla-escalation-response \| Category: sla \| ID: POL-024                                                              |
| When a case is escalated to a human agent (either via triage escalation or post-rejection), the following response SLAs apply: |
|                                                                                                                                |
| • Escalation agent joins live chat: within 15 minutes of case being assigned.                                                  |
|                                                                                                                                |
| • First meaningful response to customer in chat: within 5 minutes of agent joining.                                            |
|                                                                                                                                |
| • Case resolution or clear next-step communicated: within 4 business hours of escalation.                                      |
|                                                                                                                                |
| Escalated cases are prioritized in the dashboard by time in queue --- oldest cases appear first.                               |
|                                                                                                                                |
| If an escalated case remains unresolved after 1 business day, it must be flagged for supervisor review.                        |

| **Autonomous Resolution Execution Time SLA**                                                                            |
|                                                                                                                         |
| **Slug:** sla-autonomous-resolution \| Category: sla \| ID: POL-025                                                     |
| For cases that follow the autonomous resolution path, the following execution SLAs apply:                               |
|                                                                                                                         |
| • Triage decision: within 60 seconds of information bundle assembly.                                                    |
|                                                                                                                         |
| • Resolution plan generation: within 90 seconds of triage decision.                                                     |
|                                                                                                                         |
| • Resolution plan available for agent review: immediately upon generation.                                              |
|                                                                                                                         |
| • Post-approval execution (refund/return record creation): within 30 seconds of agent approval.                         |
|                                                                                                                         |
| • Customer notification of resolution: within 10 seconds of execution completion.                                       |
|                                                                                                                         |
| Total autonomous resolution time (case creation to customer notification): target under 10 minutes, maximum 30 minutes. |
|                                                                                                                         |
| If the AI pipeline exceeds 30 minutes without completion, the case must be automatically escalated to a human agent.    |

## 7. SQL Seed Script
The following SQL seeds all 25 policy records into the policies table. Run this as part of the database initialization sequence before the application is used or demoed.

| File location: seed/001_policies.sql                                                   |
|                                                                                        |
| Run after: 002_reports_policies.sql (which creates the policies table)                 |
|                                                                                        |
| This script is idempotent --- safe to re-run. Uses INSERT \... ON CONFLICT DO NOTHING. |

| \-- seed/001_policies.sql                                                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ROAR Engine Policy Records Seed                                                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- Run after migrations create the policies table                                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                                        |
| INSERT INTO policies (id, category, title, slug, content) VALUES                                                                                                                                                                                                                                                                       |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ── STORE POLICIES ──                                                                                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-001', 'store', 'Return Eligibility --- General', 'store-return-eligibility',                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Customers are eligible to return purchased items within 7 calendar days from the date of order delivery. To be eligible, all of the following must be true: the request is within the 7-day window, the item is unused and in original packaging, proof of purchase is provided, and the item is not on the non-returnable list.'), |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-002', 'store', 'Non-Returnable Item Categories', 'store-item-exclusions',                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Non-returnable items include: perishable goods, personal hygiene products (opened), digital goods and gift cards (redeemed), customized items, Final Sale items, and hazardous materials. Return requests for these items must be escalated to a human agent.'),                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-003', 'store', 'Order Cancellation Policy', 'store-order-cancellation',                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Orders may be cancelled at no charge before the status changes to shipped. Post-shipment cancellations are not possible --- customers must return after delivery. Refunds for cancellations process within 3--5 business days. COD cancellations receive store credit only.'),                                                      |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-004', 'store', 'Damaged Goods on Arrival', 'store-damaged-goods',                                                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Damaged goods must be reported within 48 hours of delivery. All damaged goods cases are escalated to a human agent. Replacement dispatched within 2 business days of claim approval, subject to stock.'),                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-005', 'store', 'Exchange Policy', 'store-exchange-policy',                                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Exchanges are available within the 7-day return window for eligible items. Processed as return plus new order. Price differences apply. Exchange eligibility follows the same conditions as standard returns.'),                                                                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ── PAYMENT POLICIES ──                                                                                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-006', 'payment', 'Refund Processing Timeline', 'payment-refund-timeline',                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Refund timelines from approval date: Credit/Debit Card 3--5 business days, PromptPay/Bank Transfer 1--2 business days, Digital Wallet 1--3 business days, COD store credit within 1 business day. Cash refunds not available for COD.'),                                                                                            |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-007', 'payment', 'Refund Method Policy', 'payment-refund-methods',                                                                                                                                                                                                                                                       |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Refunds are issued to the original payment method only. Redirects to different methods are not permitted. Inactive payment methods require human agent handling --- automated refunds not available. Store credit may be offered as alternative at customer request.'),                                                             |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-008', 'payment', 'Partial Refund Policy', 'payment-partial-refund',                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Partial refunds apply when only some items are returned or when partial compensation is agreed. Partial refunds require human agent review --- not eligible for autonomous resolution. Maximum partial refund is the pro-rated value of affected items.'),                                                                          |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-009', 'payment', 'Chargeback and Dispute Policy', 'payment-chargeback-policy',                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Customers with an active chargeback for an order should not also use ROAR Engine for the same order. Active chargeback cases are escalated. Duplicate resolution through both channels is not permitted.'),                                                                                                                         |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-010', 'payment', 'Failed Transaction Resolution', 'payment-failed-transaction',                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Confirmed charge with failed order status: escalate for gateway discrepancy review. System-confirmed failed transaction with no charge: no refund applicable. Confirmed charge with unfulfilled order: treated as refund dispute under standard triage.'),                                                                          |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ── RETURN POLICIES ──                                                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-011', 'return', 'Return Window --- 7-Day Standard', 'return-window-7-days',                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                                                        |
| '7 calendar days from confirmed delivery date. Day 1 begins the day after delivery. Requests on Day 8+ are ineligible for automated processing. Exception: damaged goods must be reported within 48 hours.'),                                                                                                                        |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-012', 'return', 'Item Condition for Returns', 'return-condition-requirements',                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Items must be unused, undamaged, complete with all components, and in original resaleable packaging. Items not meeting these conditions may be rejected. Return shipping damage is the customer''s responsibility.'),                                                                                                             |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-013', 'return', 'Proof of Purchase Requirements', 'return-proof-of-purchase',                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Required: order reference number, order confirmation email or receipt. Order reference number is the primary identifier. Disputes without a valid traceable order reference cannot proceed to triage.'),                                                                                                                            |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-014', 'return', 'Return Process --- Step by Step', 'return-process-steps',                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Step 1: submit dispute with order reference. Step 2: AI triage verifies eligibility. Step 3: autonomous resolution or human escalation. Step 4: return authorization issued. Step 5: refund or replacement processed. Do not ship items before authorization.'),                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-015', 'return', 'Refund vs Replacement Options', 'return-refund-vs-replacement',                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Eligible customers may choose refund or replacement. Refund to original payment method per POL-006. Replacement dispatched within 2 business days subject to stock. Out-of-stock replacement defaults to full refund. Resolution Agent determines type based on dispute and inventory.'),                                           |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ── DELIVERY POLICIES ──                                                                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-016', 'delivery', 'Standard Delivery SLA', 'delivery-standard-sla',                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Standard delivery: BMA 1--3 days, Central Thailand 2--4 days, North/NE/South 3--5 days from order confirmation. Dispute valid only if current date exceeds estimated delivery + 3 days (DELIVERY_SLA_BREACH_DAYS).'),                                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-017', 'delivery', 'Express Delivery SLA', 'delivery-express-sla',                                                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Express delivery within BMA for orders placed before 14:00. Outside BMA follows standard SLA. Breach threshold is 1 day past guaranteed date (reduced from standard 3-day threshold). Shipping fee refund on SLA breach.'),                                                                                                         |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-018', 'delivery', 'Failed Delivery Attempt Policy', 'delivery-failed-attempt',                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Up to 2 re-delivery attempts. Then held at depot for 5 business days. Uncollected returns to sender with fee. Customer unavailability is not grounds for delivery dispute. Merchant address error cases escalated for full refund.'),                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-019', 'delivery', 'Lost Parcel Policy', 'delivery-lost-parcel',                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Status lost = always escalated, never autonomous. Carrier investigation initiated within 1 business day. Customer eligible for full replacement or full refund. Resolution may proceed in customer favour pending investigation.'),                                                                                                 |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-020', 'delivery', 'Carrier Responsibility Policy', 'delivery-carrier-responsibility',                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Merchant responsible for dispatch condition. Carrier responsible from handoff (shipped_at IS NOT NULL) for transit damage, delays, and loss. Customer disputes handled at merchant level --- no need to contact carrier directly. Carrier damage cases escalated.'),                                                                |
|                                                                                                                                                                                                                                                                                                                                        |
| \-- ── SLA STANDARDS ──                                                                                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-021', 'sla', 'Customer Support Response Time SLA', 'sla-response-time',                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Intake Agent response: within 30 seconds. Case creation: within 2 minutes of intent classification. First status update to customer: within 5 minutes of case creation. Human agent SLAs governed by POL-024.'),                                                                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-022', 'sla', 'Refund Dispute Resolution Time SLA', 'sla-resolution-time-refund',                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Autonomous: plan and execution within 10 minutes. Human escalation: agent response within 4 business hours, resolution within 1 business day. Post-rejection human chat: agent joins within 15 minutes, resolution within 4 hours.'),                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-023', 'sla', 'Delivery Dispute Resolution Time SLA', 'sla-resolution-time-delivery',                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Autonomous: plan and execution within 10 minutes. Delayed shipment escalation: agent response within 4 hours, resolution within 1 day. Lost parcel: agent response within 2 hours, carrier investigation within 1 day, customer resolution within 3 days.'),                                                                        |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-024', 'sla', 'Escalated Case Response Time SLA', 'sla-escalation-response',                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Agent joins live chat within 15 minutes of assignment. First meaningful response within 5 minutes of joining. Resolution or clear next step within 4 business hours. Cases unresolved after 1 business day flagged for supervisor.'),                                                                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ('pol-025', 'sla', 'Autonomous Resolution Execution Time SLA', 'sla-autonomous-resolution',                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                                                        |
| 'Triage decision: within 60 seconds of bundle assembly. Plan generation: within 90 seconds of triage. Execution post-approval: within 30 seconds. Customer notification: within 10 seconds of execution. Total target: under 10 minutes. Maximum: 30 minutes before auto-escalation.')                                               |
|                                                                                                                                                                                                                                                                                                                                        |
| ON CONFLICT (slug) DO NOTHING;                                                                                                                                                                                                                                                                                                         |

*--- End of Document ---*
