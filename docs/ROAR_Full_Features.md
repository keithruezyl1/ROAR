# ROAR Full Features Document

**Changelog**

  **Version**   **Date**     **Change**                                                                    **Section(s)**
  v1.0          April 2026   Initial release                                                               All

  v1.1          April 2026   Added Changelog header and version tracking                                   All

Date: 2026-04-03  
Status: Current-state feature inventory after manual E2E testing  

## 1. Purpose

This document describes the full current-state feature set of ROAR across:

- customer-facing intake and chat
- backend dispute/case APIs
- workflow automation in n8n
- approver operations
- escalation / CX agent operations
- proof upload and proof-analysis handling
- reporting and case closure

It is intended to serve as a practical product and implementation reference for what the system currently does, how the pieces fit together, and what behavior has already been manually validated.

## 2. Validation Sources

This document is informed by the live repo implementation and by the most recent manual testing artifacts:

- [ROAR_Manual_E2E_Run_Guide.md](testing/ROAR_Manual_E2E_Run_Guide.md)
- [roar_test_checklist.xlsx](testing/roar_test_checklist.xlsx)

The working checklist also has a CSV mirror in the repo:

- [roar_test_checklist_csv.csv](testing/roar_test_checklist_csv.csv)

Based on the current checklist record, the tested scenarios were marked as passing overall, with some scenarios noting issues that were subsequently addressed during the implementation/testing cycle.

## 3. System Overview

ROAR is a dispute-resolution operations system that combines:

- a Next.js frontend
- a FastAPI backend
- deterministic backend logic
- n8n workflows (`WF1` through `WF6`)
- structured case/request records in the database

The system is designed to:

- collect customer dispute intake in a structured way
- enrich cases with operational data from internal sources
- deterministically triage cases into autonomous, approval-required, customer-decision, or escalation paths
- execute refund / return / replacement outcomes when allowed
- hand cases off to approvers or escalation agents when automation should not finish alone
- keep a customer-facing chat history plus internal operational artifacts

## 4. Primary User Roles

### Customer

Customers can:

- log in and view their cases
- open a case through the chat/intake experience
- answer structured follow-up questions
- upload proof images where required
- respond to customer-decision prompts
- appeal a blocked decision to a human agent
- close their conversation

### Approver

Approvers can:

- view pending refund / return / replacement request cards
- open a live chat/case view
- approve or reject request records
- trigger downstream execution and customer notification through the request lifecycle

### Escalation / CX Agent

Escalation agents can:

- claim escalated cases
- view customer chat history and case context
- act on refund, return, and replacement outcomes
- close conversations after handling
- use an escalation-specific action surface rather than only reading a summary

## 5. High-Level End-to-End Flow

The current runtime flow is:

1. Customer creates a case.
2. Backend persists the case and triggers `WF1`.
3. `WF1` manages intake follow-up and proof gating.
4. Backend / workflow advances the case into `pending_triage`.
5. `WF2` builds an `information_bundle` from internal data sources.
6. `WF3` performs deterministic triage.
7. The case is routed into one of:
   - `approved_executing`
   - `awaiting_approval`
   - `awaiting_customer_decision`
   - `escalated_human_required`
8. `WF4` summarizes escalated cases for human handoff.
9. `WF5` plans or executes operational outcomes depending on branch and approval state.
10. `WF6` writes a final report when the conversation/case is closed.

## 6. Frontend Feature Set

### 6.1 Customer Chat Experience

The customer chat supports:

- a guided dispute creation flow
- case details display
- proof upload UI
- structured pill-based responses
- system/AI/customer message display
- uploaded image preview cards
- status-dependent banners and actions
- end-conversation control

#### Current customer chat behaviors

- The proof-request assistant message is preserved as the first message even after uploads.
- Uploaded proof images align correctly in the customer lane.
- The composer is now a compact one-row-height input.
- The case-details dropdown overlays the chat rather than pushing the stream down.
- The `Decision needed` component appears near the bottom of the chat window above the composer.
- The `Decision needed` message now asks whether the customer wants to appeal to a human specialist.

