-- Scenario A: Standard refund — all triage rules pass
-- Order ORD-10042, ฿320, fulfilled, no prior refund, within 7 days

INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-10042', 'customer@demo.com', 'fulfilled', 320.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-10042', 'SKU-COFFEE-001', 'Premium Coffee Set', 1, 320.00)
ON CONFLICT DO NOTHING;

INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-10042', 'confirmed', 320.00, 'credit_card', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Scenario A2: High-value refund — escalates (amount > 500)
INSERT INTO sim_orders (order_id, customer_email, status, total_amount, created_at, fulfilled_at)
VALUES ('ORD-10043', 'customer2@demo.com', 'fulfilled', 850.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO sim_order_items (order_id, item_id, item_name, quantity, unit_price)
VALUES ('ORD-10043', 'SKU-ELEC-001', 'Wireless Earbuds', 1, 850.00)
ON CONFLICT DO NOTHING;

INSERT INTO sim_transactions (order_id, status, amount, payment_method, transacted_at)
VALUES ('ORD-10043', 'confirmed', 850.00, 'credit_card', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
