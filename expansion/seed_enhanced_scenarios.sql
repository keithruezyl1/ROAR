-- ROAR Enhancement Seed Data
-- 4 new demo scenarios showcasing payment duplicate detection, tracking intelligence, and inventory-based routing

BEGIN;

-- Make this seed re-runnable by clearing existing rows for seeded orders/items.
-- Delete children first to satisfy FK constraints.
WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
),
seeded_items(item_id) AS (
  VALUES
    ('ITEM-099-A'), ('ITEM-099-B'),
    ('ITEM-088-A'),
    ('ITEM-20099-A'),
    ('ITEM-077-A'), ('ITEM-077-B'), ('ITEM-077-C')
)
DELETE FROM sim_tracking_events e
USING sim_shipments s
WHERE e.shipment_id = s.id
  AND s.order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
)
DELETE FROM sim_shipments
WHERE order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
)
DELETE FROM sim_transactions
WHERE order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
)
DELETE FROM sim_order_items
WHERE order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
)
DELETE FROM sim_refund_records
WHERE order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_orders(order_id) AS (
  VALUES
    ('ORD-10099'),
    ('ORD-10088'),
    ('ORD-20099'),
    ('ORD-10077'),
    ('ORD-10042')
)
DELETE FROM sim_orders
WHERE order_id IN (SELECT order_id FROM seeded_orders);

WITH seeded_items(item_id) AS (
  VALUES
    ('ITEM-099-A'), ('ITEM-099-B'),
    ('ITEM-088-A'),
    ('ITEM-20099-A'),
    ('ITEM-077-A'), ('ITEM-077-B'), ('ITEM-077-C')
)
DELETE FROM sim_stock_records
WHERE item_id IN (SELECT item_id FROM seeded_items);

-- ==============================================================================
-- SCENARIO C: Damaged goods replacement (autonomous)
-- Order: ORD-10099
-- Expected flow: Customer wants replacement → inventory check passes → autonomous approval
-- ==============================================================================

-- Order
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at) VALUES
('ORD-10099', 'somchai.rep@demo.com', 'fulfilled', 420.00, '2026-03-20 10:30:00+00', '2026-03-20 10:45:00+00');

-- Order items
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-10099', 'ITEM-099-A', 'Premium Coffee Set', 1, 320.00),
('ORD-10099', 'ITEM-099-B', 'Ceramic Mug', 2, 50.00);

-- Stock records (IN STOCK - replacement feasible)
INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location) VALUES
('ITEM-099-A', 'Premium Coffee Set', 25, 'Bangkok Warehouse A'),
('ITEM-099-B', 'Ceramic Mug', 150, 'Bangkok Warehouse A');

UPDATE sim_stock_records
SET last_updated = '2026-03-20 09:00:00+00'
WHERE item_id IN ('ITEM-099-A', 'ITEM-099-B');

-- Payment (completed, no prior refunds)
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at) VALUES
('ORD-10099', 'confirmed', 420.00, 'credit_card', '2026-03-20 10:35:00+00');

-- Shipment (delivered successfully)
WITH ins AS (
  INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
  VALUES ('ORD-10099', 'Flash Express', 'FE-10099-TH', 'delivered', '2026-03-22', '2026-03-20 15:00:00+00')
  RETURNING id
)
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, event_type, location, event_time
FROM ins, (VALUES
  ('picked_up',  'Bangkok Sorting Hub',      '2026-03-20 16:00:00+00'::timestamptz),
  ('in_transit', 'Central Thailand Hub',    '2026-03-21 08:00:00+00'::timestamptz),
  ('delivered',  'Customer Address',        '2026-03-22 14:30:00+00'::timestamptz)
) AS v(event_type, location, event_time);

-- ==============================================================================
-- SCENARIO D: Wrong item refund (autonomous)
-- Order: ORD-10088
-- Expected flow: Customer wants refund → payment check passes → autonomous refund
-- ==============================================================================

-- Order
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at) VALUES
('ORD-10088', 'nida.wrong@demo.com', 'fulfilled', 280.00, '2026-03-22 14:00:00+00', '2026-03-22 14:15:00+00');

-- Order items
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-10088', 'ITEM-088-A', 'Blue Notebook Set', 2, 140.00);

-- Stock records
INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location, last_updated) VALUES
('ITEM-088-A', 'Blue Notebook Set', 45, 'Bangkok Warehouse B', '2026-03-22 12:00:00+00');

-- Payment (completed, no prior refunds)
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at) VALUES
('ORD-10088', 'confirmed', 280.00, 'digital_wallet', '2026-03-22 14:05:00+00');

-- Shipment (delivered)
WITH ins AS (
  INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
  VALUES ('ORD-10088', 'Jaguar Delivery', 'JD-10088-TH', 'delivered', '2026-03-24', '2026-03-22 18:00:00+00')
  RETURNING id
)
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, event_type, location, event_time
FROM ins, (VALUES
  ('picked_up',  'Bangkok Sorting Hub',   '2026-03-22 19:00:00+00'::timestamptz),
  ('in_transit', 'Bangkok Distribution', '2026-03-23 10:00:00+00'::timestamptz),
  ('delivered',  'Customer Address',     '2026-03-24 11:20:00+00'::timestamptz)
) AS v(event_type, location, event_time);


