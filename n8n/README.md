# ROAR Engine - n8n Workflows

This directory documents the active ROAR n8n workflow layer as it exists in the live MCP-accessible workspace on `2026-04-03`.

This README is a workflow reference only. It does not change workflow logic and should be read as documentation for the current orchestration design across:

- intake and proof gating
- data retrieval and bundle assembly
- deterministic triage
- escalation summarization
- resolution planning and execution
- final case reporting

## Scope

The six workflows form a chained operational pipeline:

1. `WF1` receives a newly created case and decides whether to ask questions, request proof, classify the intake, or stop and wait.
2. `WF2` gathers internal operational data and writes a normalized `information_bundle` onto the case.
3. `WF3` performs deterministic triage and routes the case into autonomous execution, approval, customer decision, or escalation.
4. `WF4` writes an escalation handoff summary for human handling.
5. `WF5` either creates a pre-approval resolution plan and pending request records, or executes an approved outcome.
6. `WF6` creates a final permanent case report when the conversation is closed.

## Import Order

Import workflows in this order after credentials are configured:

1. `01_intake_agent.json`
2. `02_data_retrieval.json`
3. `03_triage_agent.json`
4. `04_summarization.json`
5. `05_resolution.json`
6. `06_case_report.json`

## Required Credentials

The active workflows rely on these credential classes:

- `ROAR OpenAI`
- `ROAR FastAPI`
- `ROAR FastAPI Bearer`

In addition, the workflows call internal ROAR API endpoints and internal n8n webhook handoff URLs. This README intentionally describes those interfaces without changing them.

## Workflow Chain

| Workflow | Purpose | Trigger | Typical Next Step |
| --- | --- | --- | --- |
| `WF1` Intake Agent | Gather missing intake context and proof | `POST /webhook/case-created` | Ask customer, request proof, or trigger `WF2` |
| `WF2` Data Retrieval Agent | Build normalized case context from internal systems | `POST /webhook/bundle-ready` | Trigger `WF3` |
| `WF3` Triage Agent | Apply deterministic rules and route case | `POST /webhook/triage-complete` | Trigger `WF4`, `WF5`, or wait for customer/approver |
| `WF4` Summarization Agent | Create human-ready escalation summary | `POST /webhook/triage-escalation` | Save summary and notify customer |
| `WF5` Resolution Agent | Create resolution plan, pending requests, or execute approved outcome | `POST /webhook/resolution-plan`, `POST /webhook/approved` | Create request records, resolve case, notify customer |
| `WF6` Case Report Agent | Write final audit report for closed case | `POST /webhook/conversation-closed` | Persist final report |

## Shared Conventions

Across the workflow chain, a few fields are central:

- `case_id`: the primary case identifier used in every workflow handoff.
- `status`: the current case lifecycle state.
- `dispute_type`: the top-level category such as refund or delivery.
- `dispute_subtype`: the canonical subtype used for routing logic.
- `resolution_preference`: the customer-requested outcome.
- `triage_decision`: deterministic decision object written by `WF3`.
- `resolution_plan`: planned operational steps written by `WF5`.
- `information_bundle`: normalized bundle written by `WF2`.
- `invalid_reason_code` and `invalid_reason_detail`: structured explanation for blocked or customer-decision paths.

The documented statuses used by the workflows include:

- `pending_triage`
- `awaiting_customer_proof`
- `awaiting_customer_decision`
- `awaiting_approval`
- `approved_executing`
- `escalated_human_required`
- `resolved`

## WF1 - Intake Agent

### Purpose

`WF1` is the customer-intake controller. It decides whether the case still needs a follow-up question, needs proof before triage, is ready to move downstream, or must remain waiting because the system is already expecting customer action.

It is not the final dispute decision-maker. Its job is to produce a clean, bounded intake state so deterministic triage can run on usable data.

### Trigger

- Production webhook: `POST /webhook/case-created`

### Core Responsibilities

