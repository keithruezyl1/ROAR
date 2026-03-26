**Changelog**

  **Version**   **Date**     **Change**                                                                                                                     **Section(s)**
  v1.0          March 2026   Initial release                                                                                                                All

  v1.1          March 2026   Retail context updated: removed 7-Eleven convenience store framing, replaced with Thai retail e-commerce / online delivery     §2, §13

  v1.1          March 2026   Live chat rules expanded: polling spec, role-differentiated termination, chat lock behavior, both-sides-terminate rule added   §10 (expanded)

  v1.1          March 2026   Database stack updated: Supabase replaced with PostgreSQL + FastAPI JWT throughout                                             §2, §13

  v1.1          March 2026   New companion docs added: Policies v1.0, Resolution Paths v1.0                                                                 §1

## 1. Document Overview
This document is the single authoritative source of truth for all business rules, decision logic, thresholds, policies, constraints, and system behaviors in ROAR Engine. Every rule defined here is implemented across the PRD, PBD, n8n Spec, and Design Guidelines. In any conflict between this document and another, this document takes precedence.

  **Field**             **Value**
  Document Type         Business Rules and Logic Specification

  Version               1.1

  Companion Docs        PRD v1.2, PBD v1.0, n8n Spec v2.0, Architecture v1.1, Design Guidelines v1.0, Policies v1.0, Resolution Paths v1.0

  Dispute Scope         Refund disputes and delivery disputes (MVP)

  Currency              Thai Baht (฿) --- all monetary thresholds in THB

  Timezone              Asia/Bangkok (UTC+7)

  Target Context        Thai retail enterprises with online ordering and delivery channels

## 2. System Constants and Thresholds
Canonical values for all configurable thresholds. Change here first --- all other documents derive from this table.

  **Constant**                 **Value**     **Applies To**                    **Rationale**
  REFUND_AUTO_THRESHOLD        ฿500          Triage --- refund disputes        Covers the vast majority of routine Thai retail e-commerce order values. Above ฿500 likely involves bulk or high-value orders requiring human verification.

  RETURN_WINDOW_DAYS           7 days        Triage --- refund disputes        7 days from delivery date. Standard return window for online retail in Thailand.

  DELIVERY_SLA_BREACH_DAYS     3 days        Triage --- delivery disputes      3 days past estimated delivery date. Allows for normal carrier delays before dispute is valid.

  INACTIVITY_TIMEOUT_MINUTES   15 minutes    Chat --- all conversation types   15 minutes of no customer message triggers auto-close.

  MAX_INTAKE_QUESTIONS         3             Intake Agent --- WF1              Maximum follow-up questions before intent must be classified.

  MIN_REJECTION_REASON_CHARS   50            Approval --- rejection flow       Minimum 50 characters for rejection reason. Forces meaningful explanation.

  CHAT_TRANSCRIPT_MAX_MSGS     40            Case Report Agent --- WF6         Maximum messages passed to Case Report Agent.

  CHAT_POLL_INTERVAL_MS        4000          Live chat --- frontend            Frontend polls GET /cases/:id/messages every 4 seconds for new messages.

  N8N_LLM_RETRY_ATTEMPTS       3             All AI agent workflows            Maximum retry attempts on OpenAI API failure.

  N8N_RETRY_BACKOFF_SECONDS    5 / 15 / 30   All AI agent workflows            Exponential backoff: 5s, 15s, 30s.

## 3. Case Lifecycle
### 3.1 Case Status Definitions
  **Status**                 **Meaning**                                                    **Set By**                      **Next Valid Statuses**
  pending_triage             Case created. Intake Agent gathering context.                  FastAPI on case creation        pending_triage (loop), awaiting_approval, escalated_human_required

  awaiting_approval          Triage complete. Autonomous path. Resolution plan generated.   WF3 after triage → autonomous   approved_executing, rejected_human_required

  approved_executing         Approver accepted plan. Resolution Agent executing.            WF5 phase 2 start               resolved

  rejected_human_required    Approver rejected plan. Approver in live chat.                 FastAPI on reject action        closed

  escalated_human_required   Triage → escalation. Human agent in live chat.                 WF3 after triage → escalation   closed

  resolved                   AI resolution executed. Awaiting conversation close.           WF5 phase 2 end                 closed

  closed                     Conversation ended. Case report generated. Terminal.           WF6 after report                --- (terminal)

