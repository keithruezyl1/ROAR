-- ============================================================
-- ROAR Engine — Database Wipe Script
-- Wipes all transactional and seeded data EXCEPT policies
-- Safe to run repeatedly during development
-- Run from repo root: psql $DATABASE_URL -f db/scripts/wipe.sql
-- ============================================================

BEGIN;

-- Disable triggers temporarily to avoid FK constraint issues during truncation
SET session_replication_role = 'replica';

-- Wipe all transactional data (generated during disputes)
TRUNCATE TABLE case_reports        RESTART IDENTITY CASCADE;
TRUNCATE TABLE refund_requests     RESTART IDENTITY CASCADE;
TRUNCATE TABLE return_requests     RESTART IDENTITY CASCADE;
TRUNCATE TABLE replacement_requests RESTART IDENTITY CASCADE;
TRUNCATE TABLE chat_messages       RESTART IDENTITY CASCADE;
TRUNCATE TABLE cases               RESTART IDENTITY CASCADE;

-- Wipe all simulated retail source data
TRUNCATE TABLE sim_tracking_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_shipments       RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_refund_records  RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_transactions    RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_order_items     RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_orders          RESTART IDENTITY CASCADE;
TRUNCATE TABLE sim_stock_records   RESTART IDENTITY CASCADE;

-- Wipe users (will be re-seeded)
TRUNCATE TABLE users               RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = 'DEFAULT';

-- Verify policies are untouched
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM policies;
  IF policy_count < 25 THEN
    RAISE EXCEPTION 'Policies table has fewer than 25 records (found %). Run seed/001_policies.sql first.', policy_count;
  END IF;
  RAISE NOTICE 'Wipe complete. Policies intact: % records.', policy_count;
END $$;

COMMIT;
