# ROAR Local E2E Session Report (FastAPI + Postgres + n8n)

**Audience:** ROAR teammates (engineering)  
**Scope:** Local development environment (Windows) end-to-end validation and debugging of the ROAR agentic pipeline, including FastAPI backend, Postgres, and n8n workflows WF1–WF6.  
**Goal:** Achieve “all green at least once” executions across the full workflow chain and document the fixes, pitfalls, and final known-good configuration.

---

## 1. Context and goals

We needed the full ROAR pipeline to run locally:

- **FastAPI backend** (`api/`) on `http://192.168.1.52:8000` (LAN IP per team preference)
- **Postgres** in Docker (`roar-postgres`)
- **n8n** in Docker (`n8nio/n8n`, container name observed: `romantic_raman`) on `http://localhost:5678`
- **Workflows:**  
  - WF1: Intake Agent
  - WF2: Data Retrieval Agent
  - WF3: Triage Agent
  - WF4: Summarization Agent
  - WF5: Resolution Agent (plan + execute)
  - WF6: Case Report Agent

We had two broad work streams:

1) **Make n8n workflows compatible with local n8n** (no `$env.*` support in this setup, strict JSON handling, correct auth headers, correct FastAPI URLs, correct status transitions).  
2) **Fill backend gaps and align behavior** so WF5/WF6 can complete without breaking business rules.

---

## 1.1 Final review and demo handoff (source: `docs/ROAR_workflow_final_review.md`)

This section is copied from the final review doc to serve as the canonical handoff for frontend wiring + demo checklist.

See: `docs/ROAR_workflow_final_review.md`

---

## 2. System layout (local)

### 2.1 Services

- **FastAPI:** `http://192.168.1.52:8000`
- **n8n:** `http://localhost:5678`
- **Postgres:** Docker `roar-postgres` (Postgres 16)

### 2.2 Key “secrets” and headers

- **FastAPI Bearer JWT** (approver login) used for authenticated API calls from n8n HTTP nodes:
  - Obtained via `POST /auth/login` using `approver@roar.app` / `password123`
  - This is used by WF1/WF3/WF4/WF5/WF6 for `GET/PATCH/POST` calls to `/cases`, `/messages`, etc.
- **Webhook secret** for **FastAPI webhook endpoints** (server-to-server triggers):
  - `X-Webhook-Secret: dev-webhook-secret-change-in-production`
  - Used by WF1/WF2/WF3/WF4/WF6 when calling **FastAPI** endpoints under `/webhooks/*`
- **Important distinction:**
  - Calls to **n8n webhooks** do **not** use `X-Webhook-Secret` unless you added custom auth in the webhook node.
  - Calls to **FastAPI webhooks** (e.g., `POST /webhooks/triage-complete`) do use `X-Webhook-Secret`.

---

## 3. High-level timeline of what we did

### 3.1 Stabilized local “run” procedures (DB + API)

- Confirmed correct working directory + uvicorn import path issues:
  - Running uvicorn from the wrong directory caused `ModuleNotFoundError: No module named 'api'`.
  - Correct pattern: run `python -m uvicorn api.main:app --reload --port 8000` from repo root.

- Confirmed DB connectivity and common Windows issues:
  - `Connect call failed` → Postgres container not running.
  - DBeaver “authentication failed for user user” → container uses `postgres` user by default.

### 3.2 Replaced unsupported `{{$env.*}}` usage in n8n guides and workflow exports

Local n8n environment didn’t support `$env.*` interpolation the way these workflow JSON exports expected. We:

- Updated all workflow guide files under `n8n/guides/*_GUIDE.md` to use literal values:
  - `{{$env.FASTAPI_BASE_URL}}` → `http://localhost:8000` (or team’s LAN IP where needed)
  - `{{$env.FASTAPI_WEBHOOK_SECRET}}` → `dev-webhook-secret` or `dev-webhook-secret-change-in-production` (depending on FastAPI `.env`)

- Updated the exported workflow JSON files under `n8n/workflows/*.json` similarly.

**Important:** Even after repo files are updated, the **live n8n instance** still needs manual edits unless you re-import workflows.

### 3.3 Fixed n8n JSON-body construction issues (the biggest recurring issue)

n8n HTTP Request nodes often error with:
- `JSON parameter needs to be valid JSON`
- `Invalid body`
- runtime parse errors when mixing raw JSON and expressions

**Standard fix pattern:**

