**Changelog**

  **Version**   **Date**     **Change**                                                                                             **Section(s)**
  v2.0          March 2026   Added Section 14 (Tool/Function Call Reference), Section 16 (MCP guidance). Corrected 5→6 workflows.   All

  v2.1          March 2026   WF2 data access updated: Supabase REST queries replaced with FastAPI /internal/sources/\* endpoints    §6, §14.2, §14.3

  v2.1          March 2026   Credential ROAR Supabase removed. ROAR FastAPI credentials handle all auth.                            §3

  v2.1          March 2026   WF2 node count reduced from 12 to 10 (OMS and logistics queries consolidated per internal endpoint)    §6

  v2.1          March 2026   Supabase query reference (§14.3) replaced with FastAPI internal endpoint reference                     §14.3

## 1. Document Overview
This document is the complete hands-on implementation reference for ROAR Engine's n8n orchestration layer. v2.1 updates WF2 (Data Retrieval Agent) to call FastAPI /internal/sources/\* endpoints instead of querying PostgreSQL via Supabase REST. All other workflows unchanged from v2.0.

  **Field**             **Value**
  Document Type         n8n Implementation Specification

  Version               2.1 (supersedes v2.0)

  Companion Docs        PRD v1.2, PBD v1.1, Architecture v1.1, BRL v1.1

  n8n Version           n8n \>= 1.30

  LLM                   GPT-4o-mini via OpenAI API

  Workflows             6 total --- one per agent

  Key Change            WF2 now calls FastAPI /internal/sources/\* instead of Supabase REST

| All content from n8n Spec v2.0 remains valid EXCEPT:                                 |
|                                                                                      |
| \- §3 Credentials: ROAR Supabase credential removed (no longer needed)               |
|                                                                                      |
| \- §6 WF2 node map: updated (10 nodes instead of 12, FastAPI internal endpoints)     |
|                                                                                      |
| \- §14.2 HTTP Request spec: WF2 rows updated                                         |
|                                                                                      |
| \- §14.3 Supabase query reference: replaced with FastAPI internal endpoint reference |
|                                                                                      |
| Sections 1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17 are unchanged from v2.0.    |

**2. n8n Instance Setup**

Unchanged from n8n Spec v2.0 §2. Install \@n8n/n8n-nodes-langchain. Set environment variables. No Supabase-related env vars required.

**2.1 n8n Environment Variables**

| FASTAPI_BASE_URL=https://api.roarengine.railway.app                   |
|                                                                       |
| FASTAPI_WEBHOOK_SECRET=your-shared-secret                             |
|                                                                       |
| OPENAI_API_KEY=sk-\...                                                |
|                                                                       |
| \# Note: No SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY needed in v2.1  |

## 3. Credentials Configuration
v2.1 removes the ROAR Supabase credential. Only three credentials are needed.

  **Credential Name**   **Type in n8n**          **Value**                                                    **Used In**
  ROAR OpenAI           OpenAI API               Your OpenAI API key (sk-\...)                                All 6 workflows --- AI Chat Model node

  ROAR FastAPI          HTTP Header Auth         Header: X-Webhook-Secret, Value: shared secret               All workflows --- outbound HTTP Request nodes

  ROAR FastAPI Bearer   HTTP Bearer Token Auth   Token: your FastAPI service JWT (generated at deploy time)   All GET/PATCH FastAPI calls from n8n

| ROAR Supabase credential from v2.0 is removed --- no longer needed.                                                                              |
|                                                                                                                                                  |
| n8n never queries the database directly in v2.1. All data access goes through FastAPI.                                                           |
|                                                                                                                                                  |
| ROAR FastAPI Bearer: generate a long-lived service JWT by calling POST /auth/login with a dedicated n8n service account during deployment setup. |