| Status transition rule: only the transitions listed in 'Next Valid Statuses' are permitted.    |
|                                                                                                  |
| FastAPI validates every PATCH /cases/:id status transition. Invalid transitions return HTTP 422. |
|                                                                                                  |
| The closed status is terminal --- no further updates permitted.                                  |

### 3.2 Valid Status Transition Map
| pending_triage → pending_triage (multi-turn chat loop)                 |
|                                                                        |
| pending_triage → awaiting_approval (autonomous triage complete)        |
|                                                                        |
| pending_triage → escalated_human_required (escalation triage complete) |
|                                                                        |
| awaiting_approval → approved_executing (approver approves)             |
|                                                                        |
| awaiting_approval → rejected_human_required (approver rejects)         |
|                                                                        |
| approved_executing → resolved (AI execution complete)                  |
|                                                                        |
| rejected_human_required → closed (conversation ended)                  |
|                                                                        |
| escalated_human_required→ closed (conversation ended)                  |
|                                                                        |
| resolved → closed (conversation ended)                                 |
|                                                                        |
| closed → \[TERMINAL\]                                                  |

### 3.3 Case Creation Rules
-   A case is created when the customer submits the intake form with all five required fields: order_id, dispute_type, customer_name, customer_email, intake_message.

-   dispute_type must be exactly 'refund' or 'delivery'. Any other value returns HTTP 422.

-   Only one open case per order_id is permitted. A second submission for the same order_id while a case is open returns HTTP 409.

-   reference_number is auto-generated: format CASE-{5-digit zero-padded sequential number}.

## 4. Intake Rules
### 4.1 Intake Form Validation Rules
  **Field**        **Rule**                                            **Error Behavior**
  order_id         Required. Non-empty string. Max 50 characters.      Inline: 'Please enter a valid order ID.'

  dispute_type     Required. Must be 'refund' or 'delivery'.       Inline: 'Please select a dispute type.'

  customer_name    Required. Min 2 characters. Max 100 characters.     Inline: 'Please enter your full name.'

  customer_email   Required. Valid email format. Max 200 characters.   Inline: 'Please enter a valid email address.'

  intake_message   Required. Min 10 characters. Max 1000 characters.   Inline: 'Please describe your issue (minimum 10 characters).'

### 4.2 Chatbot Follow-up Rules
-   Maximum 3 follow-up questions (MAX_INTAKE_QUESTIONS).

-   Questions must come from the approved set for the dispute_type.

-   Same question cannot be asked twice.

-   If context is sufficient from intake_message alone, agent may classify without follow-ups.

-   After 3 questions, agent must classify intent regardless of context quality.

### 4.3 Intent Classification Rules
  **Classification**     **Condition**                                                               **Next Action**
  valid_dispute          Customer provided order ID and a recognizable refund or delivery problem.   Update case status, trigger WF2

  insufficient_context   After 3 questions, no usable information provided.                          Post message: 'Unable to gather enough information. Please contact support.' Close case.

## 5. Triage Rules
Complete authoritative triage rule set. ALL rules for a dispute type must pass for autonomous resolution. ANY single rule failure triggers escalation.

| ALL rules must pass for autonomous resolution. ANY failure → escalation.                    |
|                                                                                             |
| Null data source = rule failure → escalation (ESC-006).                                     |
|                                                                                             |
| All rules evaluated even after one fails --- full rules_evaluated array returned for audit. |
|                                                                                             |
| For complete scenario mapping see Resolution Paths Document v1.0.                           |

### 5.1 Refund Dispute Triage Rules
| **BR-REF-001 Payment Confirmed**                                                            |
|                                                                                             |
| Type: Mandatory --- Refund                                                                  |
| **Condition:** sim_transactions.status = 'confirmed' for the queried order_id.            |
|                                                                                             |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: cannot refund an unconfirmed payment. |

| **BR-REF-002 Order Fulfilled or Returned**                                                                    |
|                                                                                                               |
| Type: Mandatory --- Refund                                                                                    |
| **Condition:** sim_orders.status IN ('fulfilled', 'returned') for the queried order_id.                   |
|                                                                                                               |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: pending or cancelled orders follow different processes. |