- Prefer **“Specify Body: Using Fields Below”**
- For dynamic values use expression mode in each Value:
  - `{{ $json.case_id }}`
- Avoid “raw JSON body editor” unless absolutely necessary.

### 3.4 Fixed “sender_type” mismatches across workflows

Backend only accepts:
- `sender_type ∈ {"customer","agent"}` for `POST /cases/{id}/messages`

So we updated n8n message nodes to send:
- `"sender_type": "agent"` instead of `"ai"` or `"system"`

### 3.5 Fixed status transition violations (backend business rules)

Backend status transitions are strict (see `api/services/cases.py`).

Common errors:
- Trying to close a case from `pending_triage` directly.
- Using wrong status string (e.g. `waiting_approval` instead of `awaiting_approval`).

We aligned workflows to use:
- `awaiting_approval`
- `approved_executing`
- `resolved`
- `closed`

### 3.6 Implemented missing backend endpoints required by WF5

WF5 needed to create resolution “records” in the DB (refund / return requests). The backend previously lacked endpoints.

We added:

- `POST /refund_requests`
- `POST /return_requests`

Implementation was added under a new router module and registered in `api/main.py`.

### 3.7 Fixed WF6 write path and disabled redundant nodes

WF6 had issues:
- “Write Case Report” was sending nested objects or invalid JSON.
- Wrong auth header type (needed `X-Webhook-Secret` for report upsert endpoint).
- “Close Case” and “Post Closure Message” duplicated backend behavior and also used invalid sender_type.

Fixes:
- Flatten report payload to match backend schema.
- Use `X-Webhook-Secret` for `/cases/{id}/report`.
- Enable **Continue on Error** on report write so closure still completes.
- Disable WF6 “Close Case” and “Post Closure Message” nodes because backend closes and posts system message already.

### 3.8 Fixed WF5 plan phase status write conflict

WF3 already sets case status to `awaiting_approval`.  
WF5 plan phase originally tried to patch the same status again, which caused a backend `422` due to invalid transition (`awaiting_approval -> awaiting_approval` is not allowed).

Fix:
- In WF5 node “Save Plan to Case”, remove the `status` field entirely and only write `resolution_plan`.

### 3.9 Fixed WF3 refund routing to be deterministic (avoid LLM arithmetic hallucinations)

Key incident:
- Refund triage incorrectly escalated cases by hallucinating comparisons (e.g. claiming `320 > 500`, or claiming a 4-day-old order was outside 30 days).

Fix:
- Updated WF3 `Build Triage Prompt` and `Parse + Validate`:
  - Compute refund “facts” deterministically in code:
    - transaction amount
    - days since order
    - within return window
    - refund record count
  - For refund disputes, compute the rule outcomes and `routing_decision` in JS, not by LLM.
  - Keep LLM output only for policy lists / narrative enrichment as needed.

### 3.10 Repaired WF3 node field-name “expression mode” corruption

Multiple nodes had “field name is expression” issues:
- `=triage_decision` instead of `triage_decision`
- `=case_id` instead of `case_id`
and value expressions with double-equals:
- `=={{ ... }}`

These can silently survive in the UI and only show up at runtime as backend `422`s.

Fix:
- Delete the body field row and recreate it with a plain-text Name.
- Put expression only in the Value box.

---

## 4. What changed in the backend (FastAPI)

### 4.1 JWT expiry extended (dev convenience)

Token expiry was adjusted from shorter default to 30 days by changing the `jwt_expire_minutes` setting in `api/config.py`.

### 4.2 Added WF5 “resolution records” endpoints

Added a router exposing:
- `POST /refund_requests`
- `POST /return_requests`

And registered it in `api/main.py`:
- `app.include_router(resolution_records.router)`

### 4.3 Existing approval and close endpoints used for production wiring

For frontend integration, we validated these are the correct control points:

- `POST /cases/{case_id}/approve`
  - sets `approved_executing`
  - triggers n8n `/webhooks/approved` (WF5 phase 2)

- `POST /cases/{case_id}/close`
  - enforces status transition rules
  - inserts a backend system message (`sender_type = system`)
  - triggers n8n `/webhooks/conversation-closed` (WF6)

---

## 5. What changed in n8n (live instance)

This section is the “manual edit” checklist we effectively implemented and verified.

### 5.1 Global principles for n8n node editing