## 4. Workflow Registry
Unchanged from v2.0. Six workflows, same triggers and file names.

  **\#**   **Workflow**           **File**                 **Agent**                  **Trigger**                                      **Changed?**
  1        Intake Agent           01_intake_agent.json     Intake Agent (1)           /webhooks/case-created                           No

  2        Data Retrieval Agent   02_data_retrieval.json   Data Retrieval Agent (2)   /webhooks/bundle-ready                           YES --- v2.1

  3        Triage Agent           03_triage_agent.json     Triage Agent (3)           /webhooks/triage-complete                        No

  4        Summarization Agent    04_summarization.json    Summarization Agent (5)    /webhooks/triage-escalation                      No

  5        Resolution Execution   05_resolution.json       Resolution Agent (4a+4b)   /webhooks/resolution-plan + /webhooks/approved   No

  6        Case Report Agent      06_case_report.json      Case Report Agent (6)      /webhooks/conversation-closed                    No

## 5. Workflows 1, 3, 4, 5, 6 --- Unchanged
WF1 (Intake Agent), WF3 (Triage Agent), WF4 (Summarization Agent), WF5 (Resolution Execution), and WF6 (Case Report Agent) are identical to n8n Spec v2.0 §5, §7, §8, §9, §10 respectively. Refer to n8n Spec v2.0 for their full node maps.

| The only change that touches WF3 is that the /policies endpoint is now served by FastAPI (unchanged --- it was already a FastAPI call in v2.0). |
|                                                                                                                                                 |
| WF1 and WF6 still call FastAPI /cases/:id/messages --- unchanged.                                                                               |
|                                                                                                                                                 |
| WF5 still calls FastAPI /refund_requests and /return_requests --- unchanged.                                                                    |

## 6. Workflow 2 --- Data Retrieval Agent (Updated)
| **Workflow 2 --- Data Retrieval Agent**                                      |
|                                                                              |
| Agent: Data Retrieval Agent (Agent 2) · Trigger: POST /webhooks/bundle-ready |
|                                                                              |
| *PBD v1.1 Reference: §5*                                                     |

**What Changed from v2.0**

-   Nodes N3--N9 previously queried Supabase REST endpoints directly.

-   In v2.1, these nodes call FastAPI /internal/sources/\* endpoints instead.

-   OMS order + items are now returned together in one /internal/sources/orders call (N3).

-   Logistics shipment + tracking events are now returned together in one /internal/sources/shipments call (N6).

-   Node count reduced from 12 to 10 --- two fewer HTTP Request nodes.

-   ROAR Supabase credential removed --- all nodes use ROAR FastAPI or ROAR FastAPI Bearer.

**Trigger Payload**

