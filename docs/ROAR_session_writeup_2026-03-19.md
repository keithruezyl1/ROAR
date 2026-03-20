# ROAR Engine — Local E2E + n8n Workflow Session Write-up

**Date:** 2026-03-19  
**Audience:** ROAR engineering (backend, workflows, frontend)  
**Goal:** Capture exactly what we changed, why, and how to reproduce the full “all green” ROAR pipeline locally (WF1→WF6), plus lessons learned and demo readiness guidance.

---

## 1) Executive summary (what we achieved)

- **End-to-end pipeline verified** across all six workflows:
  - **Scenario A (refund, autonomous):** `ORD-10042` → intake → bundle → triage → approval → resolution → report ✅
  - **Scenario B (delivery, escalation):** `ORD-20087` → intake → bundle → triage escalation → summarization → close → report ✅
- **Backend and workflow alignment fixes** were implemented so the system behaves correctly for the upcoming frontend wiring:
  - Backend now accepts `sender_type ∈ {"customer","ai","agent","system"}` and keeps correct auth semantics.
  - WF1 can be **auto-triggered by customer messages** when the case is still in `pending_triage`.
  - JWT expiry reverted to **8 hours** (480 minutes) for demo safety.
  - DB constraint migration added to align `chat_messages.sender_type` across older local DBs.
  - Live n8n workflow nodes restored to the intended sender types (`ai` for chatbot, `system` for system notices).
- **Architecture rule reinforced**: **Frontend → FastAPI → n8n** (frontend never calls n8n directly).

---

## 2) Architecture (how the pieces communicate)

### 2.1 Canonical communication direction

**Frontend → FastAPI → n8n**

- The **frontend only calls FastAPI** endpoints.
- FastAPI is responsible for **triggering n8n webhooks** (WF1, WF5, WF6, etc.) via `api/services/n8n.py`.
- n8n workflows call back into FastAPI using normal REST endpoints (GET/PATCH/POST) for data fetches and persistence.

### 2.2 Why this matters

- Keeps browser/front-end environment out of workflow auth and orchestration.
- Gives one integration surface: the FastAPI backend.
- Allows us to enforce business rules (status transitions, immutability, auth) in the backend.

---

## 3) Local environment (known-good)

### 3.1 Services

- **FastAPI:** `http://192.168.1.52:8000` (LAN IP so Docker containers can reach host API)
- **n8n:** `http://localhost:5678` (Docker)
- **Postgres:** Docker container `roar-postgres` (Postgres 16)

### 3.2 Critical “why LAN IP” note

Docker containers can’t reliably reach the host machine via `localhost`. For this dev setup, n8n HTTP Request nodes use:

- `http://192.168.1.52:8000/...`

If your IP changes, you must update node URLs.

---

## 4) The six workflows (what each does)

This matches the ROAR n8n spec (`docs/ROAR_n8n_Spec_v2.0.md`) workflow registry:

- **WF1 — Intake Agent**: Customer-facing chatbot loop. Triggered repeatedly while case is `pending_triage`. Posts follow-up questions, confirms intent, triggers WF2.
- **WF2 — Data Retrieval Agent**: Aggregates simulated OMS/logistics/inventory/payment data; writes the `information_bundle`; triggers WF3.
- **WF3 — Triage Agent**: Applies policy/rules to decide `autonomous` vs `escalation`. Triggers WF5 or WF4.
- **WF4 — Summarization Agent**: Produces escalation summary for human handling; posts a system-style notice.
- **WF5 — Resolution Agent**: Generates plan; after approval executes (creates refund/return records, updates case, posts resolution message).
- **WF6 — Case Report Agent**: Generates and writes final audit record when conversation closes.

---

## 5) What broke repeatedly (and how we fixed it)

### 5.1 n8n JSON body parsing problems

**Symptoms**
- `JSON parameter needs to be valid JSON`
- `Invalid body`
- “works in editor but fails at runtime”

**Root cause**
n8n’s HTTP Request node is strict about JSON structure when mixing raw JSON and expressions.

