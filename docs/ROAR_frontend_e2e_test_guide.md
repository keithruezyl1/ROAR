# ROAR Frontend E2E Test Guide (WF1–WF6 via UI)

**Audience:** Frontend + demo operators  
**Goal:** Run a small set of UI flows that guarantee every backend + n8n workflow (WF1–WF6) goes green at least once, using the real frontend.

---

## 0. Pre-checks (before opening the frontend)

- **Services running**
  - FastAPI: `python -m uvicorn api.main:app --host 0.0.0.0 --port 8000`
  - Postgres Docker: `roar-postgres` container is up (`docker ps`)
  - n8n Docker: `docker run -it --rm -p 5678:5678 -v "$env:USERPROFILE\.n8n:/home/node/.n8n" n8nio/n8n`
  - Frontend dev server: `npm run dev` (Next.js) at `http://localhost:3000`

- **Auth sanity**
  - You can log in to FastAPI as `approver@roar.app` with `password123` (if you reseeded users).
  - If needed, you can grab a fresh JWT by calling `POST /auth/login`, but the frontend should handle this via its own login form.

- **n8n sanity**
  - All 6 workflows show as **Published/Active** in the n8n UI.
  - Open WF1 quickly and confirm the `Post Intake Question` node sends `sender_type: "ai"`.

---

## 1. Scenario A — Refund, autonomous path (ORD-10042)

**Goal:** Exercise WF1 → WF2 → WF3 (autonomous) → WF5 (plan + execute) → WF6.

### 1.1 Create the case from the frontend

1. Open the frontend in a browser: `http://localhost:3000`.
2. Log in as the appropriate user (whatever role you wired for creating disputes).
3. Navigate to the **“Create dispute / Intake form”** screen.
4. Fill the form with:
   - **Order ID**: `ORD-10042`
   - **Dispute type**: `refund`
   - **Customer name**: e.g. `Scenario A User`
   - **Customer email**: e.g. `scenario_a@demo.com`
   - **Intake message**: something like `I want a refund for my recent order.`
5. Submit.
6. On success, the UI should navigate to the **chat view** for the new case (store the case reference somewhere if the UI shows it).

### 1.2 Let WF1 run its intake loop

1. In the chat view, you should see your **initial customer message**.
2. Within a few seconds, you should see **WF1’s AI follow-up question(s)** appear with `sender_type: "ai"` (visually this should look like an AI/chatbot message).
3. Answer the questions as the customer, via the chat input, until the bot clearly indicates it “has enough information” (depending on how you wired the UI copy, you’ll see one or more turns).
4. The final WF1 step should confirm intent and trigger WF2 (`bundle-ready`), but from the UI your only observable signal is that the AI stops asking intake questions.

### 1.3 Let WF2 + WF3 run and reach “awaiting approval”

1. Wait ~10–20 seconds after the last intake answer.
2. In n8n, check the **Executions** tab (optional, just for sanity):
   - WF2 (`#2 ROAR Workflow — Data Retrieval Agent`) should show a new successful run.
   - WF3 (`#3 ROAR Workflow — Triage Agent`) should also show a successful run.
3. In the frontend, navigate to the **case details** or **agent/approver dashboard** view.
4. Confirm that the case status has moved to **`awaiting_approval`** and that any triage summary/decision is visible where you surface it.

### 1.4 Approver reviews and approves (WF5 plan + execute)

1. Log in as the **approver** in the frontend (if this is a different role).
2. Go to the view listing cases that are **awaiting approval**.
3. Open the case you just created for `ORD-10042`.
4. Review whatever triage / plan information you render (resolution plan card, etc.).
5. Click **Approve** (this should call `POST /cases/{id}/approve` behind the scenes).
6. Wait ~10–20 seconds.
7. In n8n (optional check):
   - WF5 (`#5 ROAR Workflow — Resolution Agent`) should have at least one **Plan** run (phase 1) and one **Execution** run (phase 2 after approval).

### 1.5 Case closure (WF6)

1. In the frontend, after resolution is complete, use the **Close / Mark as resolved** action.
   - This should call `POST /cases/{id}/close` with `closed_by='agent'` and `close_reason='resolved'` or equivalent.