| **BR-REF-003 Refund Amount Below Threshold**                                                         |
|                                                                                                      |
| Type: Mandatory --- Refund                                                                           |
| **Condition:** sim_transactions.amount \<= 500 (REFUND_AUTO_THRESHOLD = ฿500).                       |
|                                                                                                      |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: high-value refunds require human verification. |

| **BR-REF-004 No Prior Refund on This Order**                                       |
|                                                                                    |
| Type: Mandatory --- Refund                                                         |
| **Condition:** sim_refund_records WHERE order_id = queried order_id is empty.      |
|                                                                                    |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: duplicate refund prevention. |

| **BR-REF-005 Within Return Window**                                                                         |
|                                                                                                             |
| Type: Mandatory --- Refund                                                                                  |
| **Condition:** sim_orders.created_at \>= (dispute filed date - RETURN_WINDOW_DAYS). Return window = 7 days. |
|                                                                                                             |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: dispute outside 7-day return window.                  |

### 5.2 Delivery Dispute Triage Rules
| **BR-DEL-001 Shipment Delayed (Not Lost or Failed)**                                                  |
|                                                                                                       |
| Type: Mandatory --- Delivery                                                                          |
| **Condition:** sim_shipments.status = 'delayed'. Status 'lost' or 'failed' triggers escalation. |
|                                                                                                       |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: lost/failed shipments require carrier claims.   |

| **BR-DEL-002 Item Confirmed Shipped**                                                                      |
|                                                                                                            |
| Type: Mandatory --- Delivery                                                                               |
| **Condition:** sim_shipments.shipped_at IS NOT NULL for the queried order_id.                              |
|                                                                                                            |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: unshipped item is a fulfillment issue, not delivery. |

| **BR-DEL-003 No Duplicate Delivery Complaint**                                                                         |
|                                                                                                                        |
| Type: Mandatory --- Delivery                                                                                           |
| **Condition:** No other open case exists for same order_id (cases WHERE order_id=X AND status != 'closed' is empty). |
|                                                                                                                        |
| **Outcome:** PASS → proceed. FAIL → escalate. Reason: duplicate indicates complex situation.                           |

| **BR-DEL-004 SLA Breach Confirmed**                                                                  |
|                                                                                                      |
| Type: Mandatory --- Delivery                                                                         |
| **Condition:** CURRENT_DATE \> sim_shipments.estimated_delivery + DELIVERY_SLA_BREACH_DAYS (3 days). |
|                                                                                                      |
| **Outcome:** PASS → proceed. FAIL → inform customer to wait until EDD + 3 days.                      |

### 5.3 Escalation Triggers (Any One Sufficient)
  **Trigger ID**   **Condition**                                                    **Type**
  ESC-001          sim_transactions.amount \> ฿500 (refund)                         Threshold breach

  ESC-002          sim_shipments.status IN ('lost','failed') (delivery)         Status-based

  ESC-003          Open case already exists for same order_id (delivery)            Duplicate detection

  ESC-004          sim_orders.created_at \< dispute_date - 7 days (refund)          Window breach

  ESC-005          sim_refund_records non-empty for order_id (refund)               Prior refund

  ESC-006          Any data source returns null, empty, or HTTP error               Data integrity failure

  ESC-007          sim_transactions.status != 'confirmed' (refund)                Payment not confirmed

  ESC-008          sim_orders.status NOT IN ('fulfilled','returned') (refund)   Order status ineligible

  ESC-009          sim_shipments.shipped_at IS NULL (delivery)                      Item not shipped

  ESC-010          CURRENT_DATE \<= EDD + 3 days (delivery)                         Within SLA window

  ESC-011          GPT-4o-mini triage call fails after 3 retries                    AI processing failure

  ESC-012          Triage JSON unparseable or routing_decision missing              AI output failure

## 6. Approval Workflow Rules
| **BR-APR-001 Approver Identity Captured at Click Time**                                                      |
|                                                                                                              |
| Type: Approval                                                                                               |
| **Condition:** approver_id extracted from JWT at approve/reject time. Frontend sends empty body for approve. |
|                                                                                                              |
| **Outcome:** FastAPI extracts user ID from JWT claims.                                                       |

