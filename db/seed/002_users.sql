-- Demo users for hackathon
-- Passwords are bcrypt hashed ''password123''
INSERT INTO users (email, hashed_password, role, full_name) VALUES
('approver@roar.app', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMBJWnBwVMNiIGKKQGQ5VX3X2i', 'approver', 'Alex Chen'),
('escalation@roar.app', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMBJWnBwVMNiIGKKQGQ5VX3X2i', 'escalation', 'Sam Rivera')
ON CONFLICT (email) DO NOTHING;