### 6.2 Structured Response UX

The chat UI supports structured response pills for common branching questions, including:

- all items affected vs only some items
- item-selection prompts
- other deterministic intake clarifications

Current refinements made:

- removed `I am not sure yet` from the scope prompt options
- removed `Other` from the `Which items are affected?` item-selection prompt

### 6.3 Proof Upload UX

Customers can:

- attach proof images
- preview selected files before upload
- upload up to the configured limit

Supported behaviors include:

- customer-facing proof request prompts by subtype
- uploaded image previews in chat
- persistence into the backend proof-upload records

### 6.4 Customer Account Controls

In customer chat:

- logout now follows the same avatar-pill pattern used in the customer case surfaces
- logout asks for confirmation before completing
- `End conversation` is a floating bottom-right action with clearer destructive hover state

## 7. Backend and API Feature Set

### 7.1 Core Case Management

The backend supports:

- case creation
- case retrieval
- case listing
- case patch/update
- case claim
- case close
- case appeal
- proof upload and deletion
- proof retrieval for authorized users

### 7.2 Case Status Model

The current case lifecycle includes these statuses:

- `pending_triage`
- `awaiting_customer_proof`
- `awaiting_customer_decision`
- `awaiting_approval`
- `approved_executing`
- `rejected_human_required`
- `escalated_human_required`
- `resolved`
- `closed`

Important current behavior:

- same-status updates are now treated idempotently for workflow safety
- replayed workflow updates do not fail simply because the case is already in the target status

### 7.3 Appeal-to-Human Path

The appeal path now works as a real backend feature:

- customer can appeal while the case is `awaiting_customer_decision`
- backend changes the case to `escalated_human_required`
- backend stores appeal metadata such as appeal priority
- backend posts a customer chat message indicating the appeal
- backend triggers `WF4` via the `triage-escalation` webhook

This is a major capability because it converts blocked or disputed automated outcomes into a human-handled path without abandoning the case.

### 7.4 Proof Retrieval Access

Proof-image access now supports:

- customer
- approver
- escalation

This means human operators can actually see uploaded images in live chat and case handling views.

## 8. n8n Workflow Feature Set

### WF1: Intake Agent

Current responsibilities:

- interpret current case state
- ask follow-up questions when intake details are missing
- ask for proof where required
- detect when enough context exists to continue
- prevent question loops or regressions

Current intake logic supports:

- subtype normalization
- scope questions for multi-item affected scenarios
- item-selection follow-up
- damage-detail follow-up
- proof-required routing
- waiting-state routing for `awaiting_customer_decision`
- waiting-state routing for `awaiting_customer_proof`

### WF2: Data Retrieval Agent

Current responsibilities:

- fetch operational data needed for triage
- assemble a normalized `information_bundle`

Current sources include:

- OMS / order data
- payment transactions
- prior refunds
- logistics / shipment data
- inventory
- transcript/proof context

Notable current behavior:

- payment lookup now runs before logistics/inventory routing
- delivery scenarios can still branch into logistics as needed
- replacement scenarios can still branch into inventory as needed

### WF3: Triage Agent

Current responsibilities:

- deterministic triage
- resolution-type normalization
- proof, payment, inventory, delivery, and policy checks

Current output patterns include:

- `approved_executing`
- `awaiting_approval`
- `awaiting_customer_decision`
- `escalated_human_required`

The deterministic triage output commonly includes:

- `triage_decision`
- `resolution_type`
- `reason`
- `eligible_amount`
- `requires_human_review`
- `tracking_evidence`
- `replacement_items`
- `invalid_reason_code`
- `invalid_reason_detail`

Notable current behavior:

- `delivery + non_receipt` logic was adjusted so valid autonomous outcomes do not escalate incorrectly
- approval-path payloads were normalized to match backend constraints

