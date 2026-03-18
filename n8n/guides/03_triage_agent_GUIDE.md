## WF3 — Triage Agent (03_triage_agent.json)

## How to build this in n8n UI

### Step 1: Create workflow

Create a new workflow named exactly:

- **Workflow name**: `ROAR Workflow - Triage Agent`

### Step 2: Add nodes in order (N1–N11)

- **N1**: `Webhook Trigger` — type `Webhook`
- **N2**: `Fetch Full Case` — type `HTTP Request`
- **N3**: `Fetch Policies` — type `HTTP Request`
- **N4**: `Build Triage Prompt` — type `Code` (JavaScript)
- **N5**: `GPT-4o-mini Triage Call` — type `OpenAI Chat Model`
- **N6**: `Parse + Validate` — type `Code` (JavaScript)
- **N7**: `Route on Decision` — type `Switch`
- **N8**: `Update - Awaiting Approval` — type `HTTP Request`
- **N9**: `Trigger Resolution Plan` — type `HTTP Request`
- **N10**: `Update - Escalated` — type `HTTP Request`
- **N11**: `Trigger Summarization` — type `HTTP Request`

### Step 3: Connect nodes (graph & branches)

- **Main spine**:
  - `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Fetch Policies` → `N4 Build Triage Prompt` → `N5 GPT-4o-mini Triage Call` → `N6 Parse + Validate` → `N7 Route on Decision`
- **Autonomous branch**:
  - `N7 Route on Decision` (routing_decision === "autonomous") → `N8 Update - Awaiting Approval` → `N9 Trigger Resolution Plan`
- **Escalation branch**:
  - `N7 Route on Decision` (routing_decision === "escalation") → `N10 Update - Escalated` → `N11 Trigger Summarization`

### Step 4: Credentials per node

- **Use credential `ROAR FastAPI`** (header `X-Webhook-Secret`) on:
  - `N1 Webhook Trigger` (Auth section)
  - `N9 Trigger Resolution Plan`
  - `N11 Trigger Summarization`
- **Use credential `ROAR FastAPI Bearer`** on:
  - `N2 Fetch Full Case`
  - `N3 Fetch Policies`
  - `N8 Update - Awaiting Approval`
  - `N10 Update - Escalated`
- **Use credential `ROAR OpenAI`** on:
  - `N5 GPT-4o-mini Triage Call`

### Step 5: System prompt location

- **Node**: `N5 GPT-4o-mini Triage Call`
- **System prompt source**: `ROAR_n8n_Spec_v2.0 §12.2 (WF3 — Triage Agent)`
- Paste the full system prompt from §12.2 into the **System** field of the OpenAI Chat Model node.

## Node-by-node configuration

### N1 — Webhook Trigger

- **Name**: `Webhook Trigger`
- **Type**: `Webhook`
- **Purpose**: Triggered by WF2 when the information bundle is ready and triage should run.
- **URL / Path**:
  - **Path**: `triage-complete`
  - **Method**: `POST`
  - **Response mode**: `Last Node`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Expected request body**:

```json
{
  "case_id": "uuid",
  "dispute_type": "refund"
}
```

### N2 — Fetch Full Case

- **Name**: `Fetch Full Case`
- **Type**: `HTTP Request`
- **Purpose**: Load the full case record including `information_bundle`.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/cases/{{$json.body.case_id}}`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Response expectations**:
  - JSON case object including at least `information_bundle`, `dispute_type`, and customer details.

### N3 — Fetch Policies

- **Name**: `Fetch Policies`
- **Type**: `HTTP Request`
- **Purpose**: Retrieve active store, payment, return, delivery, and SLA policies for use in triage.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/policies?category=in.(store,payment,return,delivery,sla)&select=slug,title,content`
- **Headers**:
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Response expectations**:
  - JSON array `policies` with fields `slug`, `title`, `content`.

### N4 — Build Triage Prompt

- **Name**: `Build Triage Prompt`
- **Type**: `Code` (JavaScript)
- **Purpose**: Construct the system and user messages for the triage LLM using information bundle, rules, and policies.
- **Inputs**:
  - Case from `N2`.
  - Policies from `N3`.
- **Body template (example)**:

```javascript
const caseData = $items('Fetch Full Case')[0].json;
const policies = $items('Fetch Policies')[0].json;

const current_date = new Date().toISOString().split('T')[0];

const user_message = {
  information_bundle: caseData.information_bundle,
  dispute_type: caseData.dispute_type,
  triage_rules: [], // optional explicit list if you want, otherwise derive from spec
  policy_context: policies,
  current_date
};

return [{
  json: {
    system_prompt: null, // left null; actual system text is set directly in N5 from §12.2
    user_message
  }
}];
```

- **Response expectations**:
  - JSON with `user_message` used as input to the LLM node.

### N5 — GPT-4o-mini Triage Call

- **Name**: `GPT-4o-mini Triage Call`
- **Type**: `OpenAI Chat Model`
- **Purpose**: Evaluate triage rules and decide whether the case can be handled autonomously or must be escalated.
- **Model settings**:
  - **Model**: `gpt-4o-mini`
  - **Temperature**: `0.0`
  - **Max tokens**: `800`
  - **Response format**: `JSON object` (OpenAI JSON mode ON)
- **Auth / Credential**:
  - Use credential **`ROAR OpenAI`**.
- **Messages configuration**:
  - **System**:
    - Paste the full system prompt from `ROAR_n8n_Spec_v2.0 §12.2 (WF3 — Triage Agent)`.
  - **User**:
    - Use the `user_message` constructed by `N4`. Example expression:
    - `{{JSON.stringify($json.user_message)}}`
