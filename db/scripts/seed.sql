-- ============================================================
-- ROAR Engine — E2E Seed Script v1 (DBeaver compatible)
-- Run AFTER wipe.sql
-- Select All (Ctrl+A) then Execute Script (Alt+X)
-- ============================================================
--
-- MATRIX COVERAGE LEGEND:
--   A-REF   = Autonomous      / refund       (amount ≤ ฿500)
--   A-REP   = Autonomous      / replacement  (amount ≤ ฿500 + in stock)
--   AP-REF  = Awaiting Appvl  / refund       (amount > ฿500)
--   AP-REP  = Awaiting Appvl  / replacement  (amount > ฿500 or in stock)
--   AP-RET  = Awaiting Appvl  / return       (within window, never autonomous)
--   ESC     = Escalation
--   G1      = Global pre-check: prior refund exists (duplicate)
--   G2      = Global pre-check: payment not confirmed
--   G3      = Global pre-check: delivered-but-disputed (non_receipt/lost)
--
-- ACCOUNTS (all password: password123)
--   sarah.miller@demo.com   (001) — refund lane scenarios
--   james.wong@demo.com     (002) — delivery lane scenarios
--   priya.sharma@demo.com   (003) — return / edge cases
--   somchai.rep@demo.com    (006) — replacement scenarios
--   nida.wrong@demo.com     (007) — wrong_item scenarios
--   apinya.lost@demo.com    (008) — non_receipt / lost scenarios
--   chanida.partial@demo.com(009) — partial_fulfillment / other
--   approver@roar.app       (004) — PRESERVED by wipe, not re-seeded
--   escalation@roar.app     (005) — PRESERVED by wipe, not re-seeded
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1 — INVENTORY
-- 10 in-stock items + 1 zero-stock for out-of-stock ESC test
-- ────────────────────────────────────────────────────────────

INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location) VALUES
('SKU-COFFEE-001',   'Premium Coffee Set (250g)',          142, 'BKK-01'),
('SKU-SNACK-001',    'Assorted Snack Bundle (12 packs)',    89, 'BKK-01'),
('SKU-EARBUDS-001',  'Wireless Earbuds Pro',                34, 'BKK-02'),
('SKU-TSHIRT-001',   'Classic Cotton T-Shirt (M)',         215, 'BKK-01'),
('SKU-TSHIRT-002',   'Classic Cotton T-Shirt (L)',         198, 'BKK-01'),
('SKU-SKINCARE-001', 'Brightening Face Serum (30ml)',       67, 'BKK-02'),
('SKU-NOTEBOOK-001', 'Premium Hardcover Notebook A5',      310, 'BKK-03'),
('SKU-BOTTLE-001',   'Insulated Water Bottle 750ml',       124, 'BKK-02'),
('SKU-MEAL-001',     'CP Fresh Meal Box (Variety)',         75, 'BKK-01'),
('SKU-CHARGER-001',  'USB-C Fast Charger 65W',              52, 'BKK-02'),
('SKU-GADGET-001',   'Smart Fitness Tracker Band',           0, 'BKK-02')  -- OUT OF STOCK → ESC path
ON CONFLICT (item_id) DO UPDATE SET quantity_available = EXCLUDED.quantity_available;

-- ────────────────────────────────────────────────────────────
-- SECTION 2 — CUSTOMERS
-- Agents (004, 005) are preserved by wipe — not re-inserted here
-- ────────────────────────────────────────────────────────────

