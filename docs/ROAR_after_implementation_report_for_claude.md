# ROAR Engine — After Implementation Report (for Claude)

**Date:** 2026-03-19  
**Scope:** Implemented the remaining “Claude feedback fixes” plan items (backend + DB migration + docs + live n8n sender_type restoration).  
**Goal:** Confirm the codebase and live n8n instance now match the intended architecture and unblock frontend wiring.

---

## 1) Summary of what’s now implemented

### A) Backend: `sender_type` alignment (4 types)
**Implemented:** FastAPI `POST /cases/{case_id}/messages` now accepts all four sender types:

- `customer`
- `ai`
- `agent`
- `system`

**Auth rules preserved:**
- `agent` requires a JWT (existing behavior)
- `customer|ai|system` are allowed without JWT (so n8n can post AI/system messages)

**Sender ID semantics preserved:**
- `agent` messages: `sender_id` comes from JWT subject
- others: `sender_id` remains `NULL`

**File:** `api/routers/messages.py`

---

### B) DB: `chat_messages.sender_type` CHECK constraint alignment (idempotent migration)
**Implemented:** Added a new migration that:
- finds any existing CHECK constraint referencing `chat_messages.sender_type` and drops it
- recreates a canonical CHECK constraint:
  - `sender_type IN ('customer','ai','agent','system')`
- idempotent across different prior DB states

**File:** `db/migrations/005_chat_messages_sender_type_check.sql`

---

### C) Backend: WF1 auto-trigger bridge from customer messages (frontend wiring critical)
**Implemented:** After writing a customer message to the DB, FastAPI automatically triggers WF1 *only while* the case remains in `pending_triage`.

**Sole gate (intentional):**
- WF1 auto-trigger happens only when:
  - `payload.sender_type == "customer"` AND
  - `case.status == "pending_triage"`

Once case leaves `pending_triage` (e.g., `awaiting_approval`, `escalated_human_required`), subsequent customer messages **will not retrigger WF1**.

**Trigger path format (corrected):**
- Calls `trigger_workflow("case-created", payload)` (bare path only; no `/webhooks/` prefix).

**Payload correctness (corrected):**
- uses `case.intake_message` for `intake_message` (not `message.content`)

**File:** `api/routers/messages.py` (uses `api/services/n8n.py`)

---

### D) Backend: JWT expiry reverted for demo safety
**Implemented:** `jwt_expire_minutes` set to **480** (8 hours).

**File:** `api/config.py`

---

### E) Docs: final-review doc created + session report updated without rewriting
**Implemented:**
- Added a canonical final review / handoff doc with:
  - “what went right”
  - “what must be fixed before demo”
  - frontend wiring points (the 4 calls)
  - demo checklist
- Updated the existing session report to reference this doc as the source-of-truth (without rewriting it).

**Files:**
- `docs/ROAR_workflow_final_review.md`
- `docs/ROAR_local_e2e_session_report.md` (updated to reference the above)

---

### F) Code comments: “Frontend → FastAPI → n8n” explicitly documented at wiring points
**Implemented:** Added explicit “frontend never calls n8n directly” notes in backend code at key trigger locations (create case, approve, close, message-bridge).

**Files:**
- `api/routers/messages.py`
- `api/routers/cases.py`

---

### G) Live n8n: sender types restored now that backend supports them
**Implemented in the live n8n instance:**
- WF1 chatbot message nodes now send `sender_type: "ai"`
- WF4 escalation notice node now sends `sender_type: "system"`

**Verified:** workflow definitions for:
- WF1 `#1 ROAR Workflow — Intake Agent` (id `IFYMhz16s9NvAInS`)
- WF4 `#4 ROAR Workflow - Summarization Agent` (id `v8DDRaFudzxJc3Ak`)

---

## 2) Key implementation details (exact behavior)

### 2.1 WF1 trigger URL construction (confirmed)
`api/services/n8n.py` normalizes webhook paths against `settings.n8n_webhook_base_url` (defaults to `http://localhost:5678/webhook`).

The helper accepts either:
- `"case-created"` (preferred)
- `"/webhooks/case-created"` (normalized)

The implementation uses `"case-created"` to avoid any accidental double-prefixing in future edits.

### 2.2 WF1 auto-trigger is intentionally *not* re-entrant
The gating rule is designed to prevent intake from re-running once triage has progressed. This matches the workflow spec intent (“WF1 is triggered on every customer message *while* the case is in `pending_triage`”).

---

## 3) Deliverables created this session

- `docs/ROAR_session_writeup_2026-03-19.md` (team handoff write-up + lessons learned)
- `docs/ROAR_after_implementation_report_for_claude.md` (this document)

---

## 4) Suggested quick validation steps (optional)

- **Sender types accepted**
  - POST an `ai` message to `/cases/{id}/messages` → should no longer 422
  - POST a `system` message → should no longer 422
- **WF1 auto-trigger**
  - Create a case (status `pending_triage`)
  - POST a customer message to `/cases/{id}/messages`
  - Confirm WF1 runs (n8n execution) and posts follow-up as `ai`
- **Non-retrigger behavior**
  - Move case to `awaiting_approval` or `escalated_human_required`
  - POST another customer message
  - Confirm WF1 does *not* retrigger (by design)

