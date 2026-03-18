## WF6 — Case Report Agent (06_case_report.json)

## How to build this in n8n UI

### Step 1: Create workflow

Create a new workflow named exactly:

- **Workflow name**: `ROAR Workflow - Case Report Agent`

### Step 2: Add nodes in order (N1–N9)

- **N1**: `Webhook Trigger` — type `Webhook`
- **N2**: `Fetch Full Case` — type `HTTP Request`
- **N3**: `Fetch Chat Transcript` — type `HTTP Request`
- **N4**: `Build Report Prompt` — type `Code` (JavaScript)
- **N5**: `GPT-4o-mini Report Call` — type `OpenAI Chat Model`
- **N6**: `Parse + Validate Report` — type `Code` (JavaScript)
- **N7**: `Write Case Report` — type `HTTP Request`
- **N8**: `Close Case` — type `HTTP Request`
- **N9**: `Post Closure Message` — type `HTTP Request`

### Step 3: Connect nodes (graph)

- `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Fetch Chat Transcript` → `N4 Build Report Prompt` → `N5 GPT-4o-mini Report Call` → `N6 Parse + Validate Report` → `N7 Write Case Report` → `N8 Close Case` → `N9 Post Closure Message`

### Step 4: Credentials per node

- **Use credential `ROAR FastAPI`** on:
  - `N1 Webhook Trigger`
- **Use credential `ROAR FastAPI Bearer`** on:
  - `N2 Fetch Full Case`
  - `N3 Fetch Chat Transcript`
  - `N7 Write Case Report`
  - `N8 Close Case`
  - `N9 Post Closure Message`
- **Use credential `ROAR OpenAI`** on:
  - `N5 GPT-4o-mini Report Call`

### Step 5: System prompt location

- **Node**: `N5 GPT-4o-mini Report Call`
- **System prompt source**: `ROAR_n8n_Spec_v2.0 §12.6 (WF6 — Case Report Agent)`

## Node-by-node configuration

### N1 — Webhook Trigger

- **Name**: `Webhook Trigger`
- **Type**: `Webhook`
- **Purpose**: Triggered whenever the conversation is closed in FastAPI.
- **URL / Path**:
  - **Path**: `conversation-closed`
  - **Method**: `POST`
  - **Response mode**: `Last Node`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Expected request body**:

```json
{
  "case_id": "uuid",
  "closed_by": "customer",
  "close_reason": "resolved"
}
```

### N2 — Fetch Full Case

- **Name**: `Fetch Full Case`
- **Type**: `HTTP Request`
- **Purpose**: Load the complete case record (information bundle, triage decision, resolution plan, escalation summary, etc.).
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$json.body.case_id}}`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.

### N3 — Fetch Chat Transcript

- **Name**: `Fetch Chat Transcript`
- **Type**: `HTTP Request`
- **Purpose**: Get the full message history for the case.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Full Case')[0].json.id}}/messages`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.

### N4 — Build Report Prompt

- **Name**: `Build Report Prompt`
- **Type**: `Code` (JavaScript)
- **Purpose**: Construct a trimmed transcript and a structured payload for the report LLM.
- **Body template (example)**:

```javascript
const c = $items('Fetch Full Case')[0].json;
const messages = $items('Fetch Chat Transcript')[0].json;

// Keep last 40 messages to stay within token budget
const trimmedTranscript = messages.slice(-40);

const user_message = {
  case: c,
  transcript: trimmedTranscript,
  closed_by: $json.body?.closed_by || $items('Webhook Trigger')[0].json.closed_by,
  close_reason: $json.body?.close_reason || $items('Webhook Trigger')[0].json.close_reason
};

return [{
  json: {
    user_message
  }
}];
```

### N5 — GPT-4o-mini Report Call

- **Name**: `GPT-4o-mini Report Call`
- **Type**: `OpenAI Chat Model`
- **Purpose**: Generate the structured case audit report.
- **Model settings**:
  - **Model**: `gpt-4o-mini`
  - **Temperature**: `0.0`
  - **Max tokens**: `1000`
  - **Response format**: `JSON object`
- **Auth / Credential**:
  - Use credential **`ROAR OpenAI`**.
- **Messages configuration**:
  - **System**: full prompt from `§12.6`.
  - **User**: `{{JSON.stringify($json.user_message)}}`
- **Expected response** (per §12.6):

