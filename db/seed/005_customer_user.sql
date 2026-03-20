INSERT INTO users (email, hashed_password, role, full_name) VALUES
('customer@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMBJWnBwVMNiIGKKQGQ5VX3X2i', 'customer', 'Demo Customer')
ON CONFLICT (email) DO NOTHING;

-- Link existing sim_orders to this customer email
UPDATE sim_orders SET customer_email = 'customer@demo.com'
WHERE order_id IN ('ORD-10042', 'ORD-10043', 'ORD-20087', 'ORD-20088');