- Prefer `Using Fields Below` for JSON bodies.
- **Never** put expressions in **field names**.
- Put expressions only in value boxes, and ensure they appear once:
  - Use `{{ ... }}` inside expression-mode boxes.
  - Avoid “double equals” `=={{ ... }}` which can happen when pasting `={{ ... }}` into an already expression-mode field.
- Always ensure correct base URL:
  - FastAPI: `http://192.168.1.52:8000`
  - n8n webhook: `http://localhost:5678/webhook/<path>`

### 5.2 WF1 (Intake)

Key fixes:
- Message posting uses `sender_type: "agent"` (backend doesn’t accept `ai`).
- Routing by `next_action` simplified so insufficient-context doesn’t dead-end.

### 5.3 WF2 (Data Retrieval)

Key fixes:
- Bundle update is immutable: reruns must use fresh cases or DB cleanup.
- Trigger to WF3 configured to be “fire and forget” (do not fail WF2 if WF3 responds unexpectedly).

### 5.4 WF3 (Triage) — **most important**

#### Deterministic refund triage
- Compute refund facts (amount, days since order, etc.) in `Build Triage Prompt`.
- In `Parse + Validate`, for `refund` disputes compute `rules_evaluated` and `routing_decision` from facts, do not trust the LLM for arithmetic/date windows.

#### Critical HTTP Request node body fields

These nodes must be correct:
- `Update - Awaiting Approval` body fields:
  - `status = awaiting_approval`
  - `resolution_path = autonomous`
  - `triage_decision = {{ { ... } }}`

- `Trigger Resolution Plan`:
  - `case_id = {{ $json.case_id || $json.id }}`
  - `Never Error = ON`
  - `Response Format = Text`

- `Update - Escalated` body fields:
  - `status = escalated_human_required`
  - `resolution_path = escalation`
  - `triage_decision = {{ { ... } }}`

- `Trigger Summarization`:
  - `case_id = {{ $json.case_id || $json.id }}`
  - `Never Error = ON`
  - `Response Format = Text`

### 5.5 WF4 (Summarization)

Key fixes:
- Ensure `escalation_summary` is written as a string (backend expects string, not object).
- The customer-facing “escalated” message uses `sender_type = agent` (backend does not allow `system` in messages endpoint).

### 5.6 WF5 (Resolution)

Key fixes:
- Plan phase “Save Plan to Case” must **not** re-set `status` if WF3 already did; write only `resolution_plan`.
- Phase 2 uses backend approval endpoint as the canonical trigger (`POST /cases/{id}/approve` triggers WF5).
- Ensure post-resolution message uses `sender_type = agent` and `content` correct field name.

### 5.7 WF6 (Case Report)

Key fixes:
- `Write Case Report` uses `X-Webhook-Secret` header (not `Authorization`) for backend report upsert.
- Flatten report payload fields to match backend schema.
- `Close Case` and `Post Closure Message` nodes disabled (backend does both; also `sender_type: system` is invalid for `/messages`).

---

## 6. Verification runs (“all green at least once”)

After wiping test records, we ran two fresh scenarios:

### 6.1 Scenario A — Refund (Autonomous path)

Inputs:
- Create case: `ORD-10042` refund

Observed outcome:
- WF1 ran (initial follow-up posted)
- WF2 ran (bundle populated)
- WF3 ran and routed autonomous (`awaiting_approval`)
- WF5 ran end-to-end after approval:
  - plan saved
  - approval set `approved_executing`
  - execution created a `refund_requests` row
  - case moved to `resolved`
- Case closed via backend endpoint
- WF6 ran and created a `case_reports` record

### 6.2 Scenario B — Delivery (Escalation path)

Inputs:
- Create case: `ORD-20087` delivery

Observed outcome:
- WF1 ran (initial follow-up posted)
- WF2 ran (bundle populated with shipment + stock records)
- WF3 ran and routed escalation (`escalated_human_required`)
- WF4 ran:
  - wrote escalation summary
  - posted escalation message

### 6.3 n8n execution IDs (for audit trail)

From local n8n execution DB after the final run:
- WF1 success: execution `112`
- WF2 success: execution `115`
- WF3 success: execution `116`
- WF4 success: execution `118`
- WF5 success: execution `119`
- WF6 success: execution `120`

---

## 7. Frontend wiring plan (near-term)

To keep the system maintainable and secure:

- **Frontend should call FastAPI only.**
- **FastAPI triggers n8n via server-side webhooks.**

Recommended frontend actions:

- Create case: `POST /cases`
- Customer message: `POST /cases/{id}/messages` (`sender_type = customer`)
- Approver approve: `POST /cases/{id}/approve`
- Agent close: `POST /cases/{id}/close`

FastAPI is responsible for:
- authenticating roles
- enforcing status transitions
- triggering n8n workflows (`/webhooks/*`)

This reduces the risk of:
- leaking secrets in browser calls
- bypassing business rules
- n8n URL/secret drift across environments

---

## 8. Lessons learned (actionable)

### 8.1 n8n expression pitfalls

- **Never** use expression mode in field names.
- Prefer **Using Fields Below** over raw JSON body editor.
- If you see `=={{ ... }}` or `=field_name`, delete and recreate the field row.
- UI can be misleading; trust exported workflow JSON / runtime behavior.

### 8.2 Determinism: don’t ask an LLM to do arithmetic/date windows

For routing decisions:
- LLMs can hallucinate even simple comparisons.
- Compute numeric and date-based rule outcomes in code, then have the model only explain or format the result if needed.

### 8.3 Status machines must be treated as “APIs”

Backend status transitions are business logic. Workflow code must respect it:
- Use the exact strings (e.g., `awaiting_approval` not `waiting_approval`)
- Do not re-apply status fields unnecessarily (can violate transition rules)

### 8.4 “Fire and forget” triggers prevent false negatives

Inter-workflow triggers should not fail the parent workflow when:
- the downstream webhook responds differently than expected
- downstream is “respond immediately”

Use:
- `Never Error = ON`
- `Response Format = Text`
on nodes whose only purpose is triggering another workflow.

### 8.5 When live n8n differs from repo JSON, prefer live as source of truth for runtime

Repo workflow exports are helpful, but:
- The active/published workflow inside n8n is what actually runs.
- Always validate with a real execution and, when possible, inspect the published workflow definition.

---

## 9. “Known good” quick checklist (copy/paste)

### WF3 (Triage)
- Refund routing computed in code (facts + deterministic rules)
- `Update - Awaiting Approval` fields:
  - `status = awaiting_approval`
  - `resolution_path = autonomous`
  - `triage_decision` (object expression)
- `Trigger Resolution Plan` body:
  - `case_id = {{ $json.case_id || $json.id }}`
  - `Never Error` on
  - `Response Format` text

### WF5 (Resolution)
- Plan phase “Save Plan to Case” writes only `resolution_plan` (no `status`)
- Post-resolution message:
  - `sender_type = agent`
  - `content` is string

### WF6 (Case Report)
- `Write Case Report`:
  - `X-Webhook-Secret` header
  - flat fields (not nested report object)
  - Continue on error enabled
- Close and closure message nodes disabled (backend does it)

---

## 10. Appendix: Useful SQL and commands used during debugging

### Postgres: show simulated orders (seeded)

```sql
SELECT o.order_id, o.status, o.total_amount, t.amount AS txn_amount, t.status AS txn_status
FROM sim_orders o
LEFT JOIN sim_transactions t ON t.order_id = o.order_id
ORDER BY o.order_id;
```

### Postgres: confirm refund request created

```sql
SELECT id, case_id, order_id, amount, reason, status
FROM refund_requests
ORDER BY id DESC
LIMIT 5;
```

### Postgres: confirm case report created

```sql
SELECT case_id, resolution_path, close_reason
FROM case_reports
WHERE case_id = '<case_uuid>';
```

### FastAPI: login to get approver JWT

```bash
curl -s -X POST "http://192.168.1.52:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"approver@roar.app\",\"password\":\"password123\"}"
```

### FastAPI: approve and close

```bash
curl -X POST "http://192.168.1.52:8000/cases/<case_id>/approve" \
  -H "Authorization: Bearer <token>"

curl -X POST "http://192.168.1.52:8000/cases/<case_id>/close" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"closed_by\":\"agent\",\"close_reason\":\"resolved\"}"
```

---

## 11. Open items / future improvements

- Align WF1 “intent-confirmed” handoff so WF2 triggers automatically from actual conversation turns (currently we manually triggered WF2 in some smoke runs).
- Standardize credentials and remove hardcoded Bearer tokens in workflow JSON exports:
  - use n8n credential store in deployed environments
  - for local, maintain a documented “token refresh” step
- Consider moving more workflow-side validation into backend endpoints for stricter guarantees (especially around case status transitions and payload schemas).