INSERT INTO users (id, email, hashed_password, role, full_name) VALUES
('a1000000-0000-0000-0000-000000000001', 'sarah.miller@demo.com',    '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Sarah Miller'),
('a1000000-0000-0000-0000-000000000002', 'james.wong@demo.com',      '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'James Wong'),
('a1000000-0000-0000-0000-000000000003', 'priya.sharma@demo.com',    '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Priya Sharma'),
('a1000000-0000-0000-0000-000000000006', 'somchai.rep@demo.com',     '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Somchai Replacement'),
('a1000000-0000-0000-0000-000000000007', 'nida.wrong@demo.com',      '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Nida Wrongitem'),
('a1000000-0000-0000-0000-000000000008', 'apinya.lost@demo.com',     '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Apinya Notreceived'),
('a1000000-0000-0000-0000-000000000009', 'chanida.partial@demo.com', '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Chanida Partial')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- SECTION 3 — SARAH MILLER: Refund lane (standard paths)
-- ════════════════════════════════════════════════════════════

-- ORD-1001 | not_as_described | refund | ฿320 ≤ 500 | within window
-- Expected → A-REF: autonomous / refund
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-1001', 'sarah.miller@demo.com', 'fulfilled', 320.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-1001', 'SKU-COFFEE-001', 'Premium Coffee Set (250g)', 1, 320.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-1001', 'confirmed', 320.00, 'credit_card', NOW() - INTERVAL '3 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-1001', 'Ultra Ship Express', 'USE-1001-TH', 'delivered', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '2 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-1001' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '1 day'  FROM sim_shipments WHERE order_id = 'ORD-1001';

-- ORD-1002 | not_as_described | refund | ฿850 > 500 | within window
-- Expected → AP-REF: awaiting_approval / refund
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-1002', 'sarah.miller@demo.com', 'fulfilled', 850.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-1002', 'SKU-EARBUDS-001', 'Wireless Earbuds Pro', 1, 850.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-1002', 'confirmed', 850.00, 'credit_card', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-1002', 'Jaguar Delivery', 'JD-1002-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-1002' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-1002';

-- ORD-1003 | not_as_described | refund | ฿320 | OUTSIDE 7-day window (delivered 11 days ago)
-- Expected → ESC: escalation / refund (outside return window)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-1003', 'sarah.miller@demo.com', 'fulfilled', 320.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-1003', 'SKU-COFFEE-001', 'Premium Coffee Set (250g)', 1, 320.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-1003', 'confirmed', 320.00, 'credit_card', NOW() - INTERVAL '15 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-1003', 'Ultra Ship Express', 'USE-1003-TH', 'delivered', (NOW() - INTERVAL '12 days')::date, NOW() - INTERVAL '13 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '13 days' FROM sim_shipments WHERE order_id = 'ORD-1003' UNION ALL
SELECT id, 'in_transit', 'Bangkok Distribution', NOW() - INTERVAL '12 days' FROM sim_shipments WHERE order_id = 'ORD-1003' UNION ALL
SELECT id, 'delivered',  'Customer Address',     NOW() - INTERVAL '11 days' FROM sim_shipments WHERE order_id = 'ORD-1003';

-- ORD-1004 | duplicate_charge | refund | ฿200 ≤ 500 | PRIOR REFUND EXISTS
-- Expected → ESC: escalation / refund (G1 duplicate refund detection)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-1004', 'sarah.miller@demo.com', 'fulfilled', 200.00, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-1004', 'SKU-SNACK-001', 'Assorted Snack Bundle (12 packs)', 1, 200.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-1004', 'confirmed', 200.00, 'credit_card', NOW() - INTERVAL '4 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-1004', 'Ultra Ship Express', 'USE-1004-TH', 'delivered', (NOW() - INTERVAL '2 days')::date, NOW() - INTERVAL '3 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '3 days' FROM sim_shipments WHERE order_id = 'ORD-1004' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-1004';
-- Prior refund to trigger G1
INSERT INTO sim_refund_records (order_id, amount, status, refunded_at)
VALUES ('ORD-1004', 200.00, 'completed', NOW() - INTERVAL '1 day');

-- ORD-1005 | not_as_described | refund | ฿320 | PAYMENT NOT CONFIRMED
-- Expected → ESC: escalation / refund (G2 payment not confirmed)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-1005', 'sarah.miller@demo.com', 'fulfilled', 320.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-1005', 'SKU-NOTEBOOK-001', 'Premium Hardcover Notebook A5', 1, 320.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-1005', 'pending', 320.00, 'bank_transfer', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-1005', 'Jaguar Delivery', 'JD-1005-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-1005' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-1005';

-- ════════════════════════════════════════════════════════════
-- SECTION 4 — JAMES WONG: Delivery lane
-- ════════════════════════════════════════════════════════════

-- ORD-2001 | non_receipt | refund | in_transit 9 days | NOT delivered
-- Expected → A-REF: autonomous / refund (in_transit > 7 days, not delivered)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-2001', 'james.wong@demo.com', 'fulfilled', 380.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-2001', 'SKU-BOTTLE-001', 'Insulated Water Bottle 750ml', 1, 380.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-2001', 'confirmed', 380.00, 'promptpay', NOW() - INTERVAL '10 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-2001', 'Ultra Ship Express', 'USE-2001-TH', 'in_transit', (NOW() - INTERVAL '3 days')::date, NOW() - INTERVAL '9 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '9 days' FROM sim_shipments WHERE order_id = 'ORD-2001' UNION ALL
SELECT id, 'in_transit', 'Central Thailand Hub', NOW() - INTERVAL '7 days' FROM sim_shipments WHERE order_id = 'ORD-2001';

-- ORD-2002 | delayed | refund | exception event | NOT delivered
-- Expected → A-REF: autonomous / refund (exception event exists and not delivered)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-2002', 'james.wong@demo.com', 'fulfilled', 420.00, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-2002', 'SKU-CHARGER-001', 'USB-C Fast Charger 65W', 1, 420.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-2002', 'confirmed', 420.00, 'credit_card', NOW() - INTERVAL '8 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-2002', 'Jaguar Delivery', 'JD-2002-TH', 'delayed', (NOW() - INTERVAL '4 days')::date, NOW() - INTERVAL '7 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',    NOW() - INTERVAL '7 days' FROM sim_shipments WHERE order_id = 'ORD-2002' UNION ALL
SELECT id, 'in_transit', 'Northeast Thailand Hub', NOW() - INTERVAL '6 days' FROM sim_shipments WHERE order_id = 'ORD-2002' UNION ALL
SELECT id, 'exception',  'Northeast Thailand Hub', NOW() - INTERVAL '5 days' FROM sim_shipments WHERE order_id = 'ORD-2002';

-- ORD-2003 | non_receipt | refund | DELIVERED per tracking (G3 conflict)
-- Expected → ESC: escalation / refund + tracking_evidence (G3)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-2003', 'james.wong@demo.com', 'fulfilled', 450.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-2003', 'SKU-MEAL-001', 'CP Fresh Meal Box (Variety)', 3, 150.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-2003', 'confirmed', 450.00, 'credit_card', NOW() - INTERVAL '5 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-2003', 'Ultra Ship Express', 'USE-2003-TH', 'delivered', (NOW() - INTERVAL '2 days')::date, NOW() - INTERVAL '4 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '4 days' FROM sim_shipments WHERE order_id = 'ORD-2003' UNION ALL
SELECT id, 'in_transit', 'Bangkok Distribution', NOW() - INTERVAL '3 days' FROM sim_shipments WHERE order_id = 'ORD-2003' UNION ALL
SELECT id, 'delivered',  'Customer Address – Signed by recipient', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-2003';

-- ORD-2004 | lost | refund | lost + exception events | NOT delivered
-- Expected → ESC: escalation / refund (lost → always escalation)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-2004', 'james.wong@demo.com', 'fulfilled', 350.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-2004', 'SKU-TSHIRT-001', 'Classic Cotton T-Shirt (M)', 1, 350.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-2004', 'confirmed', 350.00, 'digital_wallet', NOW() - INTERVAL '12 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-2004', 'Jaguar Delivery', 'JD-2004-TH', 'lost', (NOW() - INTERVAL '7 days')::date, NOW() - INTERVAL '10 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '10 days' FROM sim_shipments WHERE order_id = 'ORD-2004' UNION ALL
SELECT id, 'in_transit', 'Central Thailand Hub', NOW() - INTERVAL '9 days'  FROM sim_shipments WHERE order_id = 'ORD-2004' UNION ALL
SELECT id, 'exception',  'Unknown Location',     NOW() - INTERVAL '8 days'  FROM sim_shipments WHERE order_id = 'ORD-2004';

-- ORD-2005 | delayed | refund | in_transit 3 days | no exception | EDD 1 day ago
-- Expected → ESC: escalation / refund (no exception, in_transit < 7 days, not delivered)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-2005', 'james.wong@demo.com', 'fulfilled', 290.00, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-2005', 'SKU-TSHIRT-002', 'Classic Cotton T-Shirt (L)', 1, 290.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-2005', 'confirmed', 290.00, 'promptpay', NOW() - INTERVAL '4 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-2005', 'Ultra Ship Express', 'USE-2005-TH', 'delayed', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '3 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '3 days' FROM sim_shipments WHERE order_id = 'ORD-2005' UNION ALL
SELECT id, 'in_transit', 'Central Thailand Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-2005';

-- ════════════════════════════════════════════════════════════
-- SECTION 5 — PRIYA SHARMA: Return lane + damaged goods edge
-- ════════════════════════════════════════════════════════════

-- ORD-3001 | return_request | ฿450 | within window | fulfilled status
-- Expected → AP-RET: awaiting_approval / return (never autonomous, physical inspection required)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-3001', 'priya.sharma@demo.com', 'fulfilled', 450.00, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-3001', 'SKU-SKINCARE-001', 'Brightening Face Serum (30ml)', 1, 450.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-3001', 'confirmed', 450.00, 'digital_wallet', NOW() - INTERVAL '4 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-3001', 'Ultra Ship Express', 'USE-3001-TH', 'delivered', (NOW() - INTERVAL '2 days')::date, NOW() - INTERVAL '3 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '3 days' FROM sim_shipments WHERE order_id = 'ORD-3001' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-3001';

-- ORD-3002 | changed_mind | ฿380 | OUTSIDE 7-day window (delivered 9 days ago)
-- Expected → ESC: escalation / return (outside window)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-3002', 'priya.sharma@demo.com', 'fulfilled', 380.00, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-3002', 'SKU-BOTTLE-001', 'Insulated Water Bottle 750ml', 1, 380.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-3002', 'confirmed', 380.00, 'credit_card', NOW() - INTERVAL '12 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-3002', 'Jaguar Delivery', 'JD-3002-TH', 'delivered', (NOW() - INTERVAL '9 days')::date, NOW() - INTERVAL '10 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '10 days' FROM sim_shipments WHERE order_id = 'ORD-3002' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '9 days'  FROM sim_shipments WHERE order_id = 'ORD-3002';

-- ORD-3003 | damaged_goods | refund | ฿450 ≤ 500 | within window | no prior refund
-- Expected → A-REF: autonomous / refund (damaged_goods + refund ≤ 500 + within window)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-3003', 'priya.sharma@demo.com', 'fulfilled', 450.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-3003', 'SKU-CHARGER-001', 'USB-C Fast Charger 65W', 1, 450.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-3003', 'confirmed', 450.00, 'credit_card', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-3003', 'Ultra Ship Express', 'USE-3003-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-3003' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-3003';

-- ORD-3004 | partial_fulfillment | ฿700 | multi-item | within window
-- Expected → ESC: escalation / refund (partial_fulfillment → always escalation)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-3004', 'priya.sharma@demo.com', 'fulfilled', 700.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-3004', 'SKU-TSHIRT-001',   'Classic Cotton T-Shirt (M)',    1, 290.00),
('ORD-3004', 'SKU-TSHIRT-002',   'Classic Cotton T-Shirt (L)',    1, 290.00),
('ORD-3004', 'SKU-NOTEBOOK-001', 'Premium Hardcover Notebook A5', 1, 120.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-3004', 'confirmed', 700.00, 'credit_card', NOW() - INTERVAL '3 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-3004', 'Jaguar Delivery', 'JD-3004-TH', 'delivered', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '2 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-3004' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '1 day'  FROM sim_shipments WHERE order_id = 'ORD-3004';

-- ════════════════════════════════════════════════════════════
-- SECTION 6 — SOMCHAI REPLACEMENT: Replacement lane
-- ════════════════════════════════════════════════════════════

-- ORD-4001 | not_as_described | replacement | ฿350 ≤ 500 | in stock
-- Expected → A-REP: autonomous / replacement
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-4001', 'somchai.rep@demo.com', 'fulfilled', 350.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-4001', 'SKU-COFFEE-001', 'Premium Coffee Set (250g)', 1, 350.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-4001', 'confirmed', 350.00, 'credit_card', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-4001', 'Ultra Ship Express', 'USE-4001-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-4001' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-4001';

-- ORD-4002 | wrong_item | replacement | ฿650 > 500 | in stock
-- Expected → AP-REP: awaiting_approval / replacement
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-4002', 'somchai.rep@demo.com', 'fulfilled', 650.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-4002', 'SKU-EARBUDS-001', 'Wireless Earbuds Pro', 1, 650.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-4002', 'confirmed', 650.00, 'credit_card', NOW() - INTERVAL '3 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-4002', 'Jaguar Delivery', 'JD-4002-TH', 'delivered', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '2 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-4002' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '1 day'  FROM sim_shipments WHERE order_id = 'ORD-4002';

-- ORD-4003 | damaged_goods | replacement | ฿300 | within window
-- Expected → ESC: escalation / replacement (damaged_goods + replacement → ALWAYS escalation)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-4003', 'somchai.rep@demo.com', 'fulfilled', 300.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-4003', 'SKU-NOTEBOOK-001', 'Premium Hardcover Notebook A5', 1, 300.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-4003', 'confirmed', 300.00, 'promptpay', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-4003', 'Ultra Ship Express', 'USE-4003-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-4003' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-4003';

-- ════════════════════════════════════════════════════════════
-- SECTION 7 — NIDA WRONGITEM: wrong_item variations
-- ════════════════════════════════════════════════════════════

-- ORD-5001 | wrong_item | refund | ฿290 ≤ 500 | within window
-- Expected → A-REF: autonomous / refund
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-5001', 'nida.wrong@demo.com', 'fulfilled', 290.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-5001', 'SKU-TSHIRT-001', 'Classic Cotton T-Shirt (M)', 1, 290.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-5001', 'confirmed', 290.00, 'credit_card', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-5001', 'Jaguar Delivery', 'JD-5001-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-5001' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-5001';

-- ORD-5002 | wrong_item | replacement | ฿290 ≤ 500 | IN STOCK (SKU-TSHIRT-001, qty 215)
-- Expected → A-REP: autonomous / replacement
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-5002', 'nida.wrong@demo.com', 'fulfilled', 290.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-5002', 'SKU-TSHIRT-001', 'Classic Cotton T-Shirt (M)', 1, 290.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-5002', 'confirmed', 290.00, 'promptpay', NOW() - INTERVAL '3 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-5002', 'Ultra Ship Express', 'USE-5002-TH', 'delivered', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '2 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-5002' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '1 day'  FROM sim_shipments WHERE order_id = 'ORD-5002';

-- ORD-5003 | wrong_item | replacement | ฿290 ≤ 500 | OUT OF STOCK (SKU-GADGET-001, qty 0)
-- Expected → ESC: escalation / replacement (out of stock)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-5003', 'nida.wrong@demo.com', 'fulfilled', 290.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-5003', 'SKU-GADGET-001', 'Smart Fitness Tracker Band', 1, 290.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-5003', 'confirmed', 290.00, 'digital_wallet', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-5003', 'Jaguar Delivery', 'JD-5003-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-5003' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-5003';

-- ════════════════════════════════════════════════════════════
-- SECTION 8 — APINYA NOTRECEIVED: non_receipt / lost paths
-- ════════════════════════════════════════════════════════════

-- ORD-6001 | non_receipt | refund | DELIVERED per tracking (G3 conflict)
-- Expected → ESC: escalation / refund + tracking_evidence (G3)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-6001', 'apinya.lost@demo.com', 'fulfilled', 420.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-6001', 'SKU-SKINCARE-001', 'Brightening Face Serum (30ml)', 1, 420.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-6001', 'confirmed', 420.00, 'credit_card', NOW() - INTERVAL '5 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-6001', 'Ultra Ship Express', 'USE-6001-TH', 'delivered', (NOW() - INTERVAL '2 days')::date, NOW() - INTERVAL '4 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '4 days' FROM sim_shipments WHERE order_id = 'ORD-6001' UNION ALL
SELECT id, 'in_transit', 'Bangkok Distribution', NOW() - INTERVAL '3 days' FROM sim_shipments WHERE order_id = 'ORD-6001' UNION ALL
SELECT id, 'delivered',  'Customer Address – Signed by A. Notreceived', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-6001';

-- ORD-6002 | non_receipt | replacement | NOT delivered | inventory feasible (SKU-SKINCARE-001, qty 67)
-- Expected → AP-REP: awaiting_approval / replacement
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-6002', 'apinya.lost@demo.com', 'fulfilled', 420.00, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-6002', 'SKU-SKINCARE-001', 'Brightening Face Serum (30ml)', 1, 420.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-6002', 'confirmed', 420.00, 'digital_wallet', NOW() - INTERVAL '8 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-6002', 'Jaguar Delivery', 'JD-6002-TH', 'in_transit', (NOW() - INTERVAL '3 days')::date, NOW() - INTERVAL '7 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '7 days' FROM sim_shipments WHERE order_id = 'ORD-6002' UNION ALL
SELECT id, 'in_transit', 'Central Thailand Hub', NOW() - INTERVAL '5 days' FROM sim_shipments WHERE order_id = 'ORD-6002';

-- ORD-6003 | lost | refund | lost status confirmed
-- Expected → ESC: escalation / refund (lost → always escalation per policy)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-6003', 'apinya.lost@demo.com', 'fulfilled', 480.00, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-6003', 'SKU-EARBUDS-001', 'Wireless Earbuds Pro', 1, 480.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-6003', 'confirmed', 480.00, 'credit_card', NOW() - INTERVAL '14 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-6003', 'Ultra Ship Express', 'USE-6003-TH', 'lost', (NOW() - INTERVAL '8 days')::date, NOW() - INTERVAL '12 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up',  'Bangkok Sorting Hub',  NOW() - INTERVAL '12 days' FROM sim_shipments WHERE order_id = 'ORD-6003' UNION ALL
SELECT id, 'in_transit', 'Central Thailand Hub', NOW() - INTERVAL '11 days' FROM sim_shipments WHERE order_id = 'ORD-6003' UNION ALL
SELECT id, 'exception',  'Unknown Location',     NOW() - INTERVAL '10 days' FROM sim_shipments WHERE order_id = 'ORD-6003';

-- ════════════════════════════════════════════════════════════
-- SECTION 9 — CHANIDA PARTIAL: partial_fulfillment + other
-- ════════════════════════════════════════════════════════════

-- ORD-7001 | partial_fulfillment | ฿580 | multi-item | within window
-- Expected → ESC: escalation / refund (partial_fulfillment → always escalation)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-7001', 'chanida.partial@demo.com', 'fulfilled', 580.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-7001', 'SKU-COFFEE-001',   'Premium Coffee Set (250g)',          1, 320.00),
('ORD-7001', 'SKU-NOTEBOOK-001', 'Premium Hardcover Notebook A5',      1, 120.00),
('ORD-7001', 'SKU-SNACK-001',    'Assorted Snack Bundle (12 packs)',    1, 140.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-7001', 'confirmed', 580.00, 'credit_card', NOW() - INTERVAL '3 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-7001', 'Jaguar Delivery', 'JD-7001-TH', 'delivered', (NOW() - INTERVAL '1 day')::date, NOW() - INTERVAL '2 days');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '2 days' FROM sim_shipments WHERE order_id = 'ORD-7001' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW() - INTERVAL '1 day'  FROM sim_shipments WHERE order_id = 'ORD-7001';

-- ORD-7002 | other | ฿200 | within window
-- Expected → ESC: escalation / refund (other → always escalation, uncategorized dispute)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-7002', 'chanida.partial@demo.com', 'fulfilled', 200.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-7002', 'SKU-SNACK-001', 'Assorted Snack Bundle (12 packs)', 1, 200.00);
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-7002', 'confirmed', 200.00, 'promptpay', NOW() - INTERVAL '2 days');
INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-7002', 'Ultra Ship Express', 'USE-7002-TH', 'delivered', NOW()::date, NOW() - INTERVAL '1 day');
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, 'picked_up', 'Bangkok Sorting Hub', NOW() - INTERVAL '1 day' FROM sim_shipments WHERE order_id = 'ORD-7002' UNION ALL
SELECT id, 'delivered', 'Customer Address',    NOW()                    FROM sim_shipments WHERE order_id = 'ORD-7002';

-- ════════════════════════════════════════════════════════════
-- VERIFY
-- ════════════════════════════════════════════════════════════

SELECT 'users (total)'                  AS tbl, COUNT(*) AS count FROM users
UNION ALL SELECT 'users (customers)',            COUNT(*) FROM users WHERE role = 'customer'
UNION ALL SELECT 'users (agents)',               COUNT(*) FROM users WHERE role IN ('approver', 'escalation')
UNION ALL SELECT 'sim_stock_records',            COUNT(*) FROM sim_stock_records
UNION ALL SELECT 'sim_orders',                   COUNT(*) FROM sim_orders
UNION ALL SELECT 'sim_order_items',              COUNT(*) FROM sim_order_items
UNION ALL SELECT 'sim_transactions',             COUNT(*) FROM sim_transactions
UNION ALL SELECT 'sim_shipments',                COUNT(*) FROM sim_shipments
UNION ALL SELECT 'sim_tracking_events',          COUNT(*) FROM sim_tracking_events
UNION ALL SELECT 'sim_refund_records (G1 seed)', COUNT(*) FROM sim_refund_records
UNION ALL SELECT 'policies (untouched)',          COUNT(*) FROM policies;
