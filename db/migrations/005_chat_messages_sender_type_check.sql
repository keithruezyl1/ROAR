-- Ensure chat_messages.sender_type CHECK constraint supports all sender types.
--
-- This repo's baseline schema (001_core_tables.sql) already defines:
--   sender_type IN ('customer','ai','agent','system')
-- but local databases may have been created with an older constraint.
--
-- This migration is idempotent: it drops any existing CHECK constraint that
-- references chat_messages.sender_type and recreates a canonical one.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'chat_messages'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%sender_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_messages DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Create a canonical constraint name. If it already exists, this will no-op.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con2
    JOIN pg_class rel2 ON rel2.oid = con2.conrelid
    JOIN pg_namespace nsp2 ON nsp2.oid = rel2.relnamespace
    WHERE nsp2.nspname = 'public'
      AND rel2.relname = 'chat_messages'
      AND con2.conname = 'chat_messages_sender_type_check'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_sender_type_check
      CHECK (sender_type IN ('customer', 'ai', 'agent', 'system'));
  END IF;
END $$;