### WF4: Summarization Agent

Current responsibilities:

- generate an internal escalation handoff summary
- save that summary on the case
- post a customer-safe escalation notice

Current improvement direction:

- summaries should now be grounded in deterministic triage fields, invalid-reason codes, proof analysis, payment/tracking context, and affected items rather than generic bundle restatement

### WF5: Resolution Agent

Current responsibilities:

- build plan artifacts
- execute approved resolutions
- create and update operational request records
- resolve cases and notify the customer

Current features:

- top flow for planning / pre-approval work
- bottom flow for approved execution
- pending request creation for approval-path cases

Supported operational records:

- refund requests
- return requests
- replacement requests

### WF6: Case Report Agent

Current responsibilities:

- generate a final case report on close
- preserve evidence, proof, triage, and resolution context

Current improvements made:

- prompt/output parsing hardened
- duplicate/debug-heavy data trimmed
- fallback validation improved

## 9. Supported Request Types and Operational Records

ROAR currently supports structured operational records for:

- refunds
- returns
- replacements

These request records are surfaced in:

- approver dashboard cards
- approver live chat panels
- escalation live chat action tabs

### Refund requests

Current capabilities include:

- create full refund
- create partial refund
- deny refund
- mark duplicate / already refunded

### Return requests

Current capabilities include:

- create pending return request
- approve return
- reject return
- issue refund instead where applicable

### Replacement requests

Current capabilities include:

- create replacement request
- approve replacement
- start execution
- complete replacement
- reject replacement
- cancel replacement

## 10. Approver Feature Set

Approvers currently have:

- dashboard cards for pending refund / return / replacement work
- right-aligned action groups on cards
- live chat request action panels
- ability to approve/reject request records
- ability to drive approval-path cases through execution

This makes the approval queue a working operational surface rather than a passive dashboard.

## 11. Escalation / CX Agent Feature Set

Escalation agents currently have:

- escalation queue and case claim flow
- live chat view for claimed escalations
- request-action tab for escalation-side handling
- support for refund, return, and replacement resolution operations
- conversation close controls

Notable recent improvement:

- escalation actions no longer dead-end on non-refund cases
- replacement request handling is now available to escalation agents

## 12. Proof and Image-Analysis Features

Current proof-aware features include:

- subtype-based proof requirement detection
- upload gating before triage
- proof analysis status tracking
- proof analysis results embedded into the case bundle
- proof-aware triage behavior for contradictory or insufficient proof scenarios

Current proof-required subtypes include:

- `not_as_described`
- `damaged_goods`
- `wrong_item`
- `partial_fulfillment`

Current proof context available to triage/report/summarization includes:

- proof uploads
- proof analysis
- proof analysis status
- evidence bundle
- proof-related transcript messages

## 13. Resolution Path Features

The current system can support three broad outcome families:

### Autonomous

Examples:

- autonomous refund
- autonomous replacement

Typical behavior:

- case reaches `approved_executing`
- request record is created
- `WF5` executes the outcome
- case becomes `resolved`

### Approval-required

Examples:

- refund over threshold
- return requiring approval/inspection
- replacement over threshold

Typical behavior:

- case reaches `awaiting_approval`
- pending request record is created
- approver approves or rejects
- approved branch executes through `WF5`

### Customer-decision required

Examples:

- outside return window
- unsupported replacement path due to inventory
- insufficient or contradictory proof depending on scenario

Typical behavior:

- case reaches `awaiting_customer_decision`
- customer can close the case or appeal to a human

### Human escalation

Examples:

- payment not confirmed
- delivery conflicts
- policy exception / deterministic stop condition
- appealed blocked decision

Typical behavior:

- case reaches `escalated_human_required`
- `WF4` creates internal handoff summary
- escalation queue can act on the case

## 14. Current Business Rules Exposed in Frontend Constants