| **BR-APR-002 Case Must Be in awaiting_approval**                                                                  |
|                                                                                                                   |
| Type: Approval                                                                                                    |
| **Condition:** POST /cases/:id/approve and /cases/:id/reject only valid when case.status = 'awaiting_approval'. |
|                                                                                                                   |
| **Outcome:** Any other status: return HTTP 409 Conflict.                                                          |

| **BR-APR-003 Only Approver Role Can Approve or Reject**               |
|                                                                       |
| Type: Approval                                                        |
| **Condition:** JWT role claim must be 'approver'.                   |
|                                                                       |
| **Outcome:** If role != 'approver': return HTTP 403 Forbidden.      |

### 6.2 Rejection Rules
| **BR-REJ-001 Rejection Reason Required (50 chars min)**                                         |
|                                                                                                 |
| Type: Rejection                                                                                 |
| **Condition:** rejection_reason required on POST /cases/:id/reject. Min 50 characters.          |
|                                                                                                 |
| **Outcome:** Frontend disables Confirm until 50 chars. FastAPI returns HTTP 422 if under limit. |

| **BR-REJ-002 Policy Citations Optional but Structured**                                       |
|                                                                                               |
| Type: Rejection                                                                               |
| **Condition:** policy_refs optional array of policy slugs. Each must exist in policies table. |
|                                                                                               |
| **Outcome:** Non-existent slug: HTTP 422.                                                     |

| **BR-REJ-003 Approver Must Join Chat After Rejection**                                                |
|                                                                                                       |
| Type: Rejection                                                                                       |
| **Condition:** After successful reject, approver is immediately redirected to /approver/:caseId/chat. |
|                                                                                                       |
| **Outcome:** Mandatory navigation. No opt-out.                                                        |

| **BR-REJ-004 Approver Cannot Leave Chat Until Closure Conditions Met**                                 |
|                                                                                                        |
| Type: Rejection                                                                                        |
| **Condition:** Approver in live chat post-rejection: cannot navigate away until closure condition met. |
|                                                                                                        |
| **Outcome:** Valid close reasons: Resolved, Customer unresponsive, Duplicate case. See §10.3.          |

Escalation agents have an operational action surface in the case UI (refund create/deny/duplicate, return create/approve/reject) implemented via FastAPI and persisted as chat messages.

## 7. Escalation Workflow Rules
| **BR-ESC-001 Escalation Cases Visible to All Escalation Agents**                                                                                    |
|                                                                                                                                                     |
| Type: Escalation                                                                                                                                    |
| **Condition:** All escalated_human_required cases visible to all users with role = 'escalation'. First agent to open record view claims the case. |
|                                                                                                                                                     |
| **Outcome:** assigned_to set on record view open.                                                                                                   |

| **BR-ESC-002 Escalation Agent Joins via Claim**                                             |
|                                                                                            |
| Type: Escalation                                                                           |
| **Condition:** Agent opens the escalated case record view to claim and enter live conversation. |
|                                                                                            |
| **Outcome:** POST /cases/:id/claim { assigned_to } + system message posted.                     |

| **BR-ESC-003 Same Chat Closure Rules Apply**                                                  |
|                                                                                               |
| Type: Escalation                                                                              |
| **Condition:** Escalation agents subject to same closure rules as approvers post-rejection.   |
|                                                                                               |
| **Outcome:** Valid close reasons: Resolved, Customer unresponsive, Duplicate case. See §10.3. |

## 8. Conversation Closure Rules
### 8.1 Closure Triggers
  **Trigger**              **closed_by**   **close_reason**   **Condition**                                   **Who Can Trigger**
  Customer marks done      customer        null               Customer clicks 'Mark as Done' at any time.   Customer

  Agent --- Resolved       agent           resolved           Agent handled issue to completion.              Approver (post-reject) or Escalation agent

  Agent --- Unresponsive   agent           unresponsive       Customer not responding.                        Approver (post-reject) or Escalation agent

  Agent --- Duplicate      agent           duplicate          Duplicate open case exists.                     Approver (post-reject) or Escalation agent

  Inactivity timeout       timeout         unresponsive       No customer message for 15 minutes.             System (automated)

| **BR-CLO-001 Customer Can Close at Any Time**                                                                               |
|                                                                                                                             |
| Type: Closure                                                                                                               |
| **Condition:** The customer's 'Mark as Done' button is available at all times after case creation, regardless of status. |
|                                                                                                                             |
| **Outcome:** WF6 triggers immediately on customer close.                                                                    |

