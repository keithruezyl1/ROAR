# WF1 — Intake Agent (`01_intake_agent.json`)

> Build this exactly as specified in `ROAR_n8n_Spec_v2.0 §5.1` and `§12.1`. This workflow handles intake chat while the case is in `pending_triage`.

---

## 1. How to build this in n8n UI

1. **Create workflow**
   - Name: **`ROAR Workflow — Intake Agent`**.
   - Keep it **inactive** until all nodes are configured.

2. **Add nodes in this exact order**
   1. `Webhook` — **N1 Webhook — case-created**
   2. `HTTP Request` — **N2 Fetch Case**
   3. `HTTP Request` — **N3 Fetch Transcript**
   4. `Code` — **N4 Build Intake Prompt**
   5. `OpenAI Chat Model` (or `AI Chat Model`) — **N5 Intake Agent (LLM)**
   6. `Code` — **N6 Parse Intake JSON**
   7. `Switch` — **N7 Route by next_action**
   8. `HTTP Request` — **N8 Post Intake Question** (branch A)
   9. `HTTP Request` — **N9a Update Case — intent confirmed** (branch B)
   10. `HTTP Request` — **N9b Trigger WF2 — bundle-ready** (branch B)
   11. `HTTP Request` — **N10a Post insufficient-context message** (branch C)
   12. `HTTP Request` — **N10b Close case — insufficient-context** (branch C)
   13. `Set` (or `Code`) — **N11 Webhook response**

3. **Wire connections**
   - N1 → N2 → N3 → N4 → N5 → N6 → N7.
   - N7 case `"ask_question"` → N8 → N11.
   - N7 case `"classify_intent"` with `"intent" = "valid_dispute"` → N9a → N9b → N11.
   - N7 case `"classify_intent"` with `"intent" = "insufficient_context"` → N10a → N10b → N11.
   - N7 default (any error) → N11.

4. **Use these credentials**
   - **ROAR FastAPI** — HTTP Header Auth (`X-Webhook-Secret: {{FASTAPI_WEBHOOK_SECRET}}`) for all inbound webhooks and internal POST triggers.
   - **ROAR FastAPI Bearer** — HTTP Bearer Token for `GET /cases`, `GET /cases/:id/messages`, `PATCH /cases/:id`, `POST /cases/:id/messages`, `POST /cases/:id/close`.
   - **ROAR OpenAI** — OpenAI Chat Model (GPT‑4o‑mini).

5. **Paste the system prompt**
   - In **N5**, paste the **Intake Agent system prompt** from `ROAR_n8n_Spec_v2.0 §12.1` (see section 3.1 below).

---

## 2. Node‑by‑node configuration

### 2.1 N1 — Webhook — case-created

- **Type**: Webhook  
- **Name**: `Webhook — case-created`  
- **HTTP Method**: `POST`  
- **Path**: `case-created`  
- **Response Mode**: `Last node`  
- **Authentication**: credential **ROAR FastAPI**  
  - Header: `X-Webhook-Secret: dev-webhook-secret`

**Expected body** (from FastAPI `/webhooks/case-created`):

```json
{
  "case_id": "uuid",
  "dispute_type": "refund",
  "order_id": "ORD-10042"
}
```

All later nodes reference `{{$json.body.case_id}}`, `{{$json.body.dispute_type}}`, `{{$json.body.order_id}}`.

---

### 2.2 N2 — Fetch Case

- **Type**: HTTP Request  
- **Name**: `Fetch Case`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `GET`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}
```

- **Response**: case JSON (`cases` row per `ROAR_PBD_v1.1 §3.1`), used later to build the prompt.

---

### 2.3 N3 — Fetch Transcript

- **Type**: HTTP Request  
- **Name**: `Fetch Transcript`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `GET`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}/messages
```

- **Response**:

```json
{ "messages": [ /* chat_messages[] */ ] }
```

In N4 you will trim to last `CHAT_TRANSCRIPT_MAX_MSGS` (= 40 from BRL §2.2).

---

### 2.4 N4 — Build Intake Prompt (Code)

