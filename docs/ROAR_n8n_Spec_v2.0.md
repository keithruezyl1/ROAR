## 1. Document Overview
This document is the complete hands-on implementation reference for ROAR Engine's n8n orchestration layer. It defines instance setup, credential configuration, all six workflow designs (node by node), LangChain tool definitions, complete HTTP request specs, AI model declarations, the full prompt library, error handling standards, the webhook reference, Supabase query specs, and a testing checklist.

**Relationship to companion documents:**

-   PBD §5 defines what each workflow does and why. This document defines how to build each workflow in n8n.

-   PBD §6 defines agent prompt design rationale. This document provides the final copy-paste prompts.

-   Architecture Doc §3 defines the communication map. This document implements all those connections.

-   This is v2.0 --- corrects the PBD's 5-workflow design to 6 workflows (one per agent) and adds Section 16: Tool and Function Call Reference.

| v2.0 correction: Summarization Agent is now a standalone workflow (WF4) with its own webhook trigger.                |
|                                                                                                                      |
| WF3 (Triage) triggers /webhooks/triage-escalation for WF4 on escalation path.                                        |
|                                                                                                                      |
| All other webhook paths from PBD §5 remain valid. One new webhook added: POST /webhooks/resolution-plan.             |
|                                                                                                                      |
| MCP servers: not required for MVP. All data sources are simulated REST endpoints. See §17 for post-MVP MCP guidance. |

  **Field**             **Value**
  Document Type         n8n Implementation Specification

  Version               2.0 (supersedes v1.0)

  Companion Docs        ROAR Engine PBD v1.0, Architecture v1.0

  n8n Version           n8n \>= 1.30 (self-hosted or cloud)

  LLM                   GPT-4o-mini via OpenAI API

  Workflows             6 total --- one per AI agent

  Est. Setup Time       4--6 hours for full workflow build and credential configuration

**2. n8n Instance Setup**

### 2.1 Deployment --- Railway
| \# Railway deployment --- use the official n8n Docker image           |
|                                                                       |
| \# Image: n8nio/n8n:latest                                            |
|                                                                       |
| \# Required environment variables in Railway dashboard:               |
|                                                                       |
| N8N_BASIC_AUTH_ACTIVE=true                                            |
|                                                                       |
| N8N_BASIC_AUTH_USER=admin                                             |
|                                                                       |
| N8N_BASIC_AUTH_PASSWORD=your-secure-password                          |
|                                                                       |
| N8N_HOST=n8n.roarengine.railway.app                                   |
|                                                                       |
| N8N_PORT=5678                                                         |
|                                                                       |
| N8N_PROTOCOL=https                                                    |
|                                                                       |
| WEBHOOK_URL=https://n8n.roarengine.railway.app/                       |
|                                                                       |
| EXECUTIONS_DATA_SAVE_ON_ERROR=all                                     |
|                                                                       |
| EXECUTIONS_DATA_SAVE_ON_SUCCESS=all                                   |
|                                                                       |
| GENERIC_TIMEZONE=Asia/Bangkok                                         |
|                                                                       |
| N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true                          |
|                                                                       |
| \# Mount /home/node/.n8n to a Railway volume for persistence          |

### 2.2 Required Community Package
| CRITICAL: Install \@n8n/n8n-nodes-langchain before building any workflows.                             |
|                                                                                                        |
| Settings → Community Nodes → Install: \@n8n/n8n-nodes-langchain                                        |
|                                                                                                        |
| This provides: AI Agent node, OpenAI Chat Model node, Basic LLM Chain, Tool nodes, and output parsers. |
|                                                                                                        |
| Also enable: Settings → n8n API → Enable API (needed for workflow imports via CLI).                    |

**2.3 n8n Environment Variables for Workflows**

Set these as n8n environment variables, or hardcode local literals directly in node URLs/headers when using n8n local:

| FASTAPI_BASE_URL=https://api.roarengine.railway.app                   |
|                                                                       |
| FASTAPI_WEBHOOK_SECRET=your-shared-secret                             |
|                                                                       |
| SUPABASE_URL=https://xxx.supabase.co                                  |
|                                                                       |
| SUPABASE_SERVICE_ROLE_KEY=eyJ\...                                     |
|                                                                       |
| OPENAI_API_KEY=sk-\...                                                |

## 3. Credentials Configuration
Configure these four credentials in n8n's credential store before building any workflow. Use the exact names shown --- workflow imports resolve credentials by name.

  **Credential Name**   **Type in n8n**          **Field**                    **Value**                   **Used In**
  ROAR OpenAI           OpenAI API               API Key                      Your OpenAI key (sk-\...)   All 6 workflows

  ROAR Supabase         HTTP Header Auth         Name: apikey / Value: \...   Supabase service role key   WF2 (source queries)

  ROAR FastAPI          HTTP Header Auth         Name: X-Webhook-Secret       Shared webhook secret       All outbound n8n→FastAPI calls

  ROAR FastAPI Bearer   HTTP Bearer Token Auth   Token                        Supabase service role key   All GET/PATCH FastAPI calls

**Setup Steps (same for all four)**

-   Credentials → New → search type → fill fields → Save → Test connection

-   For ROAR Supabase: Name field = apikey (exact), Value = service role key

-   For ROAR FastAPI: Name field = X-Webhook-Secret, Value = same as FASTAPI_WEBHOOK_SECRET in FastAPI .env

## 4. Workflow Registry
  **\#**   **Workflow Name**      **File**                 **Agent**                  **Webhook Trigger**                              **PBD Ref**   **Est.**
  1        Intake Agent           01_intake_agent.json     Intake Agent (1)           /webhooks/case-created                           §5.1          45m

  2        Data Retrieval Agent   02_data_retrieval.json   Data Retrieval Agent (2)   /webhooks/bundle-ready                           §5.2          60m

  3        Triage Agent           03_triage_agent.json     Triage Agent (3)           /webhooks/triage-complete                        §5.3          45m

  4        Summarization Agent    04_summarization.json    Summarization Agent (5)    /webhooks/triage-escalation                      §5.3\*        30m

  5        Resolution Execution   05_resolution.json       Resolution Agent (4a+4b)   /webhooks/resolution-plan + /webhooks/approved   §5.4          60m

  6        Case Report Agent      06_case_report.json      Case Report Agent (6)      /webhooks/conversation-closed                    §5.5          45m

## 5. Workflow 1 --- Intake Agent
| **Workflow 1 --- Intake Agent**                                       |
|                                                                       |
| Agent: Intake Agent (Agent 1) · Trigger: POST /webhooks/case-created  |
|                                                                       |
| *PBD Reference: §5 (n8n Spec §5)*                                     |

**Purpose**

Manages the customer-facing AI chatbot conversation. Called once per customer message while the case is in pending_triage status. Asks rule-based follow-up questions, detects intent, and triggers the Data Retrieval workflow on confirmation.

**Trigger Payload**

| POST /webhooks/case-created                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"case_id\": \"uuid\",                                                |
|                                                                       |
| \"dispute_type\": \"refund\" \| \"delivery\",                         |
|                                                                       |
| \"order_id\": \"ORD-10042\",                                          |
|                                                                       |
| \"intake_message\": \"I was charged but never received my order.\",   |
|                                                                       |
| \"customer_name\": \"Jane Doe\",                                      |
|                                                                       |
| \"customer_email\": \"jane@example.com\"                              |
|                                                                       |
| }                                                                     |

