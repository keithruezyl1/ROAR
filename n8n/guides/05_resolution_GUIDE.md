## WF5 — Resolution Agent (05_resolution.json)

## How to build this in n8n UI

### Step 1: Create workflow

Create a single workflow that handles both plan and execute phases:

- **Workflow name**: `ROAR Workflow - Resolution Agent`

### Step 2: Add nodes in order (N1–N15)

**Phase 1 — Plan (trigger: /webhooks/resolution-plan)**

- **N1**: `Webhook - Plan` — type `Webhook`
- **N2**: `Fetch Case (Plan)` — type `HTTP Request`
- **N3**: `Build Plan Prompt` — type `Code` (JavaScript)
- **N4**: `GPT-4o-mini Plan Call` — type `OpenAI Chat Model`
- **N5**: `Parse Plan` — type `Code` (JavaScript)
- **N6**: `Save Plan to Case` — type `HTTP Request`

**Phase 2 — Execute (trigger: /webhooks/approved)**

- **N7**: `Webhook - Approved` — type `Webhook`
- **N8**: `Fetch Case + Plan` — type `HTTP Request`
- **N9**: `Build Execute Prompt` — type `Code` (JavaScript)
- **N10**: `GPT-4o-mini Execute Call` — type `OpenAI Chat Model`
- **N11**: `Route by Dispute Type` — type `Switch`
- **N12**: `Create Refund Record` — type `HTTP Request`
- **N13**: `Create Return Record` — type `HTTP Request`
- **N14**: `Update Case - Resolved` — type `HTTP Request`
- **N15**: `Post Resolution Message` — type `HTTP Request`

### Step 3: Connect nodes (graph & branches)

- **Phase 1 (Plan)**:
  - `N1 Webhook - Plan` → `N2 Fetch Case (Plan)` → `N3 Build Plan Prompt` → `N4 GPT-4o-mini Plan Call` → `N5 Parse Plan` → `N6 Save Plan to Case`
- **Phase 2 (Execute)**:
  - `N7 Webhook - Approved` → `N8 Fetch Case + Plan` → `N9 Build Execute Prompt` → `N10 GPT-4o-mini Execute Call` → `N11 Route by Dispute Type`
  - `N11` refund branch → `N12 Create Refund Record`
  - `N11` delivery branch → `N13 Create Return Record`
  - Both `N12` and `N13` → `N14 Update Case - Resolved` → `N15 Post Resolution Message`

### Step 4: Credentials per node

- **Use credential `ROAR FastAPI`** on:
  - `N1 Webhook - Plan`
  - `N7 Webhook - Approved`
- **Use credential `ROAR FastAPI Bearer`** on:
  - `N2 Fetch Case (Plan)`
  - `N6 Save Plan to Case`
  - `N8 Fetch Case + Plan`
  - `N12 Create Refund Record`
  - `N13 Create Return Record`
  - `N14 Update Case - Resolved`
  - `N15 Post Resolution Message`
- **Use credential `ROAR OpenAI`** on:
  - `N4 GPT-4o-mini Plan Call`
  - `N10 GPT-4o-mini Execute Call`

### Step 5: System prompt locations

- **Plan phase**:
  - **Node**: `N4 GPT-4o-mini Plan Call`
  - **Prompt**: `ROAR_n8n_Spec_v2.0 §12.4 (WF5 — Resolution Agent Phase 1)`
- **Execute phase**:
  - **Node**: `N10 GPT-4o-mini Execute Call`
  - **Prompt**: `ROAR_n8n_Spec_v2.0 §12.5 (WF5 — Resolution Agent Phase 2)`

Paste each full prompt into the respective OpenAI Chat Model node `System` field.

## Node-by-node configuration

### Phase 1 — Plan

#### N1 — Webhook - Plan

- **Name**: `Webhook - Plan`
- **Type**: `Webhook`
- **Purpose**: Triggered by WF3 when routing_decision is autonomous and a plan is needed.
- **URL / Path**:
  - **Path**: `resolution-plan`
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

#### N2 — Fetch Case (Plan)

- **Name**: `Fetch Case (Plan)`
- **Type**: `HTTP Request`
- **Purpose**: Load full case, including `information_bundle` and `triage_decision`, for plan generation.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$json.body.case_id}}`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.

#### N3 — Build Plan Prompt

- **Name**: `Build Plan Prompt`
- **Type**: `Code` (JavaScript)
- **Purpose**: Build the user payload for the plan LLM.
- **Body template (example)**:

```javascript
const c = $items('Fetch Case (Plan)')[0].json;

