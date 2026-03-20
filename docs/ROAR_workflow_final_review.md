# ROAR Engine — n8n Workflow Session: Final Review and Instructions

**Date:** March 2026  
**Status:** Pipeline verified end-to-end ✅  
**Prepared for:** Engineering team (workflow + frontend integration handoff)

---

## What the session got right

### 1. Both demo scenarios completed successfully
Scenario A (ORD-10042 refund → autonomous → approved → resolved) and Scenario B (ORD-20087 delivery → escalation → summarized) ran green across all 6 workflows. This is the most important outcome. The full ROAR agentic pipeline — intake, data retrieval, triage, summarization, resolution, and case report — is operational.

### 2. Deterministic triage (critical fix)
The decision to compute refund rule outcomes in JavaScript code instead of trusting GPT-4o-mini for arithmetic was exactly right. The LLM was hallucinating comparisons (claiming ฿320 > ฿500, miscalculating date windows). Moving rule evaluation to deterministic JS code while keeping the LLM for narrative output is the correct production pattern and aligns with the design intent in BRL §5.

### 3. Status transition discipline
The team identified and fixed all status transition violations — wrong strings, premature transitions, and double-setting already-applied statuses. The backend's strict transition enforcement (HTTP 422 on invalid moves) is working as designed, and the workflows now respect it fully.

### 4. WF6 simplification
Disabling the Close Case and Post Closure Message nodes in WF6 was the right call. The backend `POST /cases/:id/close` already handles both the status update and the system message. Letting n8n also do it would cause double-close errors or duplicate messages. The canonical closure path is: frontend or agent calls FastAPI close endpoint → FastAPI fires WF6 webhook → WF6 writes the report only.

### 5. Fire-and-forget inter-workflow triggers
Setting `Never Error = ON` and `Response Format = Text` on inter-workflow trigger nodes (WF3 → WF5, WF3 → WF4) prevents false failures when downstream workflows respond unexpectedly. This is the right pattern for async pipeline handoffs.

### 6. Clean session documentation
The E2E session report is thorough, honest, and actionable. The lessons learned section, known-good checklist, and SQL snippets make this reproducible by any team member.

---

## What needs to be fixed before demo

### FIX 1 — sender_type values (schema alignment)
Workflows were sending `sender_type: "ai"` and `sender_type: "system"` to `POST /cases/:id/messages`. The backend must accept all four sender types from the original design: `customer`, `ai`, `agent`, `system`. The frontend uses these to render system events differently (e.g., centered pills vs chat bubbles).

### FIX 2 — WF1 auto-trigger from customer messages (frontend bridge)
Verify that `POST /cases/:id/messages` triggers `case-created` when `sender_type = "customer"` and case status is `pending_triage`. This is the bridge between frontend chat and the WF1 intake loop.

### FIX 3 — JWT expiry must be reverted before demo
Use an 8-hour token expiry for demo safety.

### FIX 4 — Hardcoded LAN IP in n8n workflows
Document as an environment dependency. If demo machine IP changes, node URLs need updating.

### FIX 5 — Bearer token expiry management
Tokens expire; add a simple daily refresh routine.

---

## Frontend wiring — what to connect now

Architecture is strictly:
**Frontend → FastAPI → n8n** (frontend never calls n8n).

### Wire 1 — Case creation (Intake form submit)
- Frontend: `POST /cases`
- Body: `{ order_id, dispute_type, customer_name, customer_email, intake_message }`
- On success: store `case_id`, navigate to chat window

### Wire 2 — Customer message (Chat input send)
- Frontend: `POST /cases/:id/messages`
- Body: `{ content: messageText, sender_type: "customer" }`
- Backend triggers WF1 automatically when case is `pending_triage`
- Poll `GET /cases/:id/messages` every ~4s for AI responses

### Wire 3 — Approver approval (Approve button)
- Frontend: `POST /cases/:id/approve`
- Header: `Authorization: Bearer <approver_token>`
- Backend triggers WF5 phase 2 automatically

### Wire 4 — Conversation close (Close button / Mark as Done)
- Frontend: `POST /cases/:id/close`
- Body: `{ closed_by: "customer"|"agent"|"timeout", close_reason: "resolved"|"unresponsive"|"duplicate"|null }`
- Backend triggers WF6 automatically

---

## Demo readiness checklist

### Environment
- [ ] Confirm LAN IP is still correct (run `ipconfig`)
- [ ] PostgreSQL Docker container running (`docker ps` shows `roar-postgres`)
- [ ] FastAPI running with `--host 0.0.0.0 --port 8000`
- [ ] n8n running at `localhost:5678`, all 6 workflows published
- [ ] Next.js frontend running at `localhost:3000`

### Data
- [ ] Demo users seeded (approver + escalation)
- [ ] Scenario A seed data present (ORD-10042 refund)
- [ ] Scenario B seed data present (ORD-20087 delivery lost)
- [ ] Policies seeded (`GET /policies` returns expected rows)
- [ ] No stale open cases for ORD-10042 / ORD-20087

### n8n
- [ ] Fresh Bearer JWT updated where needed (if still hardcoded)
- [ ] WF3 deterministic refund triage code active
- [ ] WF5 plan node does not set status (writes only `resolution_plan`)
- [ ] WF6 close/message nodes disabled (backend owns close + system message)

### Demo run
- [ ] Scenario A full run ✅
- [ ] Scenario B full run ✅