-- ==============================================================================
-- SCENARIO E: Delivered but not received (escalation) - YOUR DEMO SCENARIO
-- Order: ORD-20099
-- Expected flow: Tracking says delivered → customer disputes → escalate for investigation
-- ==============================================================================

-- Order
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at) VALUES
('ORD-20099', 'apinya.lost@demo.com', 'fulfilled', 380.00, '2026-03-18 09:00:00+00', '2026-03-18 09:20:00+00');

-- Order items
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-20099', 'ITEM-20099-A', 'Wireless Earbuds', 1, 380.00);

-- Stock records
INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location, last_updated) VALUES
('ITEM-20099-A', 'Wireless Earbuds', 12, 'Bangkok Warehouse A', '2026-03-18 08:00:00+00');

-- Payment (completed, no prior refunds)
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at) VALUES
('ORD-20099', 'confirmed', 380.00, 'credit_card', '2026-03-18 09:10:00+00');

-- Shipment (MARKED AS DELIVERED - this is the key conflict)
WITH ins AS (
  INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
  VALUES ('ORD-20099', 'Ultra Ship Express', 'USE-20099-TH', 'delivered', '2026-03-20', '2026-03-18 16:00:00+00')
  RETURNING id
)
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, event_type, location, event_time
FROM ins, (VALUES
  ('picked_up',  'Bangkok Sorting Hub',    '2026-03-18 17:00:00+00'::timestamptz),
  ('in_transit', 'Central Thailand Hub',  '2026-03-19 12:00:00+00'::timestamptz),
  ('delivered',  'Customer Address Area', '2026-03-20 15:45:00+00'::timestamptz) -- DISPUTED
) AS v(event_type, location, event_time);


-- ==============================================================================
-- SCENARIO F: Partial fulfillment refund (autonomous)
-- Order: ORD-10077 (ordered 3 items, received only 2)
-- Expected flow: Customer reports missing item → partial refund for missing item
-- ==============================================================================

-- Order
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at) VALUES
('ORD-10077', 'chanida.partial@demo.com', 'fulfilled', 490.00, '2026-03-21 11:00:00+00', '2026-03-21 11:30:00+00');

-- Order items (3 items ordered)
INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price) VALUES
('ORD-10077', 'ITEM-077-A', 'Desk Lamp', 1, 250.00),
('ORD-10077', 'ITEM-077-B', 'USB Cable Set', 1, 120.00),
('ORD-10077', 'ITEM-077-C', 'Phone Stand', 1, 120.00);

-- Stock records
INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location) VALUES
('ITEM-077-A', 'Desk Lamp', 8, 'Bangkok Warehouse C'),
('ITEM-077-B', 'USB Cable Set', 60, 'Bangkok Warehouse C'),
('ITEM-077-C', 'Phone Stand', 30, 'Bangkok Warehouse C');

UPDATE sim_stock_records
SET last_updated = '2026-03-21 10:00:00+00'
WHERE item_id IN ('ITEM-077-A', 'ITEM-077-B', 'ITEM-077-C');

-- Payment (completed, no prior refunds)
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at) VALUES
('ORD-10077', 'confirmed', 490.00, 'credit_card', '2026-03-21 11:15:00+00');

-- Shipment (delivered but partial)
WITH ins AS (
  INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
  VALUES ('ORD-10077', 'Flash Express', 'FE-10077-TH', 'delivered', '2026-03-23', '2026-03-21 17:00:00+00')
  RETURNING id
)
INSERT INTO sim_tracking_events (shipment_id, event_type, location, event_time)
SELECT id, event_type, location, event_time
FROM ins, (VALUES
  ('picked_up',  'Bangkok Sorting Hub',   '2026-03-21 18:00:00+00'::timestamptz),
  ('in_transit', 'Central Thailand Hub', '2026-03-22 09:00:00+00'::timestamptz),
  ('delivered',  'Customer Address',     '2026-03-23 13:15:00+00'::timestamptz)
) AS v(event_type, location, event_time);


-- ==============================================================================
-- DUPLICATE REFUND TEST SCENARIO (for payment duplicate detection)
-- Order: ORD-10042 (existing scenario) - add a prior refund to test blocking
-- ==============================================================================

-- Ensure ORD-10042 exists (minimal fields) so downstream logic can join it.
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-10042', 'demo.ord10042@demo.com', 'fulfilled', 320.00, '2026-03-10 09:00:00+00', '2026-03-10 12:00:00+00')
ON CONFLICT (order_id) DO NOTHING;

-- Prior refund record for duplicate detection (schema has no transaction_type/transaction_id).
INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-10042', 'refunded', 320.00, 'credit_card', '2026-03-15 10:00:00+00');

-- This makes ORD-10042 a test case for duplicate detection:
-- If customer tries to file another dispute for ORD-10042, triage should block it

COMMIT;
