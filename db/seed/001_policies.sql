-- ROAR Engine Policy Records Seed
-- Source of truth: docs/ROAR_Policies_v1.md §7
-- Idempotent: safe to re-run

INSERT INTO policies (category, title, slug, content) VALUES

-- ── STORE POLICIES ──
('store', 'Return Eligibility --- General', 'store-return-eligibility',
'Customers are eligible to return purchased items within 7 calendar days from the date of order delivery. To be eligible, all of the following must be true: the request is within the 7-day window, the item is unused and in original packaging, proof of purchase is provided, and the item is not on the non-returnable list.'),

('store', 'Non-Returnable Item Categories', 'store-item-exclusions',
'Non-returnable items include: perishable goods, personal hygiene products (opened), digital goods and gift cards (redeemed), customized items, Final Sale items, and hazardous materials. Return requests for these items must be escalated to a human agent.'),

('store', 'Order Cancellation Policy', 'store-order-cancellation',
'Orders may be cancelled at no charge before the status changes to shipped. Post-shipment cancellations are not possible --- customers must return after delivery. Refunds for cancellations process within 3--5 business days. COD cancellations receive store credit only.'),

('store', 'Damaged Goods on Arrival', 'store-damaged-goods',
'Damaged goods must be reported within 48 hours of delivery. All damaged goods cases are escalated to a human agent. Replacement dispatched within 2 business days of claim approval, subject to stock.'),

('store', 'Exchange Policy', 'store-exchange-policy',
'Exchanges are available within the 7-day return window for eligible items. Processed as return plus new order. Price differences apply. Exchange eligibility follows the same conditions as standard returns.'),

-- ── PAYMENT POLICIES ──
('payment', 'Refund Processing Timeline', 'payment-refund-timeline',
'Refund timelines from approval date: Credit/Debit Card 3--5 business days, PromptPay/Bank Transfer 1--2 business days, Digital Wallet 1--3 business days, COD store credit within 1 business day. Cash refunds not available for COD.'),

('payment', 'Refund Method Policy', 'payment-refund-methods',
'Refunds are issued to the original payment method only. Redirects to different methods are not permitted. Inactive payment methods require human agent handling --- automated refunds not available. Store credit may be offered as alternative at customer request.'),

('payment', 'Partial Refund Policy', 'payment-partial-refund',
'Partial refunds apply when only some items are returned or when partial compensation is agreed. Partial refunds require human agent review --- not eligible for autonomous resolution. Maximum partial refund is the pro-rated value of affected items.'),

('payment', 'Chargeback and Dispute Policy', 'payment-chargeback-policy',
'Customers with an active chargeback for an order should not also use ROAR Engine for the same order. Active chargeback cases are escalated. Duplicate resolution through both channels is not permitted.'),

('payment', 'Failed Transaction Resolution', 'payment-failed-transaction',
'Confirmed charge with failed order status: escalate for gateway discrepancy review. System-confirmed failed transaction with no charge: no refund applicable. Confirmed charge with unfulfilled order: treated as refund dispute under standard triage.'),

-- ── RETURN POLICIES ──
('return', 'Return Window --- 7-Day Standard', 'return-window-7-days',
'7 calendar days from confirmed delivery date. Day 1 begins the day after delivery. Requests on Day 8+ are ineligible for automated processing. Exception: damaged goods must be reported within 48 hours.'),

('return', 'Item Condition for Returns', 'return-condition-requirements',
'Items must be unused, undamaged, complete with all components, and in original resaleable packaging. Items not meeting these conditions may be rejected. Return shipping damage is the customer''s responsibility.'),

('return', 'Proof of Purchase Requirements', 'return-proof-of-purchase',
'Required: order reference number, order confirmation email or receipt. Order reference number is the primary identifier. Disputes without a valid traceable order reference cannot proceed to triage.'),

('return', 'Return Process --- Step by Step', 'return-process-steps',
'Step 1: submit dispute with order reference. Step 2: AI triage verifies eligibility. Step 3: autonomous resolution or human escalation. Step 4: return authorization issued. Step 5: refund or replacement processed. Do not ship items before authorization.'),

('return', 'Refund vs Replacement Options', 'return-refund-vs-replacement',
'Eligible customers may choose refund or replacement. Refund to original payment method per POL-006. Replacement dispatched within 2 business days subject to stock. Out-of-stock replacement defaults to full refund. Resolution Agent determines type based on dispute and inventory.'),

-- ── DELIVERY POLICIES ──
('delivery', 'Standard Delivery SLA', 'delivery-standard-sla',
'Standard delivery: BMA 1--3 days, Central Thailand 2--4 days, North/NE/South 3--5 days from order confirmation. Dispute valid only if current date exceeds estimated delivery + 3 days (DELIVERY_SLA_BREACH_DAYS).'),

('delivery', 'Express Delivery SLA', 'delivery-express-sla',
'Express delivery within BMA for orders placed before 14:00. Outside BMA follows standard SLA. Breach threshold is 1 day past guaranteed date (reduced from standard 3-day threshold). Shipping fee refund on SLA breach.'),

('delivery', 'Failed Delivery Attempt Policy', 'delivery-failed-attempt',
'Up to 2 re-delivery attempts. Then held at depot for 5 business days. Uncollected returns to sender with fee. Customer unavailability is not grounds for delivery dispute. Merchant address error cases escalated for full refund.'),

('delivery', 'Lost Parcel Policy', 'delivery-lost-parcel',
'Status lost = always escalated, never autonomous. Carrier investigation initiated within 1 business day. Customer eligible for full replacement or full refund. Resolution may proceed in customer favour pending investigation.'),

('delivery', 'Carrier Responsibility Policy', 'delivery-carrier-responsibility',
'Merchant responsible for dispatch condition. Carrier responsible from handoff (shipped_at IS NOT NULL) for transit damage, delays, and loss. Customer disputes handled at merchant level --- no need to contact carrier directly. Carrier damage cases escalated.'),

-- ── SLA STANDARDS ──
('sla', 'Customer Support Response Time SLA', 'sla-response-time',
'Intake Agent response: within 30 seconds. Case creation: within 2 minutes of intent classification. First status update to customer: within 5 minutes of case creation. Human agent SLAs governed by POL-024.'),

('sla', 'Refund Dispute Resolution Time SLA', 'sla-resolution-time-refund',
'Autonomous: plan and execution within 10 minutes. Human escalation: agent response within 4 business hours, resolution within 1 business day. Post-rejection human chat: agent joins within 15 minutes, resolution within 4 hours.'),

('sla', 'Delivery Dispute Resolution Time SLA', 'sla-resolution-time-delivery',
'Autonomous: plan and execution within 10 minutes. Delayed shipment escalation: agent response within 4 hours, resolution within 1 day. Lost parcel: agent response within 2 hours, carrier investigation within 1 day, customer resolution within 3 days.'),

('sla', 'Escalated Case Response Time SLA', 'sla-escalation-response',
'Agent joins live chat within 15 minutes of assignment. First meaningful response within 5 minutes of joining. Resolution or clear next step within 4 business hours. Cases unresolved after 1 business day flagged for supervisor.'),

('sla', 'Autonomous Resolution Execution Time SLA', 'sla-autonomous-resolution',
'Triage decision: within 60 seconds of bundle assembly. Plan generation: within 90 seconds of triage. Execution post-approval: within 30 seconds. Customer notification: within 10 seconds of execution. Total target: under 10 minutes. Maximum: 30 minutes before auto-escalation.')

ON CONFLICT (slug) DO NOTHING;