2. Wait a few seconds.
3. Confirm in the UI:
   - The case status is now **`closed`**.
   - A system-style message appears indicating the conversation has been closed.
4. In n8n (optional check):
   - WF6 (`#6 ROAR Workflow — Case Report Agent`) shows a successful execution for this case.

At this point, **all of WF1, WF2, WF3, WF5, WF6** have gone green at least once through the full autonomous refund scenario.

---

## 2. Scenario B — Delivery, escalation path (ORD-20087)

**Goal:** Exercise WF1 → WF2 → WF3 (escalation branch) → WF4 → WF6.

### 2.1 Create the case from the frontend

1. From the frontend home/dashboard, start a **new dispute** again.
2. Fill the form with:
   - **Order ID**: `ORD-20087`
   - **Dispute type**: `delivery`
   - **Customer name**: e.g. `Scenario B User`
   - **Customer email**: e.g. `scenario_b@demo.com`
   - **Intake message**: e.g. `There is a delivery issue with my order ORD-20087.`
3. Submit and land in the **chat view** for this new case.

### 2.2 Let WF1 run intake for delivery

1. As in Scenario A, WF1 should post AI questions in the chat; answer them as the customer.
2. For this scenario, you want WF3 to decide that the case **needs escalation** (not autonomous resolution). The exact wording isn’t critical, but keep answers consistent with a “problematic delivery” (lost/delayed package).
3. After the last intake step, pause for ~10–20 seconds.

### 2.3 WF2 + WF3 escalation → WF4 summarization

1. In n8n (optional check):
   - WF2 should show a successful run for this case (bundle built).
   - WF3 should show a successful run that chooses the **escalation** path.
   - WF4 (`#4 ROAR Workflow - Summarization Agent`) should have a successful run generating the escalation summary.
2. In the frontend, navigate to the **agent/escalation view** where escalated cases are surfaced (depending on your UI design):
   - Confirm this case appears as **escalated** (e.g. `escalated_human_required` status).
   - Confirm the escalation summary from WF4 appears somewhere (or at least is accessible in the case detail view).
   - You should see a system-style message in the chat corresponding to the summarization (sender_type `system` behind the scenes).

### 2.4 Human handles escalation and closes

1. As the human agent in the frontend, send at least one **agent message** in the chat to simulate a real human joining.
2. Once done, use the **Close / Mark as resolved** action again:
   - This should call `POST /cases/{id}/close` with `closed_by='agent'` (or `'customer'` depending on your UX) and an appropriate `close_reason`.
3. Confirm in UI:
   - Case status is `closed`.
   - Close system message is present.
4. In n8n (optional):
   - WF6 should show a successful run for this escalated case as well (report created).

At this point, **all 6 workflows** have been exercised in both their main branches:
- WF1: intake for refund + delivery
- WF2: bundle creation for refund + delivery
- WF3: autonomous path and escalation path
- WF4: escalation summary
- WF5: plan + execution on approved refund
- WF6: case report after close (on both scenarios)

---

## 3. Quick checklist you can keep beside you

- **Before tests**
  - [ ] FastAPI, Postgres, n8n, frontend all running
  - [ ] n8n workflows published and active
  - [ ] You can log in as `approver@roar.app` via the frontend

- **Scenario A (ORD-10042)** — refund autonomous
  - [ ] Case created from UI
  - [ ] WF1 asks questions and stops after confirming intent
  - [ ] Case moves to `awaiting_approval`
  - [ ] Approver sees plan and clicks Approve
  - [ ] Case moves through execution and can be closed as resolved
  - [ ] In n8n, WF1/WF2/WF3/WF5/WF6 each have at least one successful execution

- **Scenario B (ORD-20087)** — delivery escalation
  - [ ] Case created from UI
  - [ ] WF1 + WF2 run
  - [ ] WF3 marks case as escalated
  - [ ] WF4 generates a summary; UI shows escalated state
  - [ ] Human agent sends at least one message and closes case
  - [ ] In n8n, WF1/WF2/WF3/WF4/WF6 each have at least one successful execution

If you can tick every box above using only the frontend, you’re ready for a smooth demo. 