- Fetch the current case record and transcript.
- Detect order-level blockers early, including cancelled orders.
- Count prior intake follow-up questions.
- Build an intake prompt using case state, transcript, proof context, and sequencing rules.
- Ask at most three follow-up questions.
- Enforce subtype-specific intake sequencing for:
  - `damaged_goods`
  - `wrong_item`
  - `partial_fulfillment`
- Respect waiting states:
  - `awaiting_customer_proof`
  - `awaiting_customer_decision`
- Prevent looped or repeated questions.
- Escalate if the system still lacks usable intake context.

### Input

The webhook starts with a minimal payload that includes:

```json
{
  "case_id": "uuid"
}
```

The workflow then enriches itself by fetching:

- the full case record from `/cases/{case_id}`
- the message transcript from `/cases/{case_id}/messages`

### Internal Decision Model

The LLM phase is tightly constrained to emit one of four actions:

- `ask_question`
- `ask_for_proof`
- `classify_intent`
- `await_customer_decision`

The parser then normalizes and validates that action against current case state. The workflow explicitly handles:

- proof-required cases that should stop normal questioning
- item-scope clarification such as all items vs some items
- item-selection prompts only when the customer indicated a subset
- damage-detail prompts for `damaged_goods`
- same-question loop prevention

### Outputs and Side Effects

Depending on the branch, `WF1` performs one of these actions:

1. Ask an intake follow-up question
   - Posts an AI message to the case thread.
   - Marks message metadata with `role: intake_question`.

2. Ask for proof
   - Posts an AI proof request message.
   - Marks message metadata with `role: proof_request`.
   - Keeps the case in a proof-waiting path.

3. Confirm the intake is ready
   - Patches the case status to `pending_triage`.
   - Clears stale invalidation and appeal fields.
   - Triggers `WF2` through `POST /webhook/bundle-ready`.

4. Wait for customer decision
   - Returns without advancing intake.

5. Escalate for insufficient context
   - Posts a customer-visible escalation message.
   - Patches the case to `escalated_human_required`.
   - Stores `invalid_reason_code: insufficient_context`.

### Handoff to WF2

When intake is complete, `WF1` calls `WF2` with a payload shaped like:

```json
{
  "case_id": "uuid",
  "dispute_type": "refund|delivery|...",
  "order_id": "order-id",
  "dispute_subtype": "canonical_subtype",
  "resolution_preference": "refund|replacement|return|null",
  "status": "pending_triage",
  "proof_requirements": {},
  "proof_uploads": [],
  "evidence_bundle": {},
  "intent": "valid_dispute",
  "intent_summary": "Customer provided sufficient intake context for triage."
}
```

## WF2 - Data Retrieval Agent

### Purpose

`WF2` assembles the operational context required by deterministic triage. It converts scattered source-system responses into one normalized `information_bundle` stored on the case.

This is the workflow that makes later stages less dependent on raw upstream schemas.

### Trigger

- Production webhook: `POST /webhook/bundle-ready`

### Core Responsibilities

- Load the current case.
- Query internal order-management data.
- Query payment transaction data.
- Query prior refund data.
- Query logistics data only when the dispute type is `delivery`.
- Query inventory data only when the requested resolution path is `replacement`.
- Pull the latest transcript for proof and intake context.
- Infer affected item IDs from:
  - direct case fields
  - transcript metadata
  - customer free text matched against ordered items
- Build a normalized bundle with both legacy and canonical fields.

### Input

`WF2` expects a handoff payload from `WF1` containing at minimum:

```json
{
  "case_id": "uuid",
  "order_id": "order-id",
  "dispute_type": "string",
  "dispute_subtype": "string",
  "resolution_preference": "refund|replacement|return|null"
}
```

It does not rely only on the webhook body; it re-fetches the case as source of truth.

### Sources Queried

Depending on case type and preference, `WF2` may query:

- OMS / order data
- payment transaction data
- prior refund records
- shipment and tracking data
- inventory data
- case transcript and proof-related messages

