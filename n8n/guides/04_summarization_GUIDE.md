## WF4 — Summarization Agent (04_summarization.json)

## How to build this in n8n UI

### Step 1: Create workflow

Create a new workflow named exactly:

- **Workflow name**: `ROAR Workflow - Summarization Agent`

### Step 2: Add nodes in order (N1–N7)

- **N1**: `Webhook Trigger` — type `Webhook`
- **N2**: `Fetch Full Case` — type `HTTP Request`
- **N3**: `Build Summary Prompt` — type `Code` (JavaScript)
- **N4**: `GPT-4o-mini Summary Call` — type `OpenAI Chat Model`
- **N5**: `Parse + Validate` — type `Code` (JavaScript)
- **N6**: `Save Summary to Case` — type `HTTP Request`
- **N7**: `Post Customer Message` — type `HTTP Request`

### Step 3: Connect nodes (graph)

- **Linear flow**:
  - `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Build Summary Prompt` → `N4 GPT-4o-mini Summary Call` → `N5 Parse + Validate` → `N6 Save Summary to Case` → `N7 Post Customer Message`

### Step 4: Credentials per node

- **Use credential `ROAR FastAPI`** (header `X-Webhook-Secret`) on:
  - `N1 Webhook Trigger`
- **Use credential `ROAR FastAPI Bearer`** on:
  - `N2 Fetch Full Case`
  - `N6 Save Summary to Case`
  - `N7 Post Customer Message`
- **Use credential `ROAR OpenAI`** on:
  - `N4 GPT-4o-mini Summary Call`

### Step 5: System prompt location

- **Node**: `N4 GPT-4o-mini Summary Call`
- **System prompt source**: `ROAR_n8n_Spec_v2.0 §12.3 (WF4 — Summarization Agent)`
- Paste the full system prompt from §12.3 into the **System** field of the OpenAI Chat Model node.

## Node-by-node configuration

### N1 — Webhook Trigger

- **Name**: `Webhook Trigger`
- **Type**: `Webhook`
- **Purpose**: Triggered by WF3 when a case is escalated.
- **URL / Path**:
  - **Path**: `triage-escalation`
  - **Method**: `POST`
  - **Response mode**: `Last Node`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Expected request body**:

```json
{
  "case_id": "uuid"
}
```

### N2 — Fetch Full Case

- **Name**: `Fetch Full Case`
- **Type**: `HTTP Request`
- **Purpose**: Load the case including `information_bundle`, `triage_decision`, dispute details, and customer metadata.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$json.body.case_id}}`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Response expectations**:
  - Full case JSON with fields used to build the summarization prompt.

### N3 — Build Summary Prompt

- **Name**: `Build Summary Prompt`
- **Type**: `Code` (JavaScript)
- **Purpose**: Build a concise JSON payload summarizing all relevant context for the LLM.
- **Body template (example)**:

```javascript
const c = $items('Fetch Full Case')[0].json;

const user_message = {
  dispute_type: c.dispute_type,
  order_id: c.order_id,
  customer_name: c.customer_name,
  information_bundle: c.information_bundle,
  triage_decision: c.triage_decision,
  // Optionally include any other fields that help summarization
};

return [{
  json: {
    user_message
  }
}];
```

- **Response expectations**:
  - JSON containing `user_message` object for the LLM.

### N4 — GPT-4o-mini Summary Call

- **Name**: `GPT-4o-mini Summary Call`
- **Type**: `OpenAI Chat Model`
- **Purpose**: Generate a concise, structured escalation summary.
- **Model settings**:
  - **Model**: `gpt-4o-mini`
  - **Temperature**: `0.3`
  - **Max tokens**: `600`
  - **Response format**: `JSON object`
- **Auth / Credential**:
  - Use credential **`ROAR OpenAI`**.
- **Messages configuration**:
  - **System**:
    - Paste the full system prompt from `ROAR_n8n_Spec_v2.0 §12.3`.
  - **User**:
    - Expression:
    - `{{JSON.stringify($json.user_message)}}`
- **Response expectations** (per §12.3):

```json
{
  "summary": "string",
  "key_facts": ["string"],
  "escalation_reason": "string",
  "recommended_action": "string",
  "data_sources_queried": ["oms", "logistics"],
  "policies_relevant": ["policy-slug"]
}
```

### N5 — Parse + Validate

- **Name**: `Parse + Validate`
- **Type**: `Code` (JavaScript)
- **Purpose**: Ensure the summary JSON is well-formed; on failure, build a minimal summary from case data.
- **Body template (example)**:

```javascript
const caseData = $items('Fetch Full Case')[0].json;
let summary;

try {
  summary = $json;
  if (typeof summary === 'string') {
    summary = JSON.parse(summary);
  }
} catch (e) {
  summary = null;
}

if (!summary ||
    !summary.summary ||
    !Array.isArray(summary.key_facts) ||
    !summary.escalation_reason ||
    !summary.recommended_action) {
  // Fallback minimal summary per §13.2
  summary = {
    summary: `Escalated ${caseData.dispute_type} dispute for order ${caseData.order_id}.`,
    key_facts: [
      caseData.triage_decision?.justification || 'Escalation due to triage error or incomplete data.'
    ],
    escalation_reason: 'LLM summarization failed, using minimal fallback.',
    recommended_action: 'Human agent should review the full case bundle and triage decision.',
    data_sources_queried: ['oms'],
    policies_relevant: []
  };
}

return [{ json: summary }];
```

- **Response expectations**:
  - Validated `summary` object ready to persist.

### N6 — Save Summary to Case

- **Name**: `Save Summary to Case`
- **Type**: `HTTP Request`
- **Purpose**: Save the escalation summary to the case record.
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
  "escalation_summary": {{$json}}
}
```

- **Response expectations**:
  - Updated case JSON with `escalation_summary` stored (often as a JSON object or string depending on backend).

### N7 — Post Customer Message

- **Name**: `Post Customer Message`
- **Type**: `HTTP Request`
- **Purpose**: Inform the customer that their case has been escalated and a specialist will join.
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
  "content": "Your case has been escalated. A customer care specialist will join this conversation shortly.",
  "sender_type": "system"
}
```

- **Response expectations**:
  - Message record created and appended to case transcript.

## Branching & connections summary

- **No Switch nodes**: WF4 is fully linear.
- **Top-level flow**:
  - `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Build Summary Prompt` → `N4 GPT-4o-mini Summary Call` → `N5 Parse + Validate` → `N6 Save Summary to Case` → `N7 Post Customer Message`

## System prompts

- **Summarization Agent system prompt** (WF4 — Summarization Agent) — from `ROAR_n8n_Spec_v2.0 §12.3`.
  - **Node**: `N4 GPT-4o-mini Summary Call`
  - **Where to paste**: OpenAI Chat Model node → `System` field.

```text
You are ROAR's summarization agent. Generate concise case summaries for escalation agents 

who need to quickly understand a dispute before joining a live customer chat.              

GUIDELINES:                                                                                

- summary: 2-3 sentences maximum.                                                         

- key_facts: 3-5 items, specific values preferred (amounts, statuses, dates).             

- recommended_action: one clear directive.                                               

RESPONSE FORMAT --- valid JSON only:                                                      

{ "summary": "string",                                                                 

"key_facts": ["string"],                                                             

"escalation_reason": "string",                                                         

"recommended_action": "string",                                                       

"data_sources_queried": ["oms","logistics"],                                       

"policies_relevant": ["policy-slug"] }                                               
```