| POST /webhooks/bundle-ready                                                                          |
|                                                                                                      |
| { \"case_id\": \"uuid\", \"dispute_type\": \"refund\" \| \"delivery\", \"order_id\": \"ORD-10042\" } |

**Updated Node Map**

  **\#**   **Node Name**               **Node Type**   **Configuration**                                                                                                                                                                                                                                                                            **Output**
  N1       Webhook Trigger             Webhook         Path: bundle-ready. Method: POST. Auth: ROAR FastAPI.                                                                                                                                                                                                                                        { case_id, dispute_type, order_id }

  N2       Route by Dispute Type       Switch          Route on \$json.body.dispute_type. Branch A: refund. Branch B: delivery.                                                                                                                                                                                                                     Two branches

  N3       Query OMS                   HTTP Request    \[Both\] GET {{FASTAPI_BASE_URL}}/internal/sources/orders?order_id={{order_id}}. Header: X-Webhook-Secret: {{FASTAPI_WEBHOOK_SECRET}}. Returns order + items in one response.                                                                                                                { order, order_items\[\] }

  N4       Query Payment --- Txn       HTTP Request    \[A refund only\] GET {{FASTAPI_BASE_URL}}/internal/sources/transactions?order_id={{order_id}}. Header: X-Webhook-Secret.                                                                                                                                                                    transaction record

  N5       Query Payment --- Refunds   HTTP Request    \[A refund only\] GET {{FASTAPI_BASE_URL}}/internal/sources/refunds?order_id={{order_id}}. Header: X-Webhook-Secret.                                                                                                                                                                         refund_records\[\]

  N6       Query Logistics             HTTP Request    \[B delivery only\] GET {{FASTAPI_BASE_URL}}/internal/sources/shipments?order_id={{order_id}}. Header: X-Webhook-Secret. Returns shipment + tracking events in one response.                                                                                                                 { shipment, tracking_events\[\] }

  N7       Query Inventory             HTTP Request    \[B delivery only\] GET {{FASTAPI_BASE_URL}}/internal/sources/inventory?item_ids={{csv_of_item_ids}}. Extract item_ids from N3.order_items. Header: X-Webhook-Secret.                                                                                                                        stock_records\[\]

  N8       Assemble Bundle             Code (JS)       Merge all branch outputs: { order: N3.order, order_items: N3.order_items, transaction?: N4, refund_records?: N5, shipment?: N6.shipment, tracking_events?: N6.tracking_events, stock_records?: N7, queried_at: new Date().toISOString(), dispute_type }. Handle nulls for unused branches.   information_bundle JSON

  N9       Update Case --- Bundle      HTTP Request    PATCH {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Body: { information_bundle: {{bundle}} }. Auth: ROAR FastAPI Bearer.                                                                                                                                                                           Updated case

  N10      Trigger Triage              HTTP Request    POST {{FASTAPI_BASE_URL}}/webhooks/triage-complete. Body: { case_id, dispute_type }. Header: X-Webhook-Secret.                                                                                                                                                                               WF3 triggered

| N3 returns both order and order_items in a single response (FastAPI joins them).                                                                   |
|                                                                                                                                                    |
| N6 returns both shipment and tracking_events in a single response (FastAPI joins them).                                                            |
|                                                                                                                                                    |
| This reduces WF2 from 12 nodes to 10 nodes compared to v2.0.                                                                                       |
|                                                                                                                                                    |
| N8 extracts item_ids from N3.order_items to build the CSV for N7 --- this logic is the same as v2.0 but simpler since items arrive with the order. |

## 7. AI Model Declarations
Unchanged from n8n Spec v2.0 §11. GPT-4o-mini, JSON mode on all agents. Temperature and token settings unchanged.

## 8. Prompt Library
All six system prompts unchanged from n8n Spec v2.0 §12. Copy from v2.0 §12.1--12.6.

## 9. Error Handling Standards
Unchanged from n8n Spec v2.0 §13. Per-workflow fallbacks apply. WF2 fallback updated: if any /internal/sources/\* endpoint returns error, set that source to null in bundle and continue. WF3 will detect null and escalate.

## 10. Tool and Function Call Reference
### 10.1 LangChain Tool Definitions
All tool definitions unchanged from n8n Spec v2.0 §14.1. Tools call the same FastAPI endpoints. WF2 Data Retrieval Agent does not use LangChain tools --- it uses HTTP Request nodes directly.

### 10.2 Complete HTTP Request Specification --- WF2 Updated
Only WF2 rows change from n8n Spec v2.0 §14.2. All other workflow rows are identical.

  **WF**   **Node**                   **Method**   **URL Template**                                                           **Headers**                    **Auth**
  WF2      N3 Query OMS               GET          {{FASTAPI_BASE_URL}}/internal/sources/orders?order_id={{order_id}}         X-Webhook-Secret: {{secret}}   ROAR FastAPI

  WF2      N4 Query Payment Txn       GET          {{FASTAPI_BASE_URL}}/internal/sources/transactions?order_id={{order_id}}   X-Webhook-Secret               ROAR FastAPI

  WF2      N5 Query Payment Refunds   GET          {{FASTAPI_BASE_URL}}/internal/sources/refunds?order_id={{order_id}}        X-Webhook-Secret               ROAR FastAPI

  WF2      N6 Query Logistics         GET          {{FASTAPI_BASE_URL}}/internal/sources/shipments?order_id={{order_id}}      X-Webhook-Secret               ROAR FastAPI

  WF2      N7 Query Inventory         GET          {{FASTAPI_BASE_URL}}/internal/sources/inventory?item_ids={{csv}}           X-Webhook-Secret               ROAR FastAPI

  WF2      N9 Update Bundle           PATCH        {{FASTAPI_BASE_URL}}/cases/{{case_id}}                                     Bearer JWT                     ROAR FastAPI Bearer

  WF2      N10 Trigger Triage         POST         {{FASTAPI_BASE_URL}}/webhooks/triage-complete                              X-Webhook-Secret               ROAR FastAPI

| All other workflow HTTP calls (WF1, WF3, WF4, WF5, WF6) are unchanged from n8n Spec v2.0 §14.2. |
|                                                                                                 |
| Removed from v2.0: all rows with URL containing supabase.co --- these no longer apply.          |

### 10.3 FastAPI Internal Endpoint Reference --- Replaces Supabase Query Reference
This section replaces n8n Spec v2.0 §14.3 (Supabase REST Query Reference). These are the FastAPI /internal/sources/\* endpoints called by WF2.

  **Endpoint**                            **Query Param**   **Response Shape**                        **DB Tables Joined**                  **Used In**
  GET /internal/sources/orders            order_id          { order: {}, order_items: \[\] }          sim_orders + sim_order_items          WF2 N3 (both types)

  GET /internal/sources/transactions      order_id          { transaction: {} }                       sim_transactions                      WF2 N4 (refund)

  GET /internal/sources/refunds           order_id          { refund_records: \[\] }                  sim_refund_records                    WF2 N5 (refund)

  GET /internal/sources/shipments         order_id          { shipment: {}, tracking_events: \[\] }   sim_shipments + sim_tracking_events   WF2 N6 (delivery)

  GET /internal/sources/inventory         item_ids (CSV)    { stock_records: \[\] }                   sim_stock_records                     WF2 N7 (delivery)

  GET /internal/sources/duplicate-check   order_id          { has_duplicate: bool, case_id?: uuid }   cases                                 WF3 triage rule BR-DEL-003

| All endpoints protected by X-Webhook-Secret header --- same secret as other n8n webhook calls.                           |
|                                                                                                                          |
| Each endpoint returns a consistent JSON shape regardless of whether records exist (empty arrays, null objects).          |
|                                                                                                                          |
| FastAPI handles all SQL joins internally --- n8n receives clean, structured responses.                                   |
|                                                                                                                          |
| /internal/sources/duplicate-check is also used by WF3 Triage Agent to evaluate BR-DEL-003 (no duplicate complaint rule). |

## 11. Webhook URL Reference
Unchanged from n8n Spec v2.0 §15. All seven webhook URLs and payloads are identical.

## 12. MCP Servers --- Post-MVP Guidance
Unchanged from n8n Spec v2.0 §16. MCP servers are post-MVP. When integrating, replace /internal/sources/\* calls in WF2 with MCP Tool nodes. All other workflows unchanged.

## 13. Testing Checklist
Testing checklist from n8n Spec v2.0 §17 applies. The only change for WF2 testing:

**WF2 Updated Test Steps**

-   Trigger with Scenario A (refund) --- confirm GET /internal/sources/orders and /transactions and /refunds are called (not Supabase REST)

-   Trigger with Scenario B (delivery) --- confirm GET /internal/sources/orders, /shipments, and /inventory are called

-   Inspect assembled information_bundle in DB --- all source data present and correctly structured

-   Verify N3 response contains both order and order_items (single call)

-   Verify N6 response contains both shipment and tracking_events (single call)

-   Test /internal/sources/\* with invalid order_id --- confirm 404 or empty response handled gracefully by N8 (null in bundle)

-   Confirm WF3 triggered after bundle written

*--- End of Document ---*