| **BR-CLO-002 Inactivity Timer Resets on Each Message**                                                                                  |
|                                                                                                                                         |
| Type: Closure                                                                                                                           |
| **Condition:** 15-minute timer resets on every customer message. Evaluated server-side via FastAPI background task every 5 minutes.     |
|                                                                                                                                         |
| **Outcome:** Implementation: store last_customer_message_at on case. Background task checks (now - last_customer_message_at) \> 15 min. |

| **BR-CLO-003 Resolved Cases Wait for Closure**                                                                                         |
|                                                                                                                                        |
| Type: Closure                                                                                                                          |
| **Condition:** Cases reaching 'resolved' status do not auto-close. Customer must explicitly close or inactivity timeout must elapse. |
|                                                                                                                                        |
| **Outcome:** Ensures customer can acknowledge resolution before conversation ends.                                                     |

| **BR-CLO-004 Case Report Always Generated on Close**                                        |
|                                                                                             |
| Type: Closure                                                                               |
| **Condition:** Every conversation close --- any trigger, any path --- must trigger WF6.     |
|                                                                                             |
| **Outcome:** FastAPI POST /cases/:id/close always fires POST /webhooks/conversation-closed. |

## 9. Resolution Execution Rules
### 9.1 Refund Resolution Rules
| **BR-RES-001 Refund Amount Equals Transaction Amount**                                                              |
|                                                                                                                     |
| Type: Resolution --- Refund                                                                                         |
| **Condition:** Refund amount in resolution plan must equal sim_transactions.amount. Partial refunds not autonomous. |
|                                                                                                                     |
| **Outcome:** Resolution Agent sets resolution_plan.amount = sim_transactions.amount.                                |

| **BR-RES-002 Refund Record Created Before Case Resolved**                                         |
|                                                                                                   |
| Type: Resolution --- Refund                                                                       |
| **Condition:** WF5 must create refund_request record before updating case.status to 'resolved'. |
|                                                                                                   |
| **Outcome:** n8n node order: N12 create refund → N14 update resolved. N12 failure blocks N14.     |

### 9.2 Delivery Resolution Rules
| **BR-RES-003 Resolution Type from Shipment Status**                                                                                 |
|                                                                                                                                     |
| Type: Resolution --- Delivery                                                                                                       |
| **Condition:** sim_shipments.status = 'delayed' → resolution_type = 'redelivery'. Replacement for lost (if somehow autonomous). |
|                                                                                                                                     |
| **Outcome:** Resolution Agent derives type from shipment status in information bundle.                                              |

| **BR-RES-004 Return Record for Replacement Only**                                         |
|                                                                                           |
| Type: Resolution --- Delivery                                                             |
| **Condition:** return_request record only created when resolution_type = 'replacement'. |
|                                                                                           |
| **Outcome:** WF5 N13 conditional on resolution_type = replacement.                        |

### 9.3 Customer Notification Rules
| **BR-NOT-001 Customer Is Never Left Without Status**                                                  |
|                                                                                                       |
| Type: Notification                                                                                    |
| **Condition:** At every major status transition, a system or AI message is posted to the chat thread. |
|                                                                                                       |
| **Outcome:** Required messages: intent confirmed, escalation, resolved, closed.                       |

| **BR-NOT-002 Resolution Message References Specific Actions**                                                                         |
|                                                                                                                                       |
| Type: Notification                                                                                                                    |
| **Condition:** customer_message in resolution plan must reference specific resolution (e.g. 'A refund of ฿320 has been initiated'). |
|                                                                                                                                       |
| **Outcome:** Resolution Agent prompt enforces specificity.                                                                            |

## 10. Chat System Rules
### 10.1 Participant State Rules
  **State**      **Who is Active**              **Chat Input For**   **ParticipantBanner**
  AI active      Intake or Resolution Agent     Customer only        Orange --- 'You are speaking with ROAR AI'

  Human active   Approver or Escalation Agent   Customer + Agent     Blue --- 'Agent \[Name\] has joined the conversation'

  Closed         No one                         No one               Gray --- 'This conversation has been closed'