### Output

The main product of `WF2` is a normalized `information_bundle` written back to the case. Important sections include:

- `order_data`
- `payment_records`
- `shipment_data`
- `order_items_detail`
- `affected_item_ids`
- `affected_items_detail`
- `proof_requirements`
- `proof_uploads`
- `proof_analysis`
- `proof_analysis_status`
- `evidence_bundle`
- `proof_messages`
- `proof_attachments`
- `intake_messages`
- `recent_transcript`
- `invalid_reason_code`
- `invalid_reason_detail`
- `appeal_priority`
- `queried_at`

It also preserves some legacy compatibility keys such as:

- `order`
- `order_items`
- `transaction`
- `refund_records`
- `shipment`
- `tracking_events`
- `stock_records`

### Side Effects

- Patches the case with `information_bundle`.
- Triggers `WF3` through `POST /webhook/triage-complete`.

### Handoff to WF3

The trigger payload contains:

```json
{
  "case_id": "uuid",
  "dispute_type": "string",
  "order_id": "order-id",
  "dispute_subtype": "string",
  "resolution_preference": "string|null",
  "information_bundle": {}
}
```

## WF3 - Triage Agent

### Purpose

`WF3` is the deterministic routing engine. It reads the fully enriched case plus policy context and decides whether ROAR should:

- execute automatically
- wait for approver action
- wait for customer decision
- escalate to a human agent

This workflow owns the primary decision object that downstream operations use.

### Trigger

- Production webhook: `POST /webhook/triage-complete`

### Core Responsibilities

- Fetch the latest full case.
- Fetch policy data from `/policies`.
- Normalize case, bundle, proof, delivery, refund, return, and replacement facts.
- Evaluate subtype-specific deterministic logic.
- Compute final case routing.
- Patch the case with status, resolution path, and structured triage decision data.
- Trigger either summarization or resolution downstream.

### Inputs

The webhook handoff from `WF2` includes the case identifier and enriched bundle, but `WF3` still reloads the case record for authoritative state.

Internally, it constructs a rich `user_message` that includes:

- case metadata
- `information_bundle`
- proof context
- policy context
- normalized fact sets for:
  - refund
  - delivery
  - replacement
  - return
  - affected items
- transcript context

### Decision Outputs

`WF3` routes to one of four allowed outcomes:

- `approved_executing`
- `awaiting_approval`
- `escalated_human_required`
- `awaiting_customer_decision`

The triage object it writes includes fields such as:

- `triage_decision`
- `resolution_type`
- `reason`
- `eligible_amount`
- `tracking_evidence`
- `replacement_items`
- `requires_human_review`

For customer-decision paths it can also set:

- `invalid_reason_code`
- `invalid_reason_detail`

### Deterministic Rules Covered

The logic in the active workflow covers at least these classes of rules:

- payment confirmation blockers
- duplicate refund risk
- refund autonomous threshold of `THB 500`
- replacement autonomous threshold of `THB 500`
- return window of `7` days
- returns never being autonomous
- inventory feasibility for replacements
- delivery evidence and tracking-event checks
- proof-required and proof-contradiction behavior
- subtype-specific logic for:
  - `duplicate_charge`
  - `not_as_described`
  - `damaged_goods`
  - `wrong_item`
  - `partial_fulfillment`
  - `return_request`
  - `changed_mind`
  - `other`
  - `non_receipt`
  - `delayed`
  - `exception`
  - `lost`

### Side Effects by Branch

1. `approved_executing`
   - Patches case to `approved_executing`
   - Sets `resolution_path: autonomous`
   - Triggers `WF5` planning through `POST /webhook/resolution-plan`
   - Immediately triggers `WF5` execution through `POST /webhook/approved`

2. `awaiting_approval`
   - Patches case to `awaiting_approval`
   - Persists triage decision fields
   - Triggers `WF5` planning only