const user_message = {
  dispute_type: c.dispute_type,
  information_bundle: c.information_bundle,
  triage_decision: c.triage_decision,
  policies_applied: c.triage_decision?.policies_applied || []
};

return [{
  json: {
    user_message
  }
}];
```

#### N4 — GPT-4o-mini Plan Call

- **Name**: `GPT-4o-mini Plan Call`
- **Type**: `OpenAI Chat Model`
- **Purpose**: Generate a candidate resolution plan.
- **Model settings**:
  - **Model**: `gpt-4o-mini`
  - **Temperature**: `0.2`
  - **Max tokens**: `600`
  - **Response format**: `JSON object`
- **Auth / Credential**:
  - Use credential **`ROAR OpenAI`**.
- **Messages configuration**:
  - **System**: full prompt from `§12.4`.
  - **User**: `{{JSON.stringify($json.user_message)}}`
- **Expected response** (per §12.4):

```json
{
  "resolution_type": "refund",
  "amount": 500,
  "steps": ["string"],
  "customer_message": "string"
}
```

#### N5 — Parse Plan

- **Name**: `Parse Plan`
- **Type**: `Code` (JavaScript)
- **Purpose**: Validate `resolution_type`, `amount`, and required fields.
- **Body template (example)**:

```javascript
let plan = $json;
if (typeof plan === 'string') {
  try {
    plan = JSON.parse(plan);
  } catch {
    plan = null;
  }
}

const validTypes = ['refund', 'replacement', 'redelivery', 'store_credit'];

if (!plan || !validTypes.includes(plan.resolution_type)) {
  // Fallback per §13.2 — send back to pending_triage
  plan = {
    resolution_type: 'refund',
    amount: null,
    steps: ['Review case manually.'],
    customer_message: 'We are reviewing your case. Please wait while a specialist confirms the resolution.'
  };
}

if (plan.resolution_type === 'refund' && typeof plan.amount !== 'number') {
  plan.amount = 0;
}

return [{ json: plan }];
```

#### N6 — Save Plan to Case

- **Name**: `Save Plan to Case`
- **Type**: `HTTP Request`
- **Purpose**: Persist `resolution_plan` and ensure status is `awaiting_approval`.
- **Method**: `PATCH`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Case (Plan)')[0].json.id}}`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "resolution_plan": {{$json}},
  "status": "awaiting_approval"
}
```

---

### Phase 2 — Execute

#### N7 — Webhook - Approved

- **Name**: `Webhook - Approved`
- **Type**: `Webhook`
- **Purpose**: Triggered by FastAPI when an approver approves the plan.
- **URL / Path**:
  - **Path**: `approved`
  - **Method**: `POST`
  - **Response mode**: `Last Node`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Expected request body**:

```json
{
  "case_id": "uuid",
  "approver_id": "uuid"
}
```

#### N8 — Fetch Case + Plan

- **Name**: `Fetch Case + Plan`
- **Type**: `HTTP Request`
- **Purpose**: Load the case including `resolution_plan`, `information_bundle`, and `dispute_type`.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$json.body.case_id}}`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.

#### N9 — Build Execute Prompt

- **Name**: `Build Execute Prompt`
- **Type**: `Code` (JavaScript)
- **Purpose**: Prepare the execution context for the LLM to confirm actions taken.
- **Body template (example)**:

```javascript
const c = $items('Fetch Case + Plan')[0].json;

const user_message = {
  resolution_plan: c.resolution_plan,
  information_bundle: c.information_bundle
};

return [{
  json: {
    user_message
  }
}];
```

#### N10 — GPT-4o-mini Execute Call

- **Name**: `GPT-4o-mini Execute Call`
- **Type**: `OpenAI Chat Model`
- **Purpose**: Produce a structured description of actions taken and outcome.
- **Model settings**:
  - **Model**: `gpt-4o-mini`
  - **Temperature**: `0.0`
  - **Max tokens**: `400`
  - **Response format**: `JSON object`
- **Auth / Credential**:
  - Use credential **`ROAR OpenAI`**.
- **Messages configuration**:
  - **System**: full prompt from `§12.5`.
  - **User**: `{{JSON.stringify($json.user_message)}}`
- **Expected response** (per §12.5):

```json
{
  "actions_taken": ["string"],
  "outcome": "success",
  "notes": "string"
}
```

#### N11 — Route by Dispute Type