| **BR-CHT-001 AI-to-Human Handoff Is Seamless and Irreversible**                                                            |
|                                                                                                                            |
| Type: Chat                                                                                                                 |
| **Condition:** Once human agent joins, AI sends no further messages in that thread. Handoff is permanent within that case. |
|                                                                                                                            |
| **Outcome:** n8n workflows check assigned_to IS NOT NULL before posting AI messages.                                       |

| **BR-CHT-002 System Messages Are Non-Interactive**                                                          |
|                                                                                                             |
| Type: Chat                                                                                                  |
| **Condition:** sender_type = 'system' messages rendered as centered pills. Customer cannot reply to them. |
|                                                                                                             |
| **Outcome:** Frontend ChatBubble renders system messages as non-interactive pills.                          |

| **BR-CHT-003 Chat History Is Append-Only**                                                                 |
|                                                                                                            |
| Type: Chat                                                                                                 |
| **Condition:** No message may be edited or deleted after written to chat_messages. Permanent audit record. |
|                                                                                                            |
| **Outcome:** No DELETE or UPDATE on chat_messages. FastAPI enforces at router level.                       |

### 10.2 Live Chat Implementation --- Polling
ROAR Engine uses polling (not WebSocket) for live chat updates in the MVP. This is simpler to implement within the 48-hour build window and acceptable for a demo context.

  **Rule**                **Value**                                                                                                       **Notes**
  Poll interval           Every 4000ms (CHAT_POLL_INTERVAL_MS)                                                                            Frontend polls GET /cases/:id/messages every 4 seconds

  Poll endpoint           GET /cases/:id/messages                                                                                         Returns full message array. Frontend diffs against last seen message ID.

  Poll condition          Only active while chat window is open and focused                                                               Stop polling on tab blur or chat close to reduce server load

  New message detection   Frontend stores last_message_id. On poll response, filters messages with id not in seen set.                    Avoids re-rendering existing messages

  Agent-side polling      Agent dashboard polls GET /cases (dashboard list) every 10 seconds for new case badges                          Separate from chat polling

  Typing indicator        Not real-time. AI typing indicator is a local frontend state shown from prompt submit until response arrives.   Not polled --- purely client-side

### 10.3 Chat Termination Rules --- Role-Differentiated
Both approvers (post-rejection) and escalation agents share the same three valid termination reasons. The reason options are presented in the ConversationClosePanel component.

  **Role**                    **Valid Termination Reasons**         **When Applicable**
  Approver (post-rejection)   Resolved --- issue handled            Approver manually resolved the dispute in chat

  Approver (post-rejection)   Customer unresponsive / abandoned     Customer stopped responding during live chat

  Approver (post-rejection)   Duplicate --- already has open case   Agent identifies this is a duplicate of an existing case

  Escalation Agent            Resolved --- issue handled            Agent manually resolved the dispute in chat

  Escalation Agent            Customer unresponsive / abandoned     Customer stopped responding during live chat

  Escalation Agent            Duplicate --- already has open case   Agent identifies this is a duplicate of an existing case

| **BR-CHT-004 Both Sides Can Terminate the Conversation**                                                                                                                                 |
|                                                                                                                                                                                          |
| Type: Chat                                                                                                                                                                               |
| **Condition:** Either the customer (via 'Mark as Done') or the agent (via ConversationClosePanel with valid reason) can terminate the conversation at any time.                        |
|                                                                                                                                                                                          |
| **Outcome:** Customer termination: POST /cases/:id/close { closed_by: 'customer' }. Agent termination: POST /cases/:id/close { closed_by: 'agent', close_reason: \[valid reason\] }. |

| **BR-CHT-005 Customer Chat Locks on Closure**                                                                                                                         |
|                                                                                                                                                                       |
| Type: Chat                                                                                                                                                            |
| **Condition:** When any closure trigger fires, the customer's chat input is immediately disabled. A system message is posted: 'This conversation has been closed.' |
|                                                                                                                                                                       |
| **Outcome:** Frontend disables ChatInput and sets chat state to 'closed'. No further messages accepted from either side.                                            |

| **BR-CHT-006 Agent Must Select Valid Reason to Close**                                                                                              |
|                                                                                                                                                     |
| Type: Chat                                                                                                                                          |
| **Condition:** Agent cannot close the conversation without selecting one of the three pre-approved reasons from ConversationClosePanel.             |
|                                                                                                                                                     |
| **Outcome:** Confirm button in ConversationClosePanel disabled until a reason is selected. FastAPI validates close_reason on POST /cases/:id/close. |

