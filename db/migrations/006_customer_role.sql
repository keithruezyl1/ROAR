-- Add customer as valid role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('approver', 'escalation', 'customer'));

-- Add customer_user_id to cases so customers can see their own cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id);
