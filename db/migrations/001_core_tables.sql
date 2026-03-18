-- Core application tables
-- Run first

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('approver', 'escalation')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL,
    dispute_type TEXT NOT NULL CHECK (dispute_type IN ('refund', 'delivery')),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    intake_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_triage',
    resolution_path TEXT CHECK (resolution_path IN ('autonomous', 'escalation')),
    assigned_to UUID REFERENCES users(id),
    triage_decision JSONB,
    information_bundle JSONB,
    resolution_plan JSONB,
    rejection_reason TEXT,
    escalation_summary TEXT,
    last_customer_message_at TIMESTAMPTZ,
    closed_by TEXT CHECK (closed_by IN ('customer', 'agent', 'timeout')),
    close_reason TEXT CHECK (close_reason IN ('resolved', 'unresponsive', 'duplicate')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('store', 'payment', 'return', 'delivery', 'sla')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