- **Type**: Code (JavaScript)  
- **Name**: `Build Intake Prompt`  
- **Purpose**:
  - Construct the OpenAI chat `messages` array.
  - Inject BRL intake rules: max 3 follow‑up questions, approved question lists, etc.
  - Provide case + transcript context.

**Implementation outline**:

```js
// Case and transcript from previous nodes
const caseData = $item(0, 'Fetch Case').$json;
const transcript = ($item(0, 'Fetch Transcript').$json.messages || []).slice(-40);

// Compute how many intake questions already asked (if you tag them)
const priorQuestions = transcript.filter(
  (m) => m.sender_type === 'ai' && m.metadata?.role === 'intake_question'
).length;

const systemPrompt = `
You are ROAR's intake agent for a retail customer dispute system.

Your job is to gather sufficient context from the customer about their dispute,
then classify the intent once you have enough information.

RULES:
- Ask a maximum of 3 follow-up questions total across the entire conversation.
- Only ask questions from the approved set for the given dispute_type.
- Once you have sufficient context (or after 3 questions), classify the intent.
- Classify as valid_dispute if the issue is a legitimate refund or delivery problem.
- Classify as insufficient_context only if the customer provided no usable information.
- Be concise and professional.

APPROVED QUESTIONS --- refund disputes:
1. Have you received any part of your order?
2. What payment method did you use for this order?
3. When was the order placed?

APPROVED QUESTIONS --- delivery disputes:
1. What is the current tracking status shown to you?
2. Has the estimated delivery date passed?
3. Have you contacted the carrier about this issue?

RESPONSE FORMAT --- valid JSON only, no prose, no markdown:
{ "action": "ask_question" | "classify_intent",
  "question": "string (only if action=ask_question)",
  "intent": "valid_dispute" | "insufficient_context" (only if classifying),
  "intent_summary": "one sentence summary (only if classifying)" }
`.trim();

const messages = [
  { role: 'system', content: systemPrompt },
  {
    role: 'user',
    content: JSON.stringify({
      case: caseData,
      transcript,
      max_followup_questions: 3,
    }),
  },
];

return [{ messages, priorQuestions }];
```

> In the UI: paste the system prompt only into N5 (LLM). Here we show it inline just to illustrate; in practice N4 can just construct a JSON `user` message and N5 uses §12.1 as system message.

Outputs:

- `messages`: chat input for N5.
- `priorQuestions`: optional helper for enforcing question limit.

---

### 2.5 N5 — Intake Agent (LLM)

- **Type**: OpenAI Chat Model (or AI Chat Model)  
- **Name**: `Intake Agent — GPT-4o-mini`  
- **Credential**: **ROAR OpenAI**  
- **Model**: `gpt-4o-mini`  
- **Temperature**: `0.2` (per §11 table)  
- **Max Tokens**: `400` (per §11 table)  
- **JSON mode**: enabled (Response format: JSON object).

Configuration:

- **System Prompt**: paste the prompt from **§12.1** (see 3.1 below).
- **Messages**: use `{{$json.messages}}` from N4 as user messages; node will add the system message field.

Output:

- JSON object with fields:
  - `action`: `"ask_question"` or `"classify_intent"`
  - `question?`: follow‑up question text
  - `intent?`: `"valid_dispute"` or `"insufficient_context"`
  - `intent_summary?`: one‑sentence summary

---

### 2.6 N6 — Parse Intake JSON

- **Type**: Code  
- **Name**: `Parse Intake JSON`  
- **Purpose**: Normalize the LLM output into a shape used by the Switch.

Code:

```js
// In JSON mode, the node should already return an object on $json.
const data = $json;

let next_action;
if (data.action === 'ask_question') {
  next_action = 'ask_question';
} else if (data.action === 'classify_intent') {
  next_action = 'classify_intent';
} else {
  next_action = 'error';
}

return [{
  next_action,
  question: data.question || null,
  intent: data.intent || null,
  intent_summary: data.intent_summary || null,
}];
```

---

### 2.7 N7 — Route by next_action (Switch)

- **Type**: Switch  
- **Name**: `Route by next_action`  
- **Value**: `{{$json.next_action}}`
- **Cases**:
  - Case 1: `={{"ask_question"}}` → N8.
  - Case 2: `={{"classify_intent"}}` → (you will branch by `intent` inside N9 path).
  - Default: → N11 (error/fallback).