```json
{
  "intent_classification": "string",
  "data_sources_queried": ["string"],
  "policies_applied": ["slug"],
  "slas_applied": ["slug"],
  "triage_decision": "autonomous",
  "resolution_path": "string",
  "approval_outcome": "approved",
  "rejection_reason": "string or null",
  "resolution_actions": ["string"] ,
  "outcome_summary": "string",
  "close_reason": "string"
}
```

### N6 — Parse + Validate Report

- **Name**: `Parse + Validate Report`
- **Type**: `Code` (JavaScript)
- **Purpose**: Ensure required fields are present; on failure, build a minimal report from raw case data.
- **Body template (example)**:

```javascript
const c = $items('Fetch Full Case')[0].json;
const trigger = $items('Webhook Trigger')[0].json;
let report = $json;

if (typeof report === 'string') {
  try {
    report = JSON.parse(report);
  } catch {
    report = null;
  }
}

const hasCoreFields =
  report &&
  report.intent_classification &&
  Array.isArray(report.data_sources_queried) &&
  report.outcome_summary;

if (!hasCoreFields) {
  // Fallback per §13.2
  report = {
    intent_classification: c.triage_decision?.intent || 'unknown',
    data_sources_queried: ['internal'],
    policies_applied: c.triage_decision?.policies_applied || [],
    slas_applied: c.triage_decision?.slas_applied || [],
    triage_decision: c.triage_decision?.routing_decision || 'escalation',
    resolution_path: c.resolution_path || 'unknown',
    approval_outcome: c.approval_outcome || null,
    rejection_reason: c.rejection_reason || null,
    resolution_actions: c.resolution_actions || [],
    outcome_summary: `Case ${c.id} closed with status ${c.status}.`,
    close_reason: trigger.close_reason || c.close_reason || 'unspecified'
  };
}

return [{ json: report }];
```

### N7 — Write Case Report

- **Name**: `Write Case Report`
- **Type**: `HTTP Request`
- **Purpose**: Persist the case audit report.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Full Case')[0].json.id}}/report`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "report": {{$json}},
  "generated_at": "{{$now}}"
}
```

- **Special settings**:
  - Enable **Continue On Fail** so that a report write error does not block case closure.

### N8 — Close Case

- **Name**: `Close Case`
- **Type**: `HTTP Request`
- **Purpose**: Mark the case as closed in FastAPI.
- **Method**: `PATCH`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Full Case')[0].json.id}}`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "status": "closed",
  "closed_by": "{{$items('Webhook Trigger')[0].json.closed_by}}",
  "close_reason": "{{$items('Webhook Trigger')[0].json.close_reason}}",
  "closed_at": "{{$now}}"
}
```

### N9 — Post Closure Message

- **Name**: `Post Closure Message`
- **Type**: `HTTP Request`
- **Purpose**: Post a closure message to the customer.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Full Case')[0].json.id}}/messages`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "content": "This conversation has been closed. A full case summary has been generated for your records. Thank you.",
  "sender_type": "system"
}
```

## Branching & connections summary

- **No conditional branches**: WF6 is fully linear.
- **Top-level flow**:
  - `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Fetch Chat Transcript` → `N4 Build Report Prompt` → `N5 GPT-4o-mini Report Call` → `N6 Parse + Validate Report` → `N7 Write Case Report` → `N8 Close Case` → `N9 Post Closure Message`

## System prompts

- **Case Report Agent system prompt** — from `ROAR_n8n_Spec_v2.0 §12.6`.
  - **Node**: `N5 GPT-4o-mini Report Call`

```text
You are ROAR's case report agent. Compile a permanent audit record for a closed case. 

You will receive the full case object and conversation transcript.                     

GUIDELINES:                                                                            

- Be thorough and factual --- this is a permanent audit record.                       

- outcome_summary: 2-3 sentences on what happened and how it resolved.                

- Extract actual values from data --- do not paraphrase or generalize.                

- Set inapplicable fields to null.                                                    

RESPONSE FORMAT --- valid JSON only:                                                   

{ "intent_classification": "string",                                              

"data_sources_queried": ["string"],                                             

"policies_applied": ["slug"],                                                   

"slas_applied": ["slug"],                                                       

"triage_decision": "autonomous" | "escalation",                                 

"resolution_path": "string",                                                      

"approval_outcome": "approved" | "rejected" | null,                            

"rejection_reason": "string | null",                                             

"resolution_actions": ["string"] | null,                                        

"outcome_summary": "string",                                                      

"close_reason": "string" }                                                         
```