3. `escalated_human_required`
   - Patches case to `escalated_human_required`
   - Sets `resolution_path: escalation`
   - Triggers `WF4` through `POST /webhook/triage-escalation`

4. `awaiting_customer_decision`
   - Patches case to `awaiting_customer_decision`
   - Persists invalidation fields
   - Waits for customer close or appeal

## WF4 - Summarization Agent

### Purpose

`WF4` creates the internal human-handoff summary for escalated cases. It is meant for CX or escalation agents, not for the customer.

It translates final deterministic triage output and supporting evidence into a short operational briefing.

### Trigger

- Production webhook: `POST /webhook/triage-escalation`

### Core Responsibilities

- Fetch the full escalated case.
- Build a compact prompt that prioritizes final triage fields.
- Generate a structured escalation summary.
- Validate the response and fall back safely if the model output is malformed.
- Save the summary onto the case.
- Post a customer-safe escalation notice.

### Input

Minimal trigger:

```json
{
  "case_id": "uuid"
}
```

The workflow then fetches the full case and builds a prompt using:

- case metadata
- `triage_decision`
- invalid-reason fields
- proof analysis and evidence bundle
- order, shipment, payment, and stock facts
- affected items
- transcript context

### Expected Model Output

The LLM is instructed to return:

```json
{
  "summary": "string",
  "key_facts": ["string"],
  "escalation_reason": "string",
  "recommended_action": "string",
  "data_sources_queried": ["string"],
  "policies_relevant": ["string"]
}
```

### Side Effects

- Patches `escalation_summary` onto the case.
- Posts a system message to the customer thread stating that a live specialist will review the case.

### Output Character

The saved summary is intentionally:

- short
- deterministic-first
- grounded in actual triage and evidence fields
- suitable for human handoff rather than customer display

## WF5 - Resolution Agent

### Purpose

`WF5` is split into two phases:

1. Planning phase for cases that have been triaged but not yet executed.
2. Execution phase for cases that are approved for completion.

This workflow is responsible for creating operational request records and closing out resolved cases.

### Triggers

- Planning trigger: `POST /webhook/resolution-plan`
- Execution trigger: `POST /webhook/approved`

### Phase 1: Resolution Planning

#### Purpose

Generate a stored `resolution_plan` and, when the case is in `awaiting_approval`, create the pending request record that approvers or escalation agents will act on.

#### Planning Inputs

The workflow fetches the case and builds a prompt from:

- case metadata
- `triage_decision`
- resolved `resolution_type`
- `information_bundle`
- `affected_items_detail`

#### Planning Output

The planning model is constrained to:

```json
{
  "resolution_type": "refund|replacement|return",
  "amount": 123.45,
  "steps": ["string"],
  "customer_message": "string"
}
```

The workflow validates and normalizes this result, then writes it into:

- `resolution_plan.resolution_type`
- `resolution_plan.amount`
- `resolution_plan.steps`
- `resolution_plan.customer_message`
- `resolution_plan.affected_item_ids`
- `resolution_plan.replacement_items`
- `resolution_plan.shipping_fee_refund_only`

#### Pending Request Creation

If the current case status is `awaiting_approval`, `WF5` then creates the pending operational record matching the resolution type:

- refund -> `POST /refund_requests`
- replacement -> `POST /replacement-requests`
- return -> `POST /return_requests`

These records are created with `status: pending`.

### Phase 2: Approved Execution

#### Purpose

Handle the branch where execution is authorized, either because triage marked the case autonomous or because an approver advanced it.

#### Execution Inputs

The execution branch loads:

- the full case
- `triage_decision`
- `resolution_plan`
- `information_bundle`

#### Execution Decision

The workflow routes by authoritative resolution type:

- `refund`
- `replacement`
- `return`

#### Execution Side Effects

Depending on resolution type, it creates one final operational record:

- refund record via `/refund_requests`
- replacement record via `/replacement-requests`
- return record via `/return_requests`

It then:

- patches the case to `resolved`
- preserves `resolution_path`
- preserves `triage_decision`
- preserves `resolution_plan`
- builds a final customer-facing system message
- posts that message to the case thread

### Customer Messaging

`WF5` generates or reuses a customer message suitable for the executed outcome, including:

- refund amount and settlement timing when available
- replacement confirmation
- return next-step notice

### Outputs

Persistent outputs written by `WF5` include:

- `resolution_plan`
- pending request records for approval-path cases
- final request records for executed cases
- case status `resolved`
- customer resolution message in the transcript

## WF6 - Case Report Agent

### Purpose

`WF6` is the final audit writer. When a conversation is closed, it compiles the permanent case report using the final case record and latest transcript.

This is the archival workflow rather than an operational decision workflow.

### Trigger

- Production webhook: `POST /webhook/conversation-closed`

### Core Responsibilities

- Fetch the full case.
- Fetch the full chat transcript.
- Trim and sanitize the latest transcript slice.
- Strip debug-heavy fields from nested objects.
- Build a report prompt from the final case state.
- Validate the resulting report JSON.
- Persist the report through the case-report API endpoint.

### Input

Trigger payload includes:

```json
{
  "case_id": "uuid",
  "closed_by": "user-or-role",
  "close_reason": "string"
}
```

The workflow supplements this with:

- final stored `triage_decision`
- final stored `resolution_plan`
- final evidence and proof fields
- case-level invalidation or rejection context
- latest transcript messages

### Expected Report Shape

The LLM is constrained to return a JSON report containing:

- `intent_classification`
- `data_sources_queried`
- `policies_applied`
- `slas_applied`
- `triage_decision`
- `resolution_path`
- `approval_outcome`
- `rejection_reason`
- `resolution_actions`
- `evidence_bundle`
- `proof_uploads`
- `outcome_summary`
- `close_reason`

### Validation and Fallback

If the model output is malformed or incomplete, the workflow falls back to:

- case-derived identity fields
- final stored triage and resolution objects
- current evidence and proof state
- a minimal generated outcome summary

### Final Side Effect

The workflow writes the permanent case report by calling:

- `POST /cases/{case_id}/report`

## Webhook Reference

| Webhook | Used By | Purpose |
| --- | --- | --- |
| `/webhook/case-created` | `WF1` | Start intake workflow |
| `/webhook/bundle-ready` | `WF2` | Start data retrieval after intake is ready |
| `/webhook/triage-complete` | `WF3` | Start deterministic triage |
| `/webhook/triage-escalation` | `WF4` | Start escalation summarization |
| `/webhook/resolution-plan` | `WF5` | Start plan generation and pending request creation |
| `/webhook/approved` | `WF5` | Start execution for approved/autonomous outcomes |
| `/webhook/conversation-closed` | `WF6` | Start final report generation |

## Stored Objects Created Across the Chain

The workflow layer writes or updates these major case-level objects:

- `information_bundle`
- `triage_decision`
- `resolution_plan`
- `escalation_summary`
- final case report

It also creates operational request records in the backend:

- refund requests
- replacement requests
- return requests

## Operational Notes

- `WF1` and `WF4` use constrained LLM outputs but both include parser and fallback handling.
- `WF3` is the primary deterministic workflow and should be treated as the routing source of truth.
- `WF5` respects `triage_decision.resolution_type` as authoritative and is not supposed to reinterpret the outcome.
- `WF6` preserves the final stored case state rather than recomputing business logic.
- The workflows are tightly coupled to ROAR backend APIs and should be documented carefully before any schema changes.

## Reference

For broader implementation context, also see:

- [`docs/ROAR_n8n_Spec_v2.1.md`](C:/Users/Keith/Documents/ROAR/docs/ROAR_n8n_Spec_v2.1.md)
- [`docs/ROAR_Full_Features.md`](C:/Users/Keith/Documents/ROAR/docs/ROAR_Full_Features.md)