**Fix pattern (standardized)**
- Prefer **“Specify Body: Using Fields Below”**
- Ensure **field name is plain text** (no expression mode in the “Name” column)
- Use expression mode only in the **Value** column, and only a single leading `=`

### 5.2 Field-name “expression mode” corruption (silent runtime killer)

**Symptoms**
- Field names like `=triage_decision`, `=case_id`
- Values like `=={{ ... }}` which then become stringified or invalid JSON

**Fix**
Delete and recreate the field row:
- Name: `triage_decision` (plain text)
- Value: `={{ { ... } }}` (expression)

### 5.3 Backend business rules surfaced in workflow runs (expected, but needed alignment)

**Immutability**
- `information_bundle` is immutable after initial set.
- Re-running WF2 on an existing case can fail unless using a new case or clearing that field.

**Status transitions**
Backend rejects invalid transitions with HTTP 422.
We aligned workflows to the allowed states and transitions (see `api/services/cases.py`):
- `pending_triage → awaiting_approval → approved_executing → resolved → closed`
- escalation path uses `escalated_human_required` before `closed` (not `pending_triage → closed`)

### 5.4 LLM arithmetic hallucinations (triage misroutes)

**Observed**
The LLM incorrectly evaluated simple rules (amount comparisons, day windows), causing wrong routing decisions.

**Fix**
Move computations to deterministic code in WF3:
- compute transaction amount, days since order, within window, etc.
- use deterministic logic for refund rule evaluation
- keep LLM for narrative/policy reasoning only

---

## 6) Backend changes we implemented (from the “Claude feedback fixes” plan)

### 6.1 `sender_type` alignment (backend + DB)

**Problem**
The original design requires four distinct sender types for correct UI rendering and system events:
`customer`, `ai`, `agent`, `system`.

Previously, backend only allowed `customer|agent`, forcing workflows to send `"agent"` everywhere.

**Fix**
In `api/routers/messages.py`:
- Validation now accepts: `customer`, `ai`, `agent`, `system`
- Auth rules:
  - `agent`: JWT required
  - `customer|ai|system`: no JWT required
- `sender_id` semantics preserved:
  - `agent`: `sender_id` comes from JWT subject
  - others: `sender_id` remains NULL

**DB constraint migration**
Added `db/migrations/005_chat_messages_sender_type_check.sql` to ensure the DB CHECK constraint matches the 4 valid values even if a local DB was created before the schema was updated.

### 6.2 WF1 auto-trigger from customer messages (frontend bridge)

**Goal**
Remove “manual trigger WF1” from the frontend path.

**Implementation**
In `api/routers/messages.py`, after inserting a new message:
- If `payload.sender_type == "customer"` AND `case.status == "pending_triage"`:
  - `await trigger_workflow("case-created", {...})`

**Important correctness details**
- **WF1 trigger path format:** pass only `"case-created"` (not `"/webhooks/case-created"`).  
  Verified in `api/services/n8n.py`: `_build_webhook_url` normalizes, but using bare path avoids confusion and prevents accidental double-prefixing in other future implementations.
- **`intake_message` payload field:** use **`case.intake_message`**, not the newly posted message content.  
  WF1 fetches the transcript itself; `intake_message` is context initialization and should remain the original intake.

**Sole gating condition (intentional)**
The WF1 auto-trigger uses **only**:

> `case.status == "pending_triage"`

Meaning:
- Once a case leaves `pending_triage` (e.g., `awaiting_approval` or `escalated_human_required`), customer messages **do not** retrigger WF1.  
This is intentional to prevent re-running intake after triage has already occurred.

### 6.3 JWT expiry reverted to 8 hours

For demo safety, `jwt_expire_minutes` was set back to **480** in `api/config.py`.

---

## 7) Live n8n workflow updates (post-backend fix)

After the backend accepted all four sender types, we restored intended n8n values:

- **WF1 chatbot nodes** now post messages with `sender_type: "ai"`
- **WF4 escalation notice** now posts with `sender_type: "system"`

Note: these are changes in the **live n8n instance**, not just the checked-in JSON exports.

