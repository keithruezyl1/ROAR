-- Scenario B: Lost parcel — always escalates

INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-20087', 'customer3@demo.com', 'fulfilled', 450.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES
  ('ORD-20087', 'SKU-MEAL-001', 'CP Fresh Meal Box', 3, 150.00)
ON CONFLICT DO NOTHING;

INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-20087', 'Kerry Express', 'KE-20087-TH', 'lost', CURRENT_DATE - INTERVAL '5 days', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location)
VALUES ('SKU-MEAL-001', 'CP Fresh Meal Box', 150, 'BKK-02')
ON CONFLICT (item_id) DO NOTHING;

-- Scenario B2: Delayed delivery — autonomous path
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-20088', 'customer4@demo.com', 'fulfilled', 280.00, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-20088', 'SKU-SNACK-001', 'Snack Bundle Pack', 2, 140.00)
ON CONFLICT DO NOTHING;

INSERT INTO sim_shipments (order_id, carrier, tracking_number, status, estimated_delivery, shipped_at)
VALUES ('ORD-20088', 'Flash Express', 'FL-20088-TH', 'delayed', CURRENT_DATE - INTERVAL '4 days', NOW() - INTERVAL '6 days')
ON CONFLICT DO NOTHING;

INSERT INTO sim_stock_records (item_id, item_name, quantity_available, warehouse_location)
VALUES ('SKU-SNACK-001', 'Snack Bundle Pack', 75, 'BKK-01')
ON CONFLICT (item_id) DO NOTHING;