To respect the `intent` values:

- Add an **IF** or additional Switch after N6 or at start of branch:
  - If `intent === "valid_dispute"` → confirmation path N9a/N9b.
  - If `intent === "insufficient_context"` → insufficient path N10a/N10b.

---

### 2.8 N8 — Post Intake Question (ask_question branch)

- **Type**: HTTP Request  
- **Name**: `Post Intake Question`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `POST`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}/messages
```

- **Headers**:
  - `Content-Type: application/json`
- **Body**:

```json
{
  "content": "{{$json.question}}",
  "sender_type": "ai",
  "metadata": {
    "role": "intake_question"
  }
}
```

---

### 2.9 N9 — Intent confirmed (valid_dispute branch)

#### N9a — Update Case

- **Type**: HTTP Request  
- **Name**: `Update Case — Intent Confirmed`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `PATCH`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}
```

- **Body**:

```json
{
  "status": "pending_triage"
}
```

> You can optionally enrich intake fields here (customer name/email) according to the resolved intent, but WF1 spec keeps it minimal and defers to bundle/triage.

#### N9b — Trigger WF2 (bundle-ready)

- **Type**: HTTP Request  
- **Name**: `Trigger WF2 — bundle-ready`  
- **Credential**: **ROAR FastAPI**  
- **Method**: `POST`  
- **URL**:

```text
http://localhost:8000/webhooks/bundle-ready
```

- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
  - `Content-Type: application/json`
- **Body**:

```json
{
  "case_id": "{{$json.body.case_id}}",
  "dispute_type": "{{$json.body.dispute_type}}",
  "order_id": "{{$json.body.order_id}}"
}
```

---

### 2.10 N10 — Insufficient context (insufficient_context branch)

#### N10a — Post message

- **Type**: HTTP Request  
- **Name**: `Post Insufficient Context Message`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `POST`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}/messages
```

- **Body**:

```json
{
  "content": "Unable to gather enough information. Please contact support.",
  "sender_type": "ai"
}
```

#### N10b — Close case

- **Type**: HTTP Request  
- **Name**: `Close Case — insufficient_context`  
- **Credential**: **ROAR FastAPI Bearer**  
- **Method**: `POST`  
- **URL**:

```text
http://localhost:8000/cases/{{ $json.body.case_id }}/close
```

- **Body**:

```json
{
  "closed_by": "agent",
  "close_reason": "unresponsive"
}
```

---

### 2.11 N11 — Webhook response

- **Type**: Set (or Code)  
- **Name**: `Response`  
- **Value**:

```json
{
  "ok": true
}
```

The Webhook node will return this JSON to FastAPI as its HTTP 200 response.

---

## 3. System prompt text (Intake Agent)

Paste this into the **System Prompt** field of N5 (exact text from `ROAR_n8n_Spec_v2.0 §12.1`):

```text
You are ROAR's intake agent for a retail customer dispute system.

Your job is to gather sufficient context from the customer about their dispute,
then classify the intent once you have enough information.

RULES:

- Ask a maximum of 3 follow-up questions total across the entire conversation.

- Only ask questions from the approved set for the given dispute_type.

- Once you have sufficient context (or after 3 questions), classify the intent.

- Classify as valid_dispute if the issue is a legitimate refund or delivery problem.

- Classify as insufficient_context only if the customer provided no usable information.

- Be concise and professional.

APPROVED QUESTIONS --- refund disputes:

1. Have you received any part of your order?

2. What payment method did you use for this order?

3. When was the order placed?

APPROVED QUESTIONS --- delivery disputes:

1. What is the current tracking status shown to you?

2. Has the estimated delivery date passed?

3. Have you contacted the carrier about this issue?

RESPONSE FORMAT --- valid JSON only, no prose, no markdown:

{ "action": "ask_question" | "classify_intent",

"question": "string (only if action=ask_question)",

"intent": "valid_dispute" | "insufficient_context" (only if classifying),

"intent_summary": "one sentence summary (only if classifying)" }
```