## 11. Policies Page Rules
| **BR-POL-001 Policies Are Read-Only in MVP**                                                                |
|                                                                                                             |
| Type: Policies                                                                                              |
| **Condition:** No user role can edit, create, or delete policy records via UI. All policies seeded via SQL. |
|                                                                                                             |
| **Outcome:** FastAPI exposes GET /policies only.                                                            |

| **BR-POL-002 Policy Slugs Are Permanent**                                              |
|                                                                                        |
| Type: Policies                                                                         |
| **Condition:** Policy slugs must never change after seeding. All references use slugs. |
|                                                                                        |
| **Outcome:** No slug mutations permitted.                                              |

| **BR-POL-003 Policy Citation Must Deep-Link**                         |
|                                                                       |
| Type: Policies                                                        |
| **Condition:** PolicyCitationChip links to /policies#\[slug\].        |
|                                                                       |
| **Outcome:** Each policy rendered with id=\[slug\] anchor.            |

## 12. Data Integrity Rules
| **BR-DAT-001 Null Data Source Triggers Escalation**                                                       |
|                                                                                                           |
| Type: Data Integrity                                                                                      |
| **Condition:** Any WF2 query returning null or error → null in bundle → triage rule failure → escalation. |
|                                                                                                           |
| **Outcome:** WF3 detects null source. ESC-006 active.                                                     |

| **BR-DAT-002 Conflicting Data Signals Trigger Escalation**                      |
|                                                                                 |
| Type: Data Integrity                                                            |
| **Condition:** Logically inconsistent data between sources triggers escalation. |
|                                                                                 |
| **Outcome:** Triage Agent flags conflict in rules_evaluated.                    |

| **BR-DAT-003 information_bundle Immutable After Assembly**                                                   |
|                                                                                                              |
| Type: Data Integrity                                                                                         |
| **Condition:** information_bundle must not be modified after WF2 writes it. It is a snapshot at triage time. |
|                                                                                                              |
| **Outcome:** FastAPI enforces: no PATCH on information_bundle after initial set.                             |

## 13. System Architecture Classification
ROAR Engine targets Thai retail enterprises operating online ordering and delivery channels. This includes retailers with e-commerce platforms, food delivery services, online grocery, and any retail brand where customers place orders digitally and expect delivery to a specified address.

The system is not designed for walk-in convenience store transactions where no shipping or delivery is involved. The dispute types supported --- refund and delivery --- are inherently e-commerce and online delivery scenarios.

| ROAR Engine is a supervised agentic pipeline --- not a fully autonomous agent system.                                   |
|                                                                                                                         |
| Six specialized AI agents with tool-calling capabilities, operating within a deterministic n8n orchestration framework. |
|                                                                                                                         |
| Human-in-the-loop approval required before any autonomous resolution is executed.                                       |
|                                                                                                                         |
| This is the production-grade pattern for agentic AI in enterprise operations.                                           |

### 13.1 Pattern Classification per Agent
  **Agent**              **Pattern**                   **LLM Role**                                          **Tool Calling**   **Human Gate**
  Intake Agent           Conversational AI Agent       Decides questions or classifies intent                Yes                No --- automated

  Data Retrieval Agent   Deterministic Pipeline        No LLM call                                           No --- HTTP only   No --- automated

  Triage Agent           Structured Reasoning Agent    Applies pre-defined rules, returns verdict            Yes                No --- rule-bound

  Resolution Agent       Supervised Execution Agent    Generates plan (creative); executes (deterministic)   Yes                YES --- approval required

  Summarization Agent    Structured Generation Agent   Generates human-readable summary                      Yes                No --- automated

  Case Report Agent      Structured Generation Agent   Compiles audit record                                 Yes                No --- automated