Current surfaced rules include:

- refund autonomous threshold: THB `500`
- return window: `7` days
- delivery SLA breach days: `3`
- inactivity timeout minutes: `15`
- maximum intake questions: `3`
- maximum proof uploads: `2`

These are not the only rules in the system, but they are the prominent currently exposed UI/business constants.

## 15. Documentation and Testing Features

The repo now includes:

- architecture/product docs
- manual workflow mapping docs
- BRL/PBD/PRD artifacts
- manual E2E run guide
- completed manual checklist artifacts
- scenario-specific proof/test images under `docs`

This means the system is not only implemented but also accompanied by:

- scenario-level manual validation guidance
- artifact-based issue tracking
- scenario-specific proof assets for regression testing

## 16. Tested Scenario Coverage

The current manual artifacts indicate coverage across:

- refund autonomous paths
- refund approval paths
- outside-window and invalidation paths
- duplicate-refund and payment-not-confirmed escalations
- delivery refund paths including non-receipt, delay, delivered conflict, and lost parcel
- return approval and changed-mind invalidation paths
- damaged-goods and partial-fulfillment proof paths
- replacement autonomous, approval, blocked, and human-escalation paths
- “other” subtype escalation
- missing-proof blocking
- proof contradiction scenarios
- invalid-case appeal behavior
- duplicate open-case handling

The manually tested cases recorded in the guide/checklist include:

- `B1` through `B5`
- `C1` through `C5`
- `D1` through `D2`
- `E1` through `E2`
- `F1` through `F5`
- `G1`
- `H1`
- `CD1` through `CD3`
- `A2`

Per the current checklist record, these scenarios were marked as passing overall, with notes recorded for issues discovered and, in many cases, fixed during the same testing cycle.

## 17. Current Strengths

ROAR currently already provides:

- structured intake instead of pure freeform support intake
- deterministic triage with explicit reasons
- proof-aware blocking and routing
- approval and escalation operational queues
- request-record-backed refund/return/replacement handling
- customer decision/appeal handling
- customer, approver, and escalation-specific interfaces
- workflow-backed execution and reporting
- real manual E2E validation coverage across a broad scenario set

## 18. Current Nuances and Intricacies

Several important operational nuances are part of the current product behavior:

- Approval-path cases require pending operational records before a human can meaningfully approve them.
- Escalation actions are not just conversation actions; they must align with request-record lifecycle rules.
- Proof contradictions are subtype-sensitive and depend on both image analysis and deterministic triage interpretation.
- Customer-decision states are not dead ends because the customer can now appeal to a human.
- Uploaded proof must be visible not just to the customer but also to approvers and escalation agents for proper handling.
- Summary quality for escalated cases depends on deterministic triage context, not generic case text.
- Workflow payload normalization matters because malformed strings or unsupported `resolution_path` values can break backend constraints.

## 19. Known Current Boundaries

This document describes the current implemented feature set, not a future roadmap.

There are still areas that may be improved further, but they do not negate the fact that the current system already supports:

- multi-role dispute handling
- proof-aware intake and triage
- approval and escalation operations
- workflow-driven execution
- final report generation

## 20. Conclusion

ROAR currently functions as a multi-surface dispute-resolution operations system with:

- a working customer intake/chat experience
- deterministic workflow-driven triage
- proof uploads and proof analysis
- operational refund / return / replacement handling
- approver and escalation action surfaces
- escalation handoff generation
- final case reporting

The combination of the implementation in this repo and the manually validated scenarios in:

- [ROAR_Manual_E2E_Run_Guide.md](C:\Users\Keith\Documents\ROAR\docs\ROAR_Manual_E2E_Run_Guide.md)
- [roar_test_checklist.xlsx](C:\Users\Keith\Documents\ROAR\docs\roar_test_checklist.xlsx)

shows that the system is not just conceptually designed, but exercised across a broad set of real end-to-end dispute scenarios.
