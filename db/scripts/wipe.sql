-- ============================================================
-- ROAR Engine — Database Wipe Script v5 (DBeaver compatible)
-- Preserves: policies, approver and escalation users
-- Wipes: all transactional data + customer users + sim data
-- Re-seeds: 7 fixed customer users after wipe
-- Reserved IDs: 004 = approver, 005 = escalation
-- Select All (Ctrl+A) then Execute Script (Alt+X)
-- ============================================================

-- Step 1: Drop all foreign key constraints temporarily
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) ||
                ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Step 2: Truncate all transactional and sim tables
TRUNCATE TABLE case_proof_uploads;
TRUNCATE TABLE case_reports;
TRUNCATE TABLE refund_requests;
TRUNCATE TABLE return_requests;
TRUNCATE TABLE replacement_requests;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE cases;
TRUNCATE TABLE sim_tracking_events;
TRUNCATE TABLE sim_shipments;
TRUNCATE TABLE sim_refund_records;
TRUNCATE TABLE sim_transactions;
TRUNCATE TABLE sim_order_items;
TRUNCATE TABLE sim_orders;
TRUNCATE TABLE sim_stock_records;

-- Step 3: Delete ONLY customer users — approver and escalation agents are preserved
DELETE FROM users WHERE role = 'customer';

-- Step 4: Re-seed fixed customer users (after wipe so they survive)
-- Customer IDs intentionally skip 004 and 005 because those belong to preserved agent users.
INSERT INTO users (id, email, hashed_password, role, full_name) VALUES
('a1000000-0000-0000-0000-000000000001', 'sarah.miller@demo.com',    '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Sarah Miller'),
('a1000000-0000-0000-0000-000000000002', 'james.wong@demo.com',      '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'James Wong'),
('a1000000-0000-0000-0000-000000000003', 'priya.sharma@demo.com',    '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Priya Sharma'),
('a1000000-0000-0000-0000-000000000006', 'somchai.rep@demo.com',     '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Somchai Replacement'),
('a1000000-0000-0000-0000-000000000007', 'nida.wrong@demo.com',      '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Nida Wrongitem'),
('a1000000-0000-0000-0000-000000000008', 'apinya.lost@demo.com',     '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Apinya Notreceived'),
('a1000000-0000-0000-0000-000000000009', 'chanida.partial@demo.com', '$2b$12$0mzsTbXGuYGbG/qScj9ymuyxxUQJpIT0gJqdC3F6VtUdz0k0x1kVu', 'customer', 'Chanida Partial')
ON CONFLICT (id) DO NOTHING;

-- Step 5: Recreate foreign key constraints
ALTER TABLE cases
    ADD CONSTRAINT cases_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES users(id);

ALTER TABLE cases
    ADD CONSTRAINT cases_customer_user_id_fkey
    FOREIGN KEY (customer_user_id) REFERENCES users(id);

ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id);

ALTER TABLE refund_requests
    ADD CONSTRAINT refund_requests_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE return_requests
    ADD CONSTRAINT return_requests_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE replacement_requests
    ADD CONSTRAINT replacement_requests_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE case_reports
    ADD CONSTRAINT case_reports_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE case_proof_uploads
    ADD CONSTRAINT case_proof_uploads_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES cases(id);

ALTER TABLE sim_order_items
    ADD CONSTRAINT sim_order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sim_orders(order_id);

ALTER TABLE sim_transactions
    ADD CONSTRAINT sim_transactions_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sim_orders(order_id);

ALTER TABLE sim_refund_records
    ADD CONSTRAINT sim_refund_records_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sim_orders(order_id);

ALTER TABLE sim_shipments
    ADD CONSTRAINT sim_shipments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES sim_orders(order_id);

ALTER TABLE sim_tracking_events
    ADD CONSTRAINT sim_tracking_events_shipment_id_fkey
    FOREIGN KEY (shipment_id) REFERENCES sim_shipments(id);

-- Step 6: Verify
SELECT 'users (total)'         AS tbl, COUNT(*) AS remaining FROM users
UNION ALL
SELECT 'users (agents)',                COUNT(*) FROM users WHERE role IN ('approver', 'escalation')
UNION ALL
SELECT 'users (customers)',             COUNT(*) FROM users WHERE role = 'customer'
UNION ALL
SELECT 'sim_orders',                    COUNT(*) FROM sim_orders
UNION ALL
SELECT 'cases',                         COUNT(*) FROM cases
UNION ALL
SELECT 'chat_messages',                 COUNT(*) FROM chat_messages
UNION ALL
SELECT 'replacement_requests',          COUNT(*) FROM replacement_requests
UNION ALL
SELECT 'case_proof_uploads',            COUNT(*) FROM case_proof_uploads
UNION ALL
SELECT 'policies (KEPT)',               COUNT(*) FROM policies;