---

## 8) Token + credentials handling (local dev reality)

### 8.1 Bearer JWT refresh routine (daily)

n8n nodes that call protected FastAPI endpoints use a hardcoded JWT, which expires.

Recommended routine:

```cmd
curl -X POST http://192.168.1.52:8000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"approver@roar.app\",\"password\":\"password123\"}"
```

Copy `access_token` and update Authorization headers in all n8n HTTP Request nodes that require it.

### 8.2 Webhook secret usage (distinguish directions)

- **FastAPI → n8n triggers:** use `X-Webhook-Secret` (FastAPI includes it automatically via `api/services/n8n.py`)
- **n8n → FastAPI webhook endpoints:** use `X-Webhook-Secret` header to authenticate `/webhooks/*` routes

---

## 9) Frontend wiring points (exact four calls)

Source of truth: `docs/ROAR_workflow_final_review.md`

1) **Create case**  
`POST /cases` with `{ order_id, dispute_type, customer_name, customer_email, intake_message }`

2) **Send customer message**  
`POST /cases/:id/messages` with `{ content, sender_type: "customer" }`  
Backend triggers WF1 automatically while case is `pending_triage`.

3) **Approver approval**  
`POST /cases/:id/approve` with `Authorization: Bearer <approver_token>`  
Backend triggers WF5 execution phase.

4) **Close conversation**  
`POST /cases/:id/close` with `{ closed_by, close_reason }`  
Backend triggers WF6 report generation.

---

## 10) Demo readiness checklist (condensed)

Source of truth: `docs/ROAR_workflow_final_review.md`

- [ ] Confirm LAN IP (run `ipconfig`)
- [ ] Postgres container running
- [ ] FastAPI running `--host 0.0.0.0 --port 8000`
- [ ] n8n running at `localhost:5678`, all 6 workflows published
- [ ] Fresh JWT applied where needed
- [ ] Scenario A green at least once
- [ ] Scenario B green at least once

---

## 11) Lessons learned (high-signal)

### 11.1 Determinism beats “LLM math”
If a rule can be computed, compute it in code. Use the LLM for language and synthesis, not for arithmetic or dates.

### 11.2 n8n UI can silently corrupt field names
The `=field_name` problem is subtle and expensive to debug. When in doubt, delete the body field row and recreate it.

### 11.3 Treat workflow triggers as async handoffs
Inter-workflow triggers should be “fire and forget” and should not fail upstream on downstream response quirks.

### 11.4 Strict backend rules are a feature, not a bug
HTTP 422 errors were valuable; they surfaced invalid transitions and helped enforce a clean state machine.

### 11.5 Separate orchestration from UI
Keeping the browser out of n8n makes the system safer and simpler: one surface area (FastAPI) to secure and evolve.

### 11.6 Hardcoded LAN IP and JWTs are acceptable for local/hackathon — but document them
When something *must* be hardcoded for local Docker constraints, make it explicit, checklist-driven, and fast to update.

---

## 12) Known limitations (acceptable for hackathon)

- Bearer JWT hardcoded in n8n nodes (manual refresh required)
- LAN IP hardcoded in n8n node URLs (requires update if IP changes)
- Re-running workflows on the same case can trip immutability rules unless using fresh cases or resetting specific fields

---

## 13) Appendix: file/changes index (where to look)

### Backend
- `api/routers/messages.py`
  - expanded `sender_type`
  - WF1 auto-trigger bridge (gated by `case.status == "pending_triage"` only)
- `api/services/n8n.py`
  - webhook URL normalization (`trigger_workflow("case-created", ...)` recommended)
- `api/config.py`
  - JWT expiry set to 480 minutes

### Database
- `db/migrations/005_chat_messages_sender_type_check.sql`

### Docs
- `docs/ROAR_workflow_final_review.md` (frontend wiring points + demo checklist)
- `docs/ROAR_local_e2e_session_report.md` (full detailed chronology + node-by-node notes)
- this file: `docs/ROAR_session_writeup_2026-03-19.md`

