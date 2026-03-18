-- Performance indexes

CREATE INDEX idx_cases_order_id ON cases(order_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_dispute_type ON cases(dispute_type);
CREATE INDEX idx_chat_messages_case_id ON chat_messages(case_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_sim_orders_order_id ON sim_orders(order_id);
CREATE INDEX idx_sim_transactions_order_id ON sim_transactions(order_id);
CREATE INDEX idx_sim_shipments_order_id ON sim_shipments(order_id);
CREATE INDEX idx_policies_slug ON policies(slug);
CREATE INDEX idx_policies_category ON policies(category);