**Node Map**

  **\#**   **Node Name**            **Node Type**       **Configuration**                                                                                                                                                           **Output**
  N1       Webhook Trigger          Webhook             Path: case-created. Method: POST. Auth: ROAR FastAPI header credential. Response Mode: Last Node.                                                                           Raw webhook body

  N2       Extract Case Data        Code (JS)           Destructure body: case_id, dispute_type, order_id, intake_message, customer_name. Return as clean object.                                                                   Structured case object

  N3       Fetch Chat History       HTTP Request        GET {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages. Auth: ROAR FastAPI Bearer. Returns full message history for multi-turn context.                                        messages\[\] array

  N4       Build Intake Prompt      Code (JS)           Build system prompt from §12.1. Format chat history as OpenAI messages array (role: user/assistant). Inject dispute_type and approved question set.                         { system_prompt, messages\[\] }

  N5       GPT-4o-mini Call         OpenAI Chat Model   Model: gpt-4o-mini. Credential: ROAR OpenAI. Temp: 0.2. Max tokens: 400. Response format: JSON object. System from N4.                                                      { action, question?, intent?, intent_summary? }

  N6       Parse AI Response        Code (JS)           JSON.parse N5 output. Validate action in \[ask_question, classify_intent\]. On error: set action=ask_question with fallback question.                                       Validated action object

  N7       Route on Action          Switch              Route on \$json.action. Branch A: ask_question. Branch B: classify_intent.                                                                                                  Two branches

  N8       Post Follow-up           HTTP Request        \[A\] POST {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages. Body: { content: {{question}}, sender_type: 'ai' }. Auth: ROAR FastAPI Bearer.                                Message record

  N9       Update --- Triaging      HTTP Request        \[B\] PATCH {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Body: { status: 'pending_triage', triage_decision: { intent, intent_summary } }. Auth: ROAR FastAPI Bearer.           Updated case

  N10      Post Intent Message      HTTP Request        \[B\] POST \.../messages. Body: { content: 'I have enough information. I am generating a case for your dispute now.', sender_type: 'ai' }. Auth: ROAR FastAPI Bearer.   System message posted

  N11      Trigger Data Retrieval   HTTP Request        \[B\] POST {{FASTAPI_BASE_URL}}/webhooks/bundle-ready. Body: { case_id, dispute_type, order_id }. Header: X-Webhook-Secret. Fire and forget.                                WF2 triggered

| WF1 is triggered on every customer message, not once per case.                         |
|                                                                                        |
| N3 fetches full history each call so GPT-4o-mini always has full conversation context. |
|                                                                                        |
| Workflow ends at N8 (more questions) or N11 (intent confirmed --- hand off to WF2).    |

## 6. Workflow 2 --- Data Retrieval Agent
| **Workflow 2 --- Data Retrieval Agent**                                      |
|                                                                              |
| Agent: Data Retrieval Agent (Agent 2) · Trigger: POST /webhooks/bundle-ready |
|                                                                              |
| *PBD Reference: §5 (n8n Spec §6)*                                            |

**Purpose**

Queries only the relevant simulated Supabase data sources based on dispute type. Assembles all results into a structured information bundle. No LLM call --- pure data aggregation. Updates the case and triggers the Triage workflow.

**Trigger Payload**

| POST /webhooks/bundle-ready                                                                          |
|                                                                                                      |
| { \"case_id\": \"uuid\", \"dispute_type\": \"refund\" \| \"delivery\", \"order_id\": \"ORD-10042\" } |

**Source Routing Logic**

  **Dispute Type**   **Sources Queried**           **Tables**
  refund             OMS + Payment Gateway         sim_orders, sim_order_items, sim_transactions, sim_refund_records

  delivery           OMS + Logistics + Inventory   sim_orders, sim_order_items, sim_shipments, sim_tracking_events, sim_stock_records

**Node Map**

  **\#**   **Node Name**                  **Node Type**   **Configuration**                                                                                                                                                                                     **Output**
  N1       Webhook Trigger                Webhook         Path: bundle-ready. Method: POST. Auth: ROAR FastAPI.                                                                                                                                                 { case_id, dispute_type, order_id }

  N2       Route by Dispute Type          Switch          Route on \$json.body.dispute_type. Branch A: refund. Branch B: delivery.                                                                                                                              Two branches

  N3       Query OMS --- Orders           HTTP Request    \[Both\] GET {{SUPABASE_URL}}/rest/v1/sim_orders?order_id=eq.{{order_id}}&select=\*. Headers: apikey + Authorization: Bearer {{service_role}}. Auth: ROAR Supabase.                                   order record

  N4       Query OMS --- Items            HTTP Request    \[Both\] GET \.../sim_order_items?order_id=eq.{{order_id}}&select=\*. Auth: ROAR Supabase.                                                                                                            order_items\[\]

  N5       Query Payment --- Txn          HTTP Request    \[A\] GET \.../sim_transactions?order_id=eq.{{order_id}}&select=\*. Auth: ROAR Supabase.                                                                                                              transaction record

  N6       Query Payment --- Refunds      HTTP Request    \[A\] GET \.../sim_refund_records?order_id=eq.{{order_id}}&select=\*. Auth: ROAR Supabase.                                                                                                            refund_records\[\]

  N7       Query Logistics --- Shipment   HTTP Request    \[B\] GET \.../sim_shipments?order_id=eq.{{order_id}}&select=\*. Auth: ROAR Supabase.                                                                                                                 shipment record

  N8       Query Logistics --- Events     HTTP Request    \[B\] GET \.../sim_tracking_events?shipment_id=eq.{{shipment.id}}&select=\*&order=event_time.asc. Auth: ROAR Supabase.                                                                                tracking_events\[\]

  N9       Query Inventory                HTTP Request    \[B\] GET \.../sim_stock_records?item_id=in.({{item_ids_csv}})&select=\*. item_ids extracted from N4 output. Auth: ROAR Supabase.                                                                     stock_records\[\]

  N10      Assemble Bundle                Code (JS)       Merge all outputs: { order, order_items, transaction?, refund_records?, shipment?, tracking_events?, stock_records?, queried_at: new Date().toISOString(), dispute_type }. Handle nulls gracefully.   information_bundle JSON

  N11      Update Case --- Bundle         HTTP Request    PATCH {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Body: { information_bundle: {{bundle}} }. Auth: ROAR FastAPI Bearer.                                                                                    Updated case

  N12      Trigger Triage                 HTTP Request    POST {{FASTAPI_BASE_URL}}/webhooks/triage-complete. Body: { case_id, dispute_type }. Header: X-Webhook-Secret.                                                                                        WF3 triggered

| No LLM call in WF2 --- pure data aggregation.                         |
|                                                                       |
| N10 is the most complex node --- build and test in isolation.         |
|                                                                       |
| Use n8n Merge node to combine parallel branch outputs before N10.     |

## 7. Workflow 3 --- Triage Agent
| **Workflow 3 --- Triage Agent**                                         |
|                                                                         |
| Agent: Triage Agent (Agent 3) · Trigger: POST /webhooks/triage-complete |
|                                                                         |
| *PBD Reference: §5 (n8n Spec §7)*                                       |

**Purpose**

Fetches the assembled information bundle and active policies. Calls GPT-4o-mini to evaluate each rule deterministically and decide the resolution path. Updates the case and triggers either WF5 (autonomous) or WF4 (escalation).

**Trigger Payload**

| POST /webhooks/triage-complete                                          |
|                                                                         |
| { \"case_id\": \"uuid\", \"dispute_type\": \"refund\" \| \"delivery\" } |

**Triage Rules Injected into Prompt**

  **Type**   **Rule**                      **Pass Condition**
  refund     Payment confirmed             sim_transactions.status = 'confirmed'

  refund     Order fulfilled or returned   sim_orders.status IN ('fulfilled','returned')

  refund     Amount below threshold        sim_transactions.amount \<= 500 THB

  refund     No prior dispute              sim_refund_records empty for this order_id

  refund     Within return window          order created_at within 30 days of today

  delivery   Delay (not lost)              sim_shipments.status = 'delayed' NOT 'lost'/'failed'

  delivery   Item shipped                  sim_shipments.shipped_at IS NOT NULL

  delivery   No duplicate complaint        No prior open case for same order_id

  delivery   Within SLA window             sim_shipments.estimated_delivery \>= today

**Node Map**

  **\#**   **Node Name**                  **Node Type**       **Configuration**                                                                                                                                                                               **Output**
  N1       Webhook Trigger                Webhook             Path: triage-complete. Method: POST. Auth: ROAR FastAPI.                                                                                                                                        { case_id, dispute_type }

  N2       Fetch Full Case                HTTP Request        GET {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Auth: ROAR FastAPI Bearer. Returns full case including information_bundle.                                                                          Full case object

  N3       Fetch Policies                 HTTP Request        GET {{FASTAPI_BASE_URL}}/policies?category=in.(store,payment,return,delivery,sla)&select=slug,title,content. Auth: ROAR FastAPI Bearer.                                                         policies\[\]

  N4       Build Triage Prompt            Code (JS)           Construct user message: serialize information_bundle as JSON, inject dispute-type rule set, inject filtered policy content, inject current_date = new Date().toISOString().split('T')\[0\].   { system_prompt, user_message }

  N5       GPT-4o-mini Triage Call        OpenAI Chat Model   Model: gpt-4o-mini. Credential: ROAR OpenAI. Temp: 0.0. Max tokens: 800. Response format: JSON object. System: §12.2.                                                                           { routing_decision, rules_evaluated\[\], justification, policies_applied\[\], slas_applied\[\] }

  N6       Parse + Validate               Code (JS)           JSON.parse N5. Confirm routing_decision in \[autonomous, escalation\]. On parse error: default routing_decision = 'escalation'.                                                               Validated triage decision

  N7       Route on Decision              Switch              Route on \$json.routing_decision. Branch A: autonomous. Branch B: escalation.                                                                                                                   Two branches

  N8       Update --- Awaiting Approval   HTTP Request        \[A\] PATCH \.../cases/{{case_id}}. Body: { status: 'awaiting_approval', resolution_path: 'autonomous', triage_decision: {{decision}} }. Auth: ROAR FastAPI Bearer.                         Updated case

  N9       Trigger Resolution Plan        HTTP Request        \[A\] POST \.../webhooks/resolution-plan. Body: { case_id }. Header: X-Webhook-Secret.                                                                                                          WF5 phase 1 triggered

  N10      Update --- Escalated           HTTP Request        \[B\] PATCH \.../cases/{{case_id}}. Body: { status: 'escalated_human_required', resolution_path: 'escalation', triage_decision: {{decision}} }. Auth: ROAR FastAPI Bearer.                  Updated case

  N11      Trigger Summarization          HTTP Request        \[B\] POST \.../webhooks/triage-escalation. Body: { case_id }. Header: X-Webhook-Secret.                                                                                                        WF4 triggered

| Temp 0.0 --- fully deterministic. Rules must evaluate consistently.                                                             |
|                                                                                                                                 |
| On any parse error in N6: always default to escalation, never autonomous.                                                       |
|                                                                                                                                 |
| N9 triggers /webhooks/resolution-plan (plan only --- not execution). Execution is triggered by approver via /webhooks/approved. |

## 8. Workflow 4 --- Summarization Agent
| **Workflow 4 --- Summarization Agent**                                           |
|                                                                                  |
| Agent: Summarization Agent (Agent 5) · Trigger: POST /webhooks/triage-escalation |
|                                                                                  |
| *PBD Reference: §5 (n8n Spec §8)*                                                |

**Purpose**

Triggered on escalation path. Generates a concise, structured case summary for the escalation team. Saves it to the case record and posts a customer-facing system message so the customer is never left hanging.

**Trigger Payload**

| POST /webhooks/triage-escalation                                      |
|                                                                       |
| { \"case_id\": \"uuid\" }                                             |

**Node Map**

  **\#**   **Node Name**              **Node Type**       **Configuration**                                                                                                                                                                      **Output**
  N1       Webhook Trigger            Webhook             Path: triage-escalation. Method: POST. Auth: ROAR FastAPI.                                                                                                                             { case_id }

  N2       Fetch Full Case            HTTP Request        GET {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Auth: ROAR FastAPI Bearer. Needs: information_bundle, triage_decision, dispute_type, customer details.                                     Full case object

  N3       Build Summary Prompt       Code (JS)           Construct user message: dispute_type, order_id, customer_name, serialized information_bundle, triage_decision (justification + policies_applied). Keep under 1200 tokens total.        { system_prompt, user_message }

  N4       GPT-4o-mini Summary Call   OpenAI Chat Model   Model: gpt-4o-mini. Credential: ROAR OpenAI. Temp: 0.3. Max tokens: 600. Response format: JSON object. System: §12.3.                                                                  { summary, key_facts\[\], escalation_reason, recommended_action, data_sources_queried\[\], policies_relevant\[\] }

  N5       Parse + Validate           Code (JS)           JSON.parse N4. Check all 6 fields present. On parse error: build fallback summary from triage_decision.justification + dispute_type + order_id.                                        Validated summary object

  N6       Save Summary to Case       HTTP Request        PATCH {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Body: { escalation_summary: JSON.stringify(summary) }. Auth: ROAR FastAPI Bearer.                                                        Updated case

  N7       Post Customer Message      HTTP Request        POST \.../cases/{{case_id}}/messages. Body: { content: 'Your case has been escalated. A customer care specialist will join this conversation shortly.', sender_type: 'system' }.   Customer notified

| WF4 runs in parallel with the escalation dashboard update --- agent may view record before summary is ready. |
|                                                                                                              |
| N6 saves escalation_summary as a JSON string. Frontend parses it in EscalationSummaryPanel.                  |
|                                                                                                              |
| Fallback in N5 is mandatory --- never skip summary creation.                                                 |

## 9. Workflow 5 --- Resolution Execution
| **Workflow 5 --- Resolution Execution**                                                                     |
|                                                                                                             |
| Agent: Resolution Agent (Agent 4a + 4b) · Trigger: POST /webhooks/resolution-plan + POST /webhooks/approved |
|                                                                                                             |
| *PBD Reference: §5 (n8n Spec §9)*                                                                           |

**Purpose**

Two-phase workflow. Phase 1 (plan): triggered by WF3 after autonomous decision --- generates resolution plan for approver review. Phase 2 (execute): triggered by approver approval --- executes the plan, creates records, notifies customer.

**Phase 1 Trigger**

  POST /webhooks/resolution-plan { \"case_id\": \"uuid\" }


**Phase 2 Trigger**

  POST /webhooks/approved { \"case_id\": \"uuid\", \"approver_id\": \"uuid\" }


**Node Map --- Phase 1 (Plan Generation)**

  **\#**   **Node Name**           **Node Type**       **Configuration**                                                                                                                   **Output**
  N1       Webhook --- Plan        Webhook             Path: resolution-plan. Method: POST. Auth: ROAR FastAPI.                                                                            { case_id }

  N2       Fetch Full Case         HTTP Request        GET \.../cases/{{case_id}}. Auth: ROAR FastAPI Bearer.                                                                              Case with information_bundle + triage_decision

  N3       Build Plan Prompt       Code (JS)           User message: dispute_type, information_bundle, triage_decision, policies_applied. Phase 1 instruction.                             { system_prompt, user_message }

  N4       GPT-4o-mini Plan Call   OpenAI Chat Model   Temp: 0.2. Max tokens: 600. Response format: JSON object. System: §12.4.                                                            { resolution_type, amount, steps\[\], customer_message }

  N5       Parse Plan              Code (JS)           JSON.parse. Validate resolution_type in \[refund, replacement, redelivery, store_credit\]. Validate amount is numeric if present.   Validated resolution plan

  N6       Save Plan to Case       HTTP Request        PATCH \.../cases/{{case_id}}. Body: { resolution_plan: {{plan}}, status: 'awaiting_approval' }. Auth: ROAR FastAPI Bearer.        Case ready for approver

**Node Map --- Phase 2 (Execution)**

  **\#**   **Node Name**              **Node Type**       **Configuration**                                                                                                                                                             **Output**
  N7       Webhook --- Approved       Webhook             Path: approved. Method: POST. Auth: ROAR FastAPI. Separate entry point from N1 --- both live in same workflow.                                                                { case_id, approver_id }

  N8       Fetch Case + Plan          HTTP Request        GET \.../cases/{{case_id}}. Auth: ROAR FastAPI Bearer.                                                                                                                        Case with resolution_plan + dispute_type

  N9       Build Execute Prompt       Code (JS)           User message: resolution_plan, information_bundle. Phase 2 execution instruction.                                                                                             { system_prompt, user_message }

  N10      GPT-4o-mini Execute Call   OpenAI Chat Model   Temp: 0.0. Max tokens: 400. Response format: JSON object. System: §12.5.                                                                                                      { actions_taken\[\], outcome, notes }

  N11      Route by Dispute Type      Switch              Route on case.dispute_type. Branch A: refund. Branch B: delivery.                                                                                                             Two branches

  N12      Create Refund Record       HTTP Request        \[A\] POST {{FASTAPI_BASE_URL}}/refund_requests. Body: { case_id, order_id, amount: plan.amount, reason: plan.steps\[0\], status: 'pending' }. Auth: ROAR FastAPI Bearer.   Refund record created

  N13      Create Return Record       HTTP Request        \[B\] POST \.../return_requests. Body: { case_id, order_id, item_ids, return_reason, status: 'pending' }. Auth: ROAR FastAPI Bearer.                                        Return record created

  N14      Update Case --- Resolved   HTTP Request        \[Both\] PATCH \.../cases/{{case_id}}. Body: { status: 'resolved', resolution_actions: {{actions_taken}} }. Auth: ROAR FastAPI Bearer.                                      Case resolved

  N15      Post Resolution Message    HTTP Request        POST \.../cases/{{case_id}}/messages. Body: { content: {{plan.customer_message}}, sender_type: 'ai' }. Auth: ROAR FastAPI Bearer.                                           Customer informed

| N1 and N7 are two separate webhook triggers in one workflow --- independent entry points, no shared nodes between phases. |
|                                                                                                                           |
| N10 temperature 0.0 --- execution must be deterministic.                                                                  |
|                                                                                                                           |
| N13 only fires if resolution_type = replacement (delivery disputes).                                                      |

## 10. Workflow 6 --- Case Report Agent
| **Workflow 6 --- Case Report Agent**                                             |
|                                                                                  |
| Agent: Case Report Agent (Agent 6) · Trigger: POST /webhooks/conversation-closed |
|                                                                                  |
| *PBD Reference: §5 (n8n Spec §10)*                                               |

**Purpose**

Triggered on conversation close regardless of path. Fetches the full case and transcript. Generates a complete structured audit record. Writes the report, marks the case closed, and posts a closure message to the customer.

**Trigger Payload**

| POST /webhooks/conversation-closed                                                                                                                              |
|                                                                                                                                                                 |
| { \"case_id\": \"uuid\", \"closed_by\": \"customer\" \| \"agent\" \| \"timeout\", \"close_reason\": \"resolved\" \| \"unresponsive\" \| \"duplicate\" \| null } |

**Node Map**

  **\#**   **Node Name**             **Node Type**       **Configuration**                                                                                                                                                                               **Output**
  N1       Webhook Trigger           Webhook             Path: conversation-closed. Method: POST. Auth: ROAR FastAPI.                                                                                                                                    { case_id, closed_by, close_reason }

  N2       Fetch Full Case           HTTP Request        GET \.../cases/{{case_id}}. Auth: ROAR FastAPI Bearer. All fields: information_bundle, triage_decision, resolution_plan, escalation_summary, rejection_reason.                                  Complete case object

  N3       Fetch Chat Transcript     HTTP Request        GET \.../cases/{{case_id}}/messages. Auth: ROAR FastAPI Bearer.                                                                                                                                 messages\[\] full history

  N4       Build Report Prompt       Code (JS)           Serialize full case. Trim transcript to last 40 messages (keep most recent). Inject closed_by, close_reason. Keep total under 3000 tokens.                                                      { system_prompt, user_message }

  N5       GPT-4o-mini Report Call   OpenAI Chat Model   Temp: 0.0. Max tokens: 1000. Response format: JSON object. System: §12.6.                                                                                                                       Full case report JSON

  N6       Parse + Validate          Code (JS)           JSON.parse N5. Check all required fields. On parse error: build minimal report from raw case fields. Enable 'Continue on Error'.                                                              Validated report object

  N7       Write Case Report         HTTP Request        POST \.../cases/{{case_id}}/report. Body: report + generated_at. Auth: ROAR FastAPI Bearer. Enable 'Continue on Error' --- failure must not block N8.                                         Case report record

  N8       Close Case                HTTP Request        PATCH \.../cases/{{case_id}}. Body: { status: 'closed', closed_by, close_reason, closed_at: new Date().toISOString() }. Auth: ROAR FastAPI Bearer.                                            Case marked closed

  N9       Post Closure Message      HTTP Request        POST \.../cases/{{case_id}}/messages. Body: { content: 'This conversation has been closed. A full case summary has been generated for your records. Thank you.', sender_type: 'system' }.   Customer notified

| Runs for all paths: autonomous, escalation, and rejected.                            |
|                                                                                      |
| N7 must have 'Continue on Error' --- report failure must not prevent case closure. |
|                                                                                      |
| N6 fallback is mandatory --- never skip report creation.                             |

## 11. AI Model Declarations
  **WF**   **Agent**                 **Model**     **Temp**   **Max Tokens**   **JSON Mode**   **Rationale**
  WF1      Intake Agent              gpt-4o-mini   0.2        400              Yes             Natural follow-up phrasing. Structured JSON output.

  WF3      Triage Agent              gpt-4o-mini   0.0        800              Yes             Fully deterministic rule evaluation.

  WF4      Summarization Agent       gpt-4o-mini   0.3        600              Yes             Human-readable summaries. Still structured.

  WF5      Resolution Agent (plan)   gpt-4o-mini   0.2        600              Yes             Natural plan steps. Structured output.

  WF5      Resolution Agent (exec)   gpt-4o-mini   0.0        400              Yes             Deterministic execution reporting.

  WF6      Case Report Agent         gpt-4o-mini   0.0        1000             Yes             Audit record. Highest token budget.

| Set Response Format to 'JSON Object' on every OpenAI Chat Model node in n8n.   |
|                                                                                  |
| This enables OpenAI's native JSON mode --- model will always return valid JSON. |
|                                                                                  |
| Still always wrap parse in try/catch and implement fallbacks (§13).              |

## 12. Prompt Library
All system prompts in final copy-paste form. Paste directly into the OpenAI Chat Model node's system message field in n8n.

### 12.1 WF1 --- Intake Agent
| You are ROAR's intake agent for a retail customer dispute system.                       |
|                                                                                          |
| Your job is to gather sufficient context from the customer about their dispute,          |
|                                                                                          |
| then classify the intent once you have enough information.                               |
|                                                                                          |
| RULES:                                                                                   |
|                                                                                          |
| \- Ask a maximum of 3 follow-up questions total across the entire conversation.          |
|                                                                                          |
| \- Only ask questions from the approved set for the given dispute_type.                  |
|                                                                                          |
| \- Once you have sufficient context (or after 3 questions), classify the intent.         |
|                                                                                          |
| \- Classify as valid_dispute if the issue is a legitimate refund or delivery problem.    |
|                                                                                          |
| \- Classify as insufficient_context only if the customer provided no usable information. |
|                                                                                          |
| \- Be concise and professional.                                                          |
|                                                                                          |
| APPROVED QUESTIONS --- refund disputes:                                                  |
|                                                                                          |
| 1\. Have you received any part of your order?                                            |
|                                                                                          |
| 2\. What payment method did you use for this order?                                      |
|                                                                                          |
| 3\. When was the order placed?                                                           |
|                                                                                          |
| APPROVED QUESTIONS --- delivery disputes:                                                |
|                                                                                          |
| 1\. What is the current tracking status shown to you?                                    |
|                                                                                          |
| 2\. Has the estimated delivery date passed?                                              |
|                                                                                          |
| 3\. Have you contacted the carrier about this issue?                                     |
|                                                                                          |
| RESPONSE FORMAT --- valid JSON only, no prose, no markdown:                              |
|                                                                                          |
| { \"action\": \"ask_question\" \| \"classify_intent\",                                   |
|                                                                                          |
| \"question\": \"string (only if action=ask_question)\",                                  |
|                                                                                          |
| \"intent\": \"valid_dispute\" \| \"insufficient_context\" (only if classifying),         |
|                                                                                          |
| \"intent_summary\": \"one sentence summary (only if classifying)\" }                     |

### 12.2 WF3 --- Triage Agent
| You are ROAR's triage agent. Apply rule-based retail policies to an information bundle          |
|                                                                                                  |
| and determine whether a dispute can be resolved autonomously or must be escalated.               |
|                                                                                                  |
| You will receive: information_bundle, triage_rules, policy_context, current_date.                |
|                                                                                                  |
| EVALUATION RULES:                                                                                |
|                                                                                                  |
| \- Evaluate every rule in triage_rules. Return pass or fail for each.                            |
|                                                                                                  |
| \- ALL rules pass → routing_decision = autonomous                                                |
|                                                                                                  |
| \- ANY rule fails → routing_decision = escalation                                                |
|                                                                                                  |
| \- Any data source null or empty → rule failure → routing_decision = escalation                  |
|                                                                                                  |
| \- Reference specific data values in your evidence field.                                        |
|                                                                                                  |
| RESPONSE FORMAT --- valid JSON only:                                                             |
|                                                                                                  |
| { \"routing_decision\": \"autonomous\" \| \"escalation\",                                        |
|                                                                                                  |
| \"rules_evaluated\": \[ { \"rule\": \"string\", \"passed\": bool, \"evidence\": \"string\" } \], |
|                                                                                                  |
| \"justification\": \"paragraph\",                                                                |
|                                                                                                  |
| \"policies_applied\": \[\"slug\"\],                                                              |
|                                                                                                  |
| \"slas_applied\": \[\"slug\"\] }                                                                 |

### 12.3 WF4 --- Summarization Agent
| You are ROAR's summarization agent. Generate concise case summaries for escalation agents |
|                                                                                            |
| who need to quickly understand a dispute before joining a live customer chat.              |
|                                                                                            |
| GUIDELINES:                                                                                |
|                                                                                            |
| \- summary: 2-3 sentences maximum.                                                         |
|                                                                                            |
| \- key_facts: 3-5 items, specific values preferred (amounts, statuses, dates).             |
|                                                                                            |
| \- recommended_action: one clear directive.                                                |
|                                                                                            |
| RESPONSE FORMAT --- valid JSON only:                                                       |
|                                                                                            |
| { \"summary\": \"string\",                                                                 |
|                                                                                            |
| \"key_facts\": \[\"string\"\],                                                             |
|                                                                                            |
| \"escalation_reason\": \"string\",                                                         |
|                                                                                            |
| \"recommended_action\": \"string\",                                                        |
|                                                                                            |
| \"data_sources_queried\": \[\"oms\",\"logistics\"\],                                       |
|                                                                                            |
| \"policies_relevant\": \[\"policy-slug\"\] }                                               |

### 12.4 WF5 --- Resolution Agent (Phase 1 --- Plan)
| You are ROAR's resolution agent --- Phase 1.                                               |
|                                                                                             |
| Generate a resolution plan for a dispute that has passed autonomous triage.                 |
|                                                                                             |
| RESOLUTION TYPES: refund \| replacement \| redelivery \| store_credit                       |
|                                                                                             |
| \- refund: monetary refund for confirmed transaction amount                                 |
|                                                                                             |
| \- replacement: new shipment for affected items                                             |
|                                                                                             |
| \- redelivery: rearrange delivery for delayed shipment                                      |
|                                                                                             |
| \- store_credit: credit if refund not applicable                                            |
|                                                                                             |
| GUIDELINES:                                                                                 |
|                                                                                             |
| \- steps: 3-5 clear actionable instructions.                                                |
|                                                                                             |
| \- amount: THB value, only for refund type, null otherwise.                                 |
|                                                                                             |
| \- customer_message: professional, empathetic, specific to resolution.                      |
|                                                                                             |
| RESPONSE FORMAT --- valid JSON only:                                                        |
|                                                                                             |
| { \"resolution_type\": \"refund\" \| \"replacement\" \| \"redelivery\" \| \"store_credit\", |
|                                                                                             |
| \"amount\": number \| null,                                                                 |
|                                                                                             |
| \"steps\": \[\"string\"\],                                                                  |
|                                                                                             |
| \"customer_message\": \"string\" }                                                          |

### 12.5 WF5 --- Resolution Agent (Phase 2 --- Execute)
| You are ROAR's resolution agent --- Phase 2. The resolution plan has been approved. |
|                                                                                      |
| Confirm execution of the plan and report actions taken.                              |
|                                                                                      |
| RESPONSE FORMAT --- valid JSON only:                                                 |
|                                                                                      |
| { \"actions_taken\": \[\"string description of each step executed\"\],               |
|                                                                                      |
| \"outcome\": \"success\" \| \"partial\" \| \"failed\",                               |
|                                                                                      |
| \"notes\": \"string\" }                                                              |

### 12.6 WF6 --- Case Report Agent
| You are ROAR's case report agent. Compile a permanent audit record for a closed case. |
|                                                                                        |
| You will receive the full case object and conversation transcript.                     |
|                                                                                        |
| GUIDELINES:                                                                            |
|                                                                                        |
| \- Be thorough and factual --- this is a permanent audit record.                       |
|                                                                                        |
| \- outcome_summary: 2-3 sentences on what happened and how it resolved.                |
|                                                                                        |
| \- Extract actual values from data --- do not paraphrase or generalize.                |
|                                                                                        |
| \- Set inapplicable fields to null.                                                    |
|                                                                                        |
| RESPONSE FORMAT --- valid JSON only:                                                   |
|                                                                                        |
| { \"intent_classification\": \"string\",                                               |
|                                                                                        |
| \"data_sources_queried\": \[\"string\"\],                                              |
|                                                                                        |
| \"policies_applied\": \[\"slug\"\],                                                    |
|                                                                                        |
| \"slas_applied\": \[\"slug\"\],                                                        |
|                                                                                        |
| \"triage_decision\": \"autonomous\" \| \"escalation\",                                 |
|                                                                                        |
| \"resolution_path\": \"string\",                                                       |
|                                                                                        |
| \"approval_outcome\": \"approved\" \| \"rejected\" \| null,                            |
|                                                                                        |
| \"rejection_reason\": \"string \| null\",                                              |
|                                                                                        |
| \"resolution_actions\": \[\"string\"\] \| null,                                        |
|                                                                                        |
| \"outcome_summary\": \"string\",                                                       |
|                                                                                        |
| \"close_reason\": \"string\" }                                                         |

## 13. Error Handling Standards
### 13.1 LLM Failure Handling
  **Failure**        **n8n Setting**                       **Action**
  API timeout        Retry: 3 attempts, 5/15/30s backoff   After 3 failures: PATCH case status = escalated_human_required with justification 'AI processing failed'

  Invalid JSON       try/catch in Code node                Log raw response. Use workflow-specific fallback (§13.2). Never throw uncaught.

  Missing fields     Validate in Code node post-parse      Use safe defaults or fallback. Log warning.

  Rate limit (429)   n8n auto-retry on HTTP 429            Ensure retry enabled on all HTTP nodes calling OpenAI.

### 13.2 Per-Workflow Fallbacks
  **Workflow**        **LLM Failure Fallback**
  WF1 Intake          Post: 'Could you provide more details?' Continue chat loop.

  WF3 Triage          Default routing_decision = 'escalation'. Note: 'Triage error --- manual review required'.

  WF4 Summarization   Build minimal summary from triage_decision.justification + dispute_type + order_id. Skip GPT.

  WF5 Plan            PATCH case status back to 'pending_triage'. Post: 'We are reviewing your case. Please wait.'

  WF5 Execute         Set outcome = 'failed'. Keep status 'resolved'. Flag in notes for manual follow-up.

  WF6 Case Report     Build minimal report from raw case fields. Never skip. Use Continue on Error on N7.

### 13.3 HTTP Request Failures
-   FastAPI non-critical writes (messages, report): enable 'Continue on Error'

-   Supabase queries: retry once on 5xx. On second failure: set result to null, continue to N10

-   Webhook auth failure (wrong secret): return 401, stop execution, log

-   Recommended: create a dedicated n8n Error Workflow that sends an alert on any workflow failure

## 14. Tool and Function Call Reference
This section defines every tool, HTTP call, and LangChain function used across all six workflows. Two subsections: LangChain tool definitions for AI agent nodes, and the complete HTTP Request spec for every outbound call.

| How LangChain tools work in n8n: when using the AI Agent node (not the basic LLM Chain), you attach Tool nodes.  |
|                                                                                                                  |
| Each Tool node defines a callable function the LLM can invoke by name with structured input.                     |
|                                                                                                                  |
| For ROAR Engine, tools are HTTP-based --- each tool wraps one or more FastAPI or Supabase REST calls.            |
|                                                                                                                  |
| The LLM decides which tool to call based on the tool description and the conversation context.                   |
|                                                                                                                  |
| Workflows using the basic LLM Chain (not agent) do not use tools --- they use Code nodes for HTTP calls instead. |

### 14.1 LangChain Tool Definitions
The following tools are defined as n8n Tool nodes and attached to the AI Agent node in each workflow. Each tool has a name, description (what the LLM sees), input schema, and mapped HTTP call.

**WF1 --- Intake Agent Tools**

  **Tool Name**             **Description (LLM sees)**                                                              **Input Schema**                                                                          **Maps To**
  post_follow_up_question   Post a follow-up question to the customer in the dispute chat thread.                   { \"question\": \"string\" }                                                              POST /cases/:id/messages { content: question, sender_type: 'ai' }

  classify_dispute_intent   Classify the customer dispute as valid or insufficient context and record the intent.   { \"intent\": \"valid_dispute\|insufficient_context\", \"intent_summary\": \"string\" }   PATCH /cases/:id { triage_decision: { intent, intent_summary } }

  trigger_data_retrieval    Signal that intent is confirmed and data retrieval should begin for this case.          { \"case_id\": \"string\", \"order_id\": \"string\", \"dispute_type\": \"string\" }       POST /webhooks/bundle-ready

**WF3 --- Triage Agent Tools**

  **Tool Name**             **Description (LLM sees)**                                                               **Input Schema**                                                                                                                                     **Maps To**
  get_case_bundle           Retrieve the full information bundle and case details for a dispute.                     { \"case_id\": \"string\" }                                                                                                                          GET /cases/:id

  get_policies              Retrieve active store, payment, return, delivery, and SLA policies.                      { \"categories\": \[\"store\",\"payment\",\"return\",\"delivery\",\"sla\"\] }                                                                        GET /policies?category=in.(\...)

  record_triage_decision    Record the triage outcome --- routing decision, rules evaluated, and policies applied.   { \"routing_decision\": \"autonomous\|escalation\", \"rules_evaluated\": \[\...\], \"justification\": \"string\", \"policies_applied\": \[\...\] }   PATCH /cases/:id { status, resolution_path, triage_decision }

  trigger_resolution_plan   Trigger resolution plan generation for an autonomously routable case.                    { \"case_id\": \"string\" }                                                                                                                          POST /webhooks/resolution-plan

  trigger_escalation        Trigger escalation summarization for a case that requires human handling.                { \"case_id\": \"string\" }                                                                                                                          POST /webhooks/triage-escalation

**WF4 --- Summarization Agent Tools**

  **Tool Name**                **Description (LLM sees)**                                                     **Input Schema**                                                                                                                                       **Maps To**
  get_case_for_summary         Retrieve full case details including information bundle and triage decision.   { \"case_id\": \"string\" }                                                                                                                            GET /cases/:id

  save_escalation_summary      Save the generated case summary to the case record for the escalation team.    { \"case_id\": \"string\", \"summary\": \"string\", \"key_facts\": \[\...\], \"escalation_reason\": \"string\", \"recommended_action\": \"string\" }   PATCH /cases/:id { escalation_summary }

  notify_customer_escalation   Post a system message informing the customer their case has been escalated.    { \"case_id\": \"string\" }                                                                                                                            POST /cases/:id/messages { sender_type: 'system' }

**WF5 --- Resolution Agent Tools**

  **Tool Name**                **Description (LLM sees)**                                                 **Input Schema**                                                                                                                                    **Maps To**
  get_case_for_resolution      Retrieve full case including information bundle for resolution planning.   { \"case_id\": \"string\" }                                                                                                                         GET /cases/:id

  save_resolution_plan         Save the generated resolution plan to the case for approver review.        { \"case_id\": \"string\", \"resolution_type\": \"string\", \"amount\": \"number\|null\", \"steps\": \[\...\], \"customer_message\": \"string\" }   PATCH /cases/:id { resolution_plan, status: awaiting_approval }

  create_refund_record         Create a refund request record for an approved refund resolution.          { \"case_id\": \"string\", \"order_id\": \"string\", \"amount\": \"number\", \"reason\": \"string\" }                                               POST /refund_requests

  create_return_record         Create a return request record for a replacement or return resolution.     { \"case_id\": \"string\", \"order_id\": \"string\", \"item_ids\": \[\...\], \"return_reason\": \"string\" }                                        POST /return_requests

  mark_case_resolved           Update case status to resolved and record the actions taken.               { \"case_id\": \"string\", \"actions_taken\": \[\...\], \"outcome\": \"success\|partial\|failed\" }                                                 PATCH /cases/:id { status: resolved, resolution_actions }

  notify_customer_resolution   Send the resolution message to the customer in the chat thread.            { \"case_id\": \"string\", \"message\": \"string\" }                                                                                                POST /cases/:id/messages { sender_type: 'ai' }

**WF6 --- Case Report Agent Tools**

  **Tool Name**          **Description (LLM sees)**                                             **Input Schema**                                                                             **Maps To**
  get_full_case          Retrieve the complete case record with all fields and agent outputs.   { \"case_id\": \"string\" }                                                                  GET /cases/:id

  get_chat_transcript    Retrieve the full conversation transcript for a case.                  { \"case_id\": \"string\" }                                                                  GET /cases/:id/messages

  write_case_report      Write the compiled audit report record for a closed case.              { \"case_id\": \"string\", \"report\": { \...full report object\... } }                      POST /cases/:id/report

  close_case             Mark the case as closed with the close reason and timestamp.           { \"case_id\": \"string\", \"closed_by\": \"string\", \"close_reason\": \"string\|null\" }   PATCH /cases/:id { status: closed, closed_by, close_reason, closed_at }

  post_closure_message   Post a closure system message to the customer in the chat thread.      { \"case_id\": \"string\" }                                                                  POST /cases/:id/messages { sender_type: 'system' }

### 14.2 Complete HTTP Request Specification
Every outbound HTTP call made by n8n nodes across all workflows. Auth column: FB = ROAR FastAPI Bearer, FH = ROAR FastAPI header, SB = ROAR Supabase.

  **WF**   **Node**                  **Method**   **URL Template**                                                                                          **Body / Params**                                                            **Auth**
  WF1      N3 Fetch History          GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           ---                                                                          FB

  WF1      N8 Post Follow-up         POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           { content, sender_type: \"ai\" }                                             FB

  WF1      N9 Update Triaging        PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { status: \"pending_triage\", triage_decision }                              FB

  WF1      N10 Post Intent Msg       POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           { content: \"intent confirmed msg\", sender_type: \"ai\" }                   FB

  WF1      N11 Trigger WF2           POST         {{FASTAPI_BASE_URL}}/webhooks/bundle-ready                                                                { case_id, dispute_type, order_id }                                          FH

  WF2      N3 OMS Orders             GET          {{SUPABASE_URL}}/rest/v1/sim_orders?order_id=eq.{{order_id}}&select=\*                                    Headers: apikey + Authorization: Bearer                                      SB

  WF2      N4 OMS Items              GET          {{SUPABASE_URL}}/rest/v1/sim_order_items?order_id=eq.{{order_id}}&select=\*                               Headers: apikey + Authorization: Bearer                                      SB

  WF2      N5 Payment Txn            GET          {{SUPABASE_URL}}/rest/v1/sim_transactions?order_id=eq.{{order_id}}&select=\*                              Headers: apikey + Authorization: Bearer                                      SB

  WF2      N6 Payment Refunds        GET          {{SUPABASE_URL}}/rest/v1/sim_refund_records?order_id=eq.{{order_id}}&select=\*                            Headers: apikey + Authorization: Bearer                                      SB

  WF2      N7 Logistics Shipment     GET          {{SUPABASE_URL}}/rest/v1/sim_shipments?order_id=eq.{{order_id}}&select=\*                                 Headers: apikey + Authorization: Bearer                                      SB

  WF2      N8 Logistics Events       GET          {{SUPABASE_URL}}/rest/v1/sim_tracking_events?shipment_id=eq.{{id}}&select=\*&order=event_time.asc         Headers: apikey + Authorization: Bearer                                      SB

  WF2      N9 Inventory              GET          {{SUPABASE_URL}}/rest/v1/sim_stock_records?item_id=in.({{csv}})&select=\*                                 Headers: apikey + Authorization: Bearer                                      SB

  WF2      N11 Update Bundle         PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { information_bundle }                                                       FB

  WF2      N12 Trigger WF3           POST         {{FASTAPI_BASE_URL}}/webhooks/triage-complete                                                             { case_id, dispute_type }                                                    FH

  WF3      N2 Fetch Case             GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    ---                                                                          FB

  WF3      N3 Fetch Policies         GET          {{FASTAPI_BASE_URL}}/policies?category=in.(store,payment,return,delivery,sla)&select=slug,title,content   ---                                                                          FB

  WF3      N8 Update Approval        PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { status: \"awaiting_approval\", resolution_path, triage_decision }          FB

  WF3      N9 Trigger WF5 Plan       POST         {{FASTAPI_BASE_URL}}/webhooks/resolution-plan                                                             { case_id }                                                                  FH

  WF3      N10 Update Escalated      PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { status: \"escalated_human_required\", resolution_path, triage_decision }   FB

  WF3      N11 Trigger WF4           POST         {{FASTAPI_BASE_URL}}/webhooks/triage-escalation                                                           { case_id }                                                                  FH

  WF4      N2 Fetch Case             GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    ---                                                                          FB

  WF4      N6 Save Summary           PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { escalation_summary: JSON.stringify(summary) }                              FB

  WF4      N7 Post Customer Msg      POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           { content: \"escalated msg\", sender_type: \"system\" }                      FB

  WF5      N2 Fetch Case (plan)      GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    ---                                                                          FB

  WF5      N6 Save Plan              PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { resolution_plan, status: \"awaiting_approval\" }                           FB

  WF5      N8 Fetch Case (exec)      GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    ---                                                                          FB

  WF5      N12 Create Refund         POST         {{FASTAPI_BASE_URL}}/refund_requests                                                                      { case_id, order_id, amount, reason, status: \"pending\" }                   FB

  WF5      N13 Create Return         POST         {{FASTAPI_BASE_URL}}/return_requests                                                                      { case_id, order_id, item_ids, return_reason, status: \"pending\" }          FB

  WF5      N14 Update Resolved       PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { status: \"resolved\", resolution_actions }                                 FB

  WF5      N15 Post Resolution Msg   POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           { content: customer_message, sender_type: \"ai\" }                           FB

  WF6      N2 Fetch Case             GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    ---                                                                          FB

  WF6      N3 Fetch Transcript       GET          {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           ---                                                                          FB

  WF6      N7 Write Report           POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/report                                                             { \...report object, generated_at }                                          FB

  WF6      N8 Close Case             PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                                                    { status: \"closed\", closed_by, close_reason, closed_at }                   FB

  WF6      N9 Post Closure Msg       POST         {{FASTAPI_BASE_URL}}/cases/{{case_id}}/messages                                                           { content: \"closure msg\", sender_type: \"system\" }                        FB

### 14.3 Supabase REST Query Reference
All 9 Supabase queries used in WF2. Use the Supabase PostgREST syntax. All requests require both apikey and Authorization: Bearer headers set to the service role key.

  **Query**                 **Full URL + Params**                                                                                                                       **Filter Logic**                                 **Returns**
  OMS --- Order             GET /rest/v1/sim_orders?order_id=eq.{{order_id}}&select=id,order_id,customer_email,status,total_amount,created_at,fulfilled_at              Exact match on order_id                          Single order record

  OMS --- Items             GET /rest/v1/sim_order_items?order_id=eq.{{order_id}}&select=id,item_id,item_name,quantity,unit_price                                       Exact match on order_id                          Array of order items

  Payment --- Transaction   GET /rest/v1/sim_transactions?order_id=eq.{{order_id}}&select=id,status,amount,payment_method,transacted_at                                 Exact match on order_id                          Single transaction

  Payment --- Refunds       GET /rest/v1/sim_refund_records?order_id=eq.{{order_id}}&select=id,amount,status,refunded_at                                                Exact match on order_id                          Array (may be empty)

  Logistics --- Shipment    GET /rest/v1/sim_shipments?order_id=eq.{{order_id}}&select=id,carrier,tracking_number,status,estimated_delivery,shipped_at                  Exact match on order_id                          Single shipment record

  Logistics --- Events      GET /rest/v1/sim_tracking_events?shipment_id=eq.{{shipment_id}}&select=id,event_type,location,event_time&order=event_time.asc               Exact match on shipment.id from prev query       Array of events, chronological

  Inventory                 GET /rest/v1/sim_stock_records?item_id=in.({{item_id_1}},{{item_id_2}})&select=id,item_id,item_name,quantity_available,warehouse_location   IN filter on item_ids extracted from OMS items   Array of stock records

  Duplicate Check           GET /rest/v1/cases?order_id=eq.{{order_id}}&status=neq.closed&select=id,status                                                              Used in triage rule: no prior open dispute       Array (empty = no duplicate)

## 15. Webhook URL Reference
### 15.1 FastAPI → n8n (Inbound)
  **Path**                        **Full URL**                                                     **Triggered By**                                                   **Triggers**
  /webhooks/case-created          https://n8n.roarengine.railway.app/webhook/case-created          FastAPI on new case + each new customer message (pending_triage)   WF1

  /webhooks/bundle-ready          https://n8n.roarengine.railway.app/webhook/bundle-ready          WF1 on intent confirmed                                            WF2

  /webhooks/triage-complete       https://n8n.roarengine.railway.app/webhook/triage-complete       WF2 on bundle assembled                                            WF3

  /webhooks/triage-escalation     https://n8n.roarengine.railway.app/webhook/triage-escalation     WF3 on escalation decision                                         WF4

  /webhooks/resolution-plan       https://n8n.roarengine.railway.app/webhook/resolution-plan       WF3 on autonomous decision                                         WF5 phase 1

  /webhooks/approved              https://n8n.roarengine.railway.app/webhook/approved              FastAPI on approver approve action                                 WF5 phase 2

  /webhooks/conversation-closed   https://n8n.roarengine.railway.app/webhook/conversation-closed   FastAPI on conversation close event                                WF6

**15.2 n8n → FastAPI (Outbound Summary)**

  **Endpoint**                  **Method**   **Used In Workflows**
  /cases/:id                    GET          WF1, WF2(via bundle update), WF3, WF4, WF5(×2), WF6(×2)

  /cases/:id                    PATCH        WF1, WF3(×2), WF4, WF5(×2), WF6

  /cases/:id/messages           GET          WF1, WF6

  /cases/:id/messages           POST         WF1, WF4, WF5, WF6

  /cases/:id/report             POST         WF6

  /refund_requests              POST         WF5

  /return_requests              POST         WF5

  /policies                     GET          WF3

  /webhooks/bundle-ready        POST         WF1 → triggers WF2

  /webhooks/triage-complete     POST         WF2 → triggers WF3

  /webhooks/triage-escalation   POST         WF3 → triggers WF4

  /webhooks/resolution-plan     POST         WF3 → triggers WF5 phase 1

## 16. MCP Servers --- Post-MVP Guidance
MCP (Model Context Protocol) servers are not required for the ROAR Engine MVP. All data sources are simulated via Supabase REST endpoints which n8n's built-in HTTP Request nodes handle directly.

**Post-MVP MCP integration plan:**

  **MCP Server**                 **Purpose**                                                       **Replaces**                                        **Priority**
  Gosoft POS MCP                 Real-time order and transaction data from Gosoft's POS systems   sim_orders, sim_transactions tables in WF2          High --- first post-MVP integration

  Payment Gateway MCP            Live payment status, refund execution via Gosoft payment rails    sim_refund_records, manual refund creation in WF5   High --- enables real autonomous refunds

  Logistics Provider MCP         Live tracking data from Kerry Express / Flash / Thailand Post     sim_shipments, sim_tracking_events tables in WF2    Medium

  Notification MCP (email/SMS)   Send customer notifications via email or SMS on case updates      In-app messages only in MVP                         Medium

  Gosoft CRM MCP                 Customer history, loyalty status, prior dispute records           Manual duplicate check query in WF2                 Low --- enrichment only

| When integrating MCP post-MVP: replace the relevant HTTP Request nodes in WF2 with MCP Tool nodes.               |
|                                                                                                                  |
| n8n supports MCP via the \@n8n/n8n-nodes-langchain package --- MCP client nodes are available from n8n \>= 1.35. |
|                                                                                                                  |
| No workflow restructuring needed --- only the data source nodes in WF2 and execution nodes in WF5 change.        |
|                                                                                                                  |
| All other workflows (WF1, WF3, WF4, WF6) remain unchanged for MCP integration.                                   |

## 17. Testing Checklist
Run checks in order. Use seeded demo scenarios from PBD §10. Do not proceed to the next workflow until all checks pass.

**WF1 --- Intake Agent**

-   Trigger manually with Scenario A payload (refund, ORD-10042)

-   Confirm follow-up question posted to case messages

-   Simulate 2 customer replies --- trigger webhook again with updated message each time

-   After sufficient turns, confirm intent classified as valid_dispute

-   Confirm case status updated in Supabase

-   Confirm WF2 webhook triggered in n8n execution log

**WF2 --- Data Retrieval Agent**

-   Trigger with Scenario A (refund) --- confirm OMS + Payment queried, Logistics skipped

-   Trigger with Scenario B (delivery) --- confirm OMS + Logistics + Inventory queried

-   Inspect information_bundle in Supabase --- all source data present and structured

-   Confirm WF3 triggered

-   Test null source: empty a sim table temporarily --- confirm N10 handles null without error

**WF3 --- Triage Agent**

-   Scenario A: all rules pass --- confirm routing_decision = autonomous

-   Scenario B: lost shipment --- confirm routing_decision = escalation

-   Inspect triage_decision in Supabase --- rules_evaluated array has one entry per rule with pass/fail

-   Confirm Scenario A triggers WF5 (resolution-plan webhook)

-   Confirm Scenario B triggers WF4 (triage-escalation webhook)

**WF4 --- Summarization Agent**

-   Trigger with Scenario B case_id

-   Inspect escalation_summary in Supabase --- all 6 fields present

-   Confirm system message posted to chat

-   Test fallback: break OpenAI credential --- confirm minimal summary generated from raw fields

**WF5 --- Resolution Execution**

-   Phase 1: trigger resolution-plan webhook --- confirm resolution_plan saved, status = awaiting_approval

-   Inspect resolution_plan --- resolution_type, amount, steps\[\], customer_message all present

-   Phase 2: trigger approved webhook --- confirm refund_request record created in Supabase

-   Confirm case status = resolved, resolution_actions saved

-   Confirm customer_message posted to chat

**WF6 --- Case Report Agent**

-   Trigger conversation-closed with Scenario A case_id

-   Inspect case_reports table --- all required fields populated

-   Confirm case status = closed

-   Confirm closure message posted to chat

-   Test with Scenario B case --- confirm report captures escalation_summary and human agent messages

**E2E Smoke Tests**

-   Scenario A (Refund --- Autonomous): form → chatbot → intent → data pull → triage pass → plan → approve → refund record → customer notified → close → report

-   Scenario B (Delivery --- Escalation): form → chatbot → intent → data pull → triage fail → escalate → summary → agent joins → resolves → close → report

-   Both complete without uncaught errors in n8n execution logs

-   Supabase has complete, consistent data for both cases post-test

*--- End of Document ---*