## 14. Rule Registry
Master index of all business rules. Full definitions in the referenced sections above.

  **Rule ID**   **Title**                                 **Category**          **Section**   **Enforced By**
  BR-REF-001    Payment Confirmed                         Triage --- Refund     §5.1          WF3 Triage Agent

  BR-REF-002    Order Fulfilled or Returned               Triage --- Refund     §5.1          WF3 Triage Agent

  BR-REF-003    Refund Amount Below Threshold             Triage --- Refund     §5.1          WF3 Triage Agent

  BR-REF-004    No Prior Refund on This Order             Triage --- Refund     §5.1          WF3 Triage Agent

  BR-REF-005    Within Return Window                      Triage --- Refund     §5.1          WF3 Triage Agent

  BR-DEL-001    Shipment Delayed Not Lost or Failed       Triage --- Delivery   §5.2          WF3 Triage Agent

  BR-DEL-002    Item Confirmed Shipped                    Triage --- Delivery   §5.2          WF3 Triage Agent

  BR-DEL-003    No Duplicate Delivery Complaint           Triage --- Delivery   §5.2          WF3 Triage Agent

  BR-DEL-004    SLA Breach Confirmed                      Triage --- Delivery   §5.2          WF3 Triage Agent

  BR-APR-001    Approver Identity at Click Time           Approval              §6.1          FastAPI JWT

  BR-APR-002    Case Must Be awaiting_approval            Approval              §6.1          FastAPI status validation

  BR-APR-003    Only Approver Role Can Act                Approval              §6.1          FastAPI RBAC

  BR-REJ-001    Rejection Reason 50 chars min             Rejection             §6.2          Frontend + FastAPI

  BR-REJ-002    Policy Citations Structured               Rejection             §6.2          FastAPI slug validation

  BR-REJ-003    Approver Must Join Chat After Rejection   Rejection             §6.2          Frontend navigation

  BR-REJ-004    Approver Chat Lock Until Closure          Rejection             §6.2          Frontend navigation block

  BR-ESC-001    Escalation Visible to All Agents          Escalation            §7.1          FastAPI RBAC + dashboard

  BR-ESC-002    Escalation Agent Must Join Chat           Escalation            §7.1          Frontend + FastAPI

  BR-ESC-003    Same Chat Closure Rules                   Escalation            §7.1          Frontend navigation block

  BR-CLO-001    Customer Can Close Anytime                Closure               §8.2          Frontend + FastAPI

  BR-CLO-002    Inactivity Timer Resets on Message        Closure               §8.2          FastAPI background task

  BR-CLO-003    Resolved Cases Wait for Customer          Closure               §8.2          No auto-close on resolve

  BR-CLO-004    Report Always Generated on Close          Closure               §8.2          FastAPI webhook trigger

  BR-RES-001    Refund Equals Transaction Amount          Resolution            §9.1          WF5 Resolution Agent

  BR-RES-002    Refund Record Before Case Resolved        Resolution            §9.1          WF5 node order

  BR-RES-003    Resolution Type from Shipment Status      Resolution            §9.2          WF5 Resolution Agent

  BR-RES-004    Return Record for Replacement Only        Resolution            §9.2          WF5 node condition

  BR-NOT-001    Customer Never Left Without Status        Notification          §9.3          All workflows

  BR-NOT-002    Resolution Message Specific               Notification          §9.3          WF5 prompt

  BR-CHT-001    AI-to-Human Handoff Irreversible          Chat                  §10.1         n8n + FastAPI

  BR-CHT-002    System Messages Non-Interactive           Chat                  §10.1         Frontend component

  BR-CHT-003    Chat History Append-Only                  Chat                  §10.1         FastAPI router

  BR-CHT-004    Both Sides Can Terminate                  Chat                  §10.3         Frontend + FastAPI

  BR-CHT-005    Customer Chat Locks on Closure            Chat                  §10.3         Frontend state

  BR-CHT-006    Agent Must Select Valid Reason            Chat                  §10.3         Frontend + FastAPI

  BR-POL-001    Policies Read-Only in MVP                 Policies              §11           FastAPI GET only

  BR-POL-002    Policy Slugs Permanent                    Policies              §11           No mutations

  BR-POL-003    Policy Citation Deep-Links                Policies              §11           Frontend component

  BR-DAT-001    Null Source Triggers Escalation           Data Integrity        §12           WF3 + n8n

  BR-DAT-002    Conflicting Signals Trigger Escalation    Data Integrity        §12           WF3 + n8n

  BR-DAT-003    Bundle Immutable After Assembly           Data Integrity        §12           FastAPI

*--- End of Document ---*