- **Response expectations**:
  - JSON matching the schema in §12.2:

```json
{
  "routing_decision": "autonomous",
  "rules_evaluated": [
    {
      "rule": "string",
      "passed": true,
      "evidence": "string"
    }
  ],
  "justification": "string",
  "policies_applied": ["slug"],
  "slas_applied": ["slug"]
}
```

### N6 — Parse + Validate

- **Name**: `Parse + Validate`
- **Type**: `Code` (JavaScript)
- **Purpose**: Safely parse and validate the LLM JSON response, defaulting to escalation on error.
- **Body template (example)**:

```javascript
let raw = $json;
let decision;

try {
  // If node already returns parsed JSON in JSON mode, skip JSON.parse
  decision = raw;
  if (typeof raw === 'string') {
    decision = JSON.parse(raw);
  }
} catch (e) {
  decision = null;
}

const safeDecision = decision && (decision.routing_decision === 'autonomous' || decision.routing_decision === 'escalation')
  ? decision
  : {
      routing_decision: 'escalation',
      rules_evaluated: [],
      justification: 'Triage error — manual review required.',
      policies_applied: [],
      slas_applied: []
    };

return [{ json: safeDecision }];
```

- **Response expectations**:
  - A single JSON object with a guaranteed `routing_decision` in `["autonomous","escalation"]`.

### N7 — Route on Decision

- **Name**: `Route on Decision`
- **Type**: `Switch`
- **Purpose**: Split flow into autonomous vs escalation branches.
- **Property to check**:
  - `{{$json.routing_decision}}`
- **Conditions**:
  - Case A: equals `autonomous` → autonomous branch.
  - Case B: equals `escalation` → escalation branch.

### N8 — Update - Awaiting Approval

- **Name**: `Update - Awaiting Approval`
- **Type**: `HTTP Request`
- **Purpose**: For autonomous path, persist triage decision and set the case to awaiting approval.
- **Method**: `PATCH`
- **URL**:
  - `http://localhost:8000/cases/{{$json.case_id || $items('Fetch Full Case')[0].json.id}}`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "status": "awaiting_approval",
  "resolution_path": "autonomous",
  "triage_decision": {{$json}}
}
```

- **Response expectations**:
  - Updated case with `status='awaiting_approval'` and `triage_decision` set.

### N9 — Trigger Resolution Plan

- **Name**: `Trigger Resolution Plan`
- **Type**: `HTTP Request`
- **Purpose**: Trigger WF5 phase 1 to generate a resolution plan.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/webhooks/resolution-plan`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body template (JSON)**:

```json
{
  "case_id": "{{$items('Fetch Full Case')[0].json.id}}"
}
```

- **Response expectations**:
  - Acknowledgment from FastAPI; WF5 phase 1 (`/webhooks/resolution-plan`) starts.

### N10 — Update - Escalated

- **Name**: `Update - Escalated`
- **Type**: `HTTP Request`
- **Purpose**: For escalation path, persist triage decision and mark case as requiring human escalation.
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
  "status": "escalated_human_required",
  "resolution_path": "escalation",
  "triage_decision": {{$json}}
}
```

- **Response expectations**:
  - Updated case with `status='escalated_human_required'` and `resolution_path='escalation'`.

### N11 — Trigger Summarization

- **Name**: `Trigger Summarization`
- **Type**: `HTTP Request`
- **Purpose**: Trigger WF4 (Summarization Agent) for escalated cases.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/webhooks/triage-escalation`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body template (JSON)**:

```json
{
  "case_id": "{{$items('Fetch Full Case')[0].json.id}}"
}
```

- **Response expectations**:
  - Acknowledgment from FastAPI; WF4 (`/webhooks/triage-escalation`) starts.

## Branching & connections summary

- **Switch branches (N7)**:
  - `N7 (Route on Decision)` routes:
    - `routing_decision === "autonomous"` → `N8 Update - Awaiting Approval` → `N9 Trigger Resolution Plan`
    - `routing_decision === "escalation"` → `N10 Update - Escalated` → `N11 Trigger Summarization`
- **Top-level flow**:
  - `N1 Webhook Trigger` → `N2 Fetch Full Case` → `N3 Fetch Policies` → `N4 Build Triage Prompt` → `N5 GPT-4o-mini Triage Call` → `N6 Parse + Validate` → `N7 Route on Decision` → (autonomous/escalation subflows above)

## System prompts

- **Triage Agent system prompt** (WF3 — Triage Agent) — from `ROAR_n8n_Spec_v2.0 §12.2`.
  - **Node**: `N5 GPT-4o-mini Triage Call`
  - **Where to paste**: OpenAI Chat Model node → `System` field.

```text
You are ROAR's triage agent. Apply rule-based retail policies to an information bundle          

and determine whether a dispute can be resolved autonomously or must be escalated.               

You will receive: information_bundle, triage_rules, policy_context, current_date.                

EVALUATION RULES:                                                                               

- Evaluate every rule in triage_rules. Return pass or fail for each.                            

- ALL rules pass → routing_decision = autonomous                                                

- ANY rule fails → routing_decision = escalation                                                

- Any data source null or empty → rule failure → routing_decision = escalation                  

- Reference specific data values in your evidence field.                                        

RESPONSE FORMAT --- valid JSON only:                                                            

{ "routing_decision": "autonomous" | "escalation",                                       

"rules_evaluated": [ { "rule": "string", "passed": bool, "evidence": "string" } ], 

"justification": "paragraph",                                                               

"policies_applied": ["slug"],                                                             

"slas_applied": ["slug"] }                                                                
```