- **Name**: `Route by Dispute Type`
- **Type**: `Switch`
- **Purpose**: Decide which downstream records to create based on `dispute_type`.
- **Property to check**:
  - `{{$items('Fetch Case + Plan')[0].json.dispute_type}}`
- **Branches**:
  - Case A: `refund` → `N12 Create Refund Record`
  - Case B: `delivery` → `N13 Create Return Record`

#### N12 — Create Refund Record

- **Name**: `Create Refund Record`
- **Type**: `HTTP Request`
- **Purpose**: For refund disputes, create a refund request record.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/refund_requests`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "case_id": "{{$items('Fetch Case + Plan')[0].json.id}}",
  "order_id": "{{$items('Fetch Case + Plan')[0].json.order_id}}",
  "amount": {{$items('Fetch Case + Plan')[0].json.resolution_plan.amount}},
  "reason": "{{$items('Fetch Case + Plan')[0].json.resolution_plan.steps[0]}}",
  "status": "pending"
}
```

#### N13 — Create Return Record

- **Name**: `Create Return Record`
- **Type**: `HTTP Request`
- **Purpose**: For delivery disputes (e.g. replacement/return), create a return request record.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/return_requests`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "case_id": "{{$items('Fetch Case + Plan')[0].json.id}}",
  "order_id": "{{$items('Fetch Case + Plan')[0].json.order_id}}",
  "item_ids": {{$items('Fetch Case + Plan')[0].json.information_bundle.order_items.map(i => i.item_id)}},
  "return_reason": "{{$items('Fetch Case + Plan')[0].json.resolution_plan.steps[0]}}",
  "status": "pending"
}
```

#### N14 — Update Case - Resolved

- **Name**: `Update Case - Resolved`
- **Type**: `HTTP Request`
- **Purpose**: Mark the case as resolved and record `resolution_actions`.
- **Method**: `PATCH`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Case + Plan')[0].json.id}}`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "status": "resolved",
  "resolution_actions": {{$json.actions_taken}},
  "resolution_outcome": "{{$json.outcome}}",
  "resolution_notes": "{{$json.notes}}"
}
```

#### N15 — Post Resolution Message

- **Name**: `Post Resolution Message`
- **Type**: `HTTP Request`
- **Purpose**: Send the final resolution message to the customer.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/cases/{{$items('Fetch Case + Plan')[0].json.id}}/messages`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "content": "{{$items('Fetch Case + Plan')[0].json.resolution_plan.customer_message}}",
  "sender_type": "ai"
}
```

## Branching & connections summary

- **Switch branches (N11)**:
  - `dispute_type === "refund"` → `N12 Create Refund Record` → `N14 Update Case - Resolved`
  - `dispute_type === "delivery"` → `N13 Create Return Record` → `N14 Update Case - Resolved`
- **Top-level flows**:
  - **Plan**: `N1 → N2 → N3 → N4 → N5 → N6`
  - **Execute**: `N7 → N8 → N9 → N10 → N11 → (N12 or N13) → N14 → N15`

## System prompts

- **Plan Phase system prompt** — from `ROAR_n8n_Spec_v2.0 §12.4`.
  - **Node**: `N4 GPT-4o-mini Plan Call`

```text
You are ROAR's resolution agent --- Phase 1.                                               

Generate a resolution plan for a dispute that has passed autonomous triage.                 

RESOLUTION TYPES: refund | replacement | redelivery | store_credit                       

- refund: monetary refund for confirmed transaction amount                                 

- replacement: new shipment for affected items                                             

- redelivery: rearrange delivery for delayed shipment                                      

- store_credit: credit if refund not applicable                                            

GUIDELINES:                                                                                

- steps: 3-5 clear actionable instructions.                                               

- amount: THB value, only for refund type, null otherwise.                                 

- customer_message: professional, empathetic, specific to resolution.                      

RESPONSE FORMAT --- valid JSON only:                                                       

{ "resolution_type": "refund" | "replacement" | "redelivery" | "store_credit", 

"amount": number | null,                                                                 

"steps": ["string"],                                                                  

"customer_message": "string" }                                                          
```

- **Execute Phase system prompt** — from `ROAR_n8n_Spec_v2.0 §12.5`.
  - **Node**: `N10 GPT-4o-mini Execute Call`

```text
You are ROAR's resolution agent --- Phase 2. The resolution plan has been approved. 

Confirm execution of the plan and report actions taken.                              

RESPONSE FORMAT --- valid JSON only:                                                 

{ "actions_taken": ["string description of each step executed"],               

"outcome": "success" | "partial" | "failed",                              

"notes": "string" }                                                             
```

