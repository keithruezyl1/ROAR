**Changelog**

  **Version**   **Date**     **Change**                                                                                        **Section(s)**
  v1.0          March 2026   Initial release                                                                                   All

  v1.1          March 2026   Database stack: Supabase replaced with PostgreSQL on Railway throughout                           §2, §3, §4, §10, §11

  v1.1          March 2026   Auth: Supabase Auth replaced with FastAPI JWT (python-jose + passlib)                             §2, §4, §11

  v1.1          March 2026   n8n WF2 data access: Supabase REST queries replaced with FastAPI /internal/sources/\* endpoints   §5.2, §4.2, §4.4

  v1.1          March 2026   New internal API endpoints added: /internal/sources/\* for n8n data queries                       §4.2 (new subsection)

  v1.1          March 2026   DB structure updated: supabase/ renamed to db/, alembic/migrations added                          §9

  v1.1          March 2026   New companion docs referenced: Policies v1.0, Resolution Paths v1.0, BRL v1.1                     §1

## 1. Document Overview
This Product Breakdown Document (PBD) is the technical companion to the ROAR Engine PRD. It defines the complete implementation specification: database schema, API contracts, n8n workflow design, AI agent prompt templates, component inventory, page map, and repository structure.

  **Field**             **Value**
  Document Type         Product Breakdown Document (PBD)

  Version               1.1

  Companion Documents   PRD v1.2, Architecture v1.1, n8n Spec v2.0, BRL v1.1, Policies v1.0, Resolution Paths v1.0

  Stack                 Next.js 14 · FastAPI · n8n + LangChain · GPT-4o-mini · PostgreSQL on Railway

  Build Window          48 hours --- Gosoft Retail Hackathon 2026

## 2. System Architecture
### 2.1 High-Level Architecture
-   Frontend --- Next.js 14 on Vercel. All data from FastAPI via REST. Polling for live chat updates (4s interval).

-   Backend API --- FastAPI (Python) on Railway. Handles all CRUD, JWT auth, case management, and webhook dispatch to n8n.

-   Orchestration Layer --- n8n on Railway with LangChain. Six AI agent workflows. Calls FastAPI /internal/sources/\* for data --- never queries DB directly.

-   Data Layer --- PostgreSQL on Railway. SQLAlchemy async ORM + asyncpg. Accessed only through FastAPI.

| Key change from v1.0: Supabase is removed. Database is PostgreSQL on Railway accessed exclusively through FastAPI. |
|                                                                                                                    |
| Auth is FastAPI JWT (python-jose + passlib) --- no external auth service.                                          |
|                                                                                                                    |
| n8n no longer queries Supabase REST directly --- it calls FastAPI /internal/sources/\* endpoints.                  |
|                                                                                                                    |
| See Architecture v1.1 for full layer specifications and communication map.                                         |

### 2.2 Request Flow Summary
  **Step**                           **From**          **To**                             **Protocol**
  1\. Customer submits form          Next.js           FastAPI POST /cases                REST

  2\. Case created, n8n triggered    FastAPI           n8n webhook                        HTTP webhook

  3\. Intake Agent chat              n8n / LangChain   GPT-4o-mini                        OpenAI API

  4\. Data retrieval                 n8n               FastAPI GET /internal/sources/\*   REST GET

  5\. Triage Agent                   n8n / LangChain   GPT-4o-mini                        OpenAI API

  6\. Resolution plan or summary     n8n / LangChain   GPT-4o-mini                        OpenAI API

  7\. Case state updated             n8n               FastAPI PATCH /cases/:id           REST PATCH

  8\. Agent dashboard updates        FastAPI           Next.js (polling)                  REST polling

  9\. Approval action                Next.js           FastAPI POST /cases/:id/approve    REST POST

  10\. Resolution executed           FastAPI           n8n webhook                        HTTP webhook

  11\. Conversation close → report   FastAPI           n8n webhook                        HTTP webhook

  12\. Case report written           n8n               FastAPI POST /cases/:id/report     REST POST

## 3. Database Schema
All tables reside in PostgreSQL on Railway. Managed via SQLAlchemy async ORM. Migrations in db/migrations/. Two table groups: Application Tables and Simulated Source Tables.

### 3.1 Application Tables
**users**

  **Column**        **Type**      **Constraints**                                    **Description**
  id                uuid          PK, default gen_random_uuid()                      User primary key

  email             text          NOT NULL, UNIQUE                                   Login email

  hashed_password   text          NOT NULL                                           bcrypt hashed password (passlib)

  role              text          NOT NULL, CHECK IN ('approver','escalation')   User role for routing

  full_name         text          NOT NULL                                           Display name

  created_at        timestamptz   DEFAULT now()                                      Account creation timestamp

**cases**

  **Column**                 **Type**      **Constraints**                                      **Description**
  id                         uuid          PK, default gen_random_uuid()                        Case primary key

  reference_number           text          NOT NULL, UNIQUE                                     Human-readable ID (CASE-00042)

  order_id                   text          NOT NULL                                             Customer-provided order reference

  dispute_type               text          NOT NULL, CHECK IN ('refund','delivery')         Dispute category

  customer_name              text          NOT NULL                                             Customer full name

  customer_email             text          NOT NULL                                             Customer contact email

  intake_message             text          NOT NULL                                             Original freeform message

  status                     text          NOT NULL                                             Current case status

  resolution_path            text          CHECK IN ('autonomous','escalation',NULL)        Set after triage

  assigned_to                uuid          FK users.id, NULLABLE                                Agent assigned to case

  triage_decision            jsonb         NULLABLE                                             Full triage output from Triage Agent

  information_bundle         jsonb         NULLABLE                                             Assembled data from all sources

  resolution_plan            jsonb         NULLABLE                                             Resolution Agent output

  rejection_reason           text          NULLABLE                                             Approver rejection reason

  escalation_summary         text          NULLABLE                                             Summarization Agent output (JSON string)

  last_customer_message_at   timestamptz   NULLABLE                                             For inactivity timeout tracking

  closed_by                  text          CHECK IN ('customer','agent','timeout',NULL)   Closure trigger

  close_reason               text          NULLABLE                                             Agent close reason

  created_at                 timestamptz   DEFAULT now()                                        Case creation

  updated_at                 timestamptz   DEFAULT now()                                        Last update

  closed_at                  timestamptz   NULLABLE                                             Conversation close timestamp

**chat_messages**

  **Column**    **Type**      **Constraints**                                                 **Description**
  id            uuid          PK                                                              Message primary key

  case_id       uuid          FK cases.id, NOT NULL                                           Parent case

  sender_type   text          NOT NULL, CHECK IN ('customer','ai','agent','system')   Sender type

  sender_id     uuid          FK users.id, NULLABLE                                           Null for customer/AI messages

  content       text          NOT NULL                                                        Message body

  metadata      jsonb         NULLABLE                                                        Optional tags/event type

  created_at    timestamptz   DEFAULT now()                                                   Send timestamp

**refund_requests**

  **Column**   **Type**        **Constraints**                                             **Description**
  id           uuid            PK                                                          Primary key

  case_id      uuid            FK cases.id, NOT NULL                                       Parent case

  order_id     text            NOT NULL                                                    Order reference

  amount       numeric(10,2)   NOT NULL                                                    Refund amount in THB

  reason       text            NOT NULL                                                    Refund reason from resolution plan

  status       text            NOT NULL, CHECK IN ('pending','processed','failed')   Status

  created_at   timestamptz     DEFAULT now()                                               Creation timestamp

**return_requests**

  **Column**      **Type**      **Constraints**                                              **Description**
  id              uuid          PK                                                           Primary key

  case_id         uuid          FK cases.id, NOT NULL                                        Parent case

  order_id        text          NOT NULL                                                     Order reference

  item_ids        text\[\]      NOT NULL                                                     Array of item IDs to return

  return_reason   text          NOT NULL                                                     Return reason

  status          text          NOT NULL, CHECK IN ('pending','approved','rejected')   Status

  created_at      timestamptz   DEFAULT now()                                                Creation timestamp

**case_reports**

  **Column**              **Type**      **Constraints**                 **Description**
  id                      uuid          PK                              Report primary key

  case_id                 uuid          FK cases.id, NOT NULL, UNIQUE   One report per case

  dispute_type            text          NOT NULL                        Copied from case

  customer_name           text          NOT NULL                        Copied from case

  customer_email          text          NOT NULL                        Copied from case

  order_id                text          NOT NULL                        Copied from case

  intent_classification   text          NOT NULL                        Intake Agent output

  data_sources_queried    text\[\]      NOT NULL                        Sources queried

  policies_applied        text\[\]      NOT NULL                        Policy slugs applied

  slas_applied            text\[\]      NOT NULL                        SLA references applied

  triage_decision         jsonb         NOT NULL                        Full triage output

  resolution_path         text          NOT NULL                        autonomous or escalation

  approval_outcome        text          NULLABLE                        approved or rejected

  rejection_reason        text          NULLABLE                        If rejected

  resolution_actions      jsonb         NULLABLE                        What was executed

  close_reason            text          NOT NULL                        How conversation ended

  generated_at            timestamptz   DEFAULT now()                   Report generation timestamp

**policies**

  **Column**   **Type**      **Constraints**                                                              **Description**
  id           uuid          PK                                                                           Policy primary key

  category     text          NOT NULL, CHECK IN ('store','payment','return','delivery','sla')   Category

  title        text          NOT NULL                                                                     Display title

  slug         text          NOT NULL, UNIQUE                                                             URL anchor --- permanent, never change

  content      text          NOT NULL                                                                     Full policy text

  created_at   timestamptz   DEFAULT now()                                                                Seeded timestamp

### 3.2 Simulated Source Tables
**sim_orders, sim_order_items, sim_transactions, sim_refund_records, sim_shipments, sim_tracking_events, sim_stock_records**

Schema unchanged from v1.0. These tables are seeded via db/seed/003_scenario_a.sql and 004_scenario_b.sql. See Architecture v1.1 §7.5 for db/ directory structure.

## 4. API Contracts
All endpoints served by FastAPI. Base URL: https://api.roarengine.railway.app (production) or http://localhost:8000 (local). Protected endpoints require Authorization: Bearer {jwt_token} header. JWT issued by POST /auth/login.

### 4.1 Authentication
**POST /auth/login**

| Request body:                                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"email\": \"agent@roar.app\",                                        |
|                                                                       |
| \"password\": \"securepassword\"                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| Response 200:                                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"access_token\": \"eyJ\...\",                                        |
|                                                                       |
| \"token_type\": \"bearer\",                                           |
|                                                                       |
| \"role\": \"approver\" \| \"escalation\",                             |
|                                                                       |
| \"user_id\": \"uuid\",                                                |
|                                                                       |
| \"full_name\": \"string\"                                             |
|                                                                       |
| }                                                                     |

### 4.2 Internal Data Source Endpoints (n8n WF2)
These endpoints are called by n8n WF2 (Data Retrieval Agent) instead of querying the database directly. Protected by X-Webhook-Secret header (same shared secret as other n8n webhooks).

  **Endpoint**                            **Method**   **Query Param**              **Returns**                                      **Used In**
  GET /internal/sources/orders            GET          order_id                     sim_orders record + sim_order_items\[\]          WF2 N3+N4 (both dispute types)

  GET /internal/sources/transactions      GET          order_id                     sim_transactions record                          WF2 N5 (refund only)

  GET /internal/sources/refunds           GET          order_id                     sim_refund_records\[\]                           WF2 N6 (refund only)

  GET /internal/sources/shipments         GET          order_id                     sim_shipments record + sim_tracking_events\[\]   WF2 N7+N8 (delivery only)

  GET /internal/sources/inventory         GET          item_ids (comma-separated)   sim_stock_records\[\]                            WF2 N9 (delivery only)

  GET /internal/sources/duplicate-check   GET          order_id                     { has_duplicate: bool, case_id? }                WF2/WF3 duplicate rule

### 4.3 Cases
**POST /cases**

| Request: { order_id, dispute_type, customer_name, customer_email, intake_message }    |
|                                                                                       |
| Response 201: { id, reference_number, status: 'pending_triage', created_at }        |
|                                                                                       |
| Response 409: { detail: 'An open case already exists for this order.' } (duplicate) |

**GET /cases/:id**

| Response 200: full case object including all agent outputs                                          |
|                                                                                                     |
| Auth: Public for status-only fields (id, reference_number, status). Full object requires agent JWT. |

**PATCH /cases/:id**

| Request: any subset of mutable fields                                 |
|                                                                       |
| Response 200: updated case object                                     |
|                                                                       |
| Validates status transitions --- invalid transition returns HTTP 422  |

**POST /cases/:id/approve**

| Request: {} (approver_id from JWT)                                    |
|                                                                       |
| Response 200: { status: 'approved_executing', message: '\...' }   |
|                                                                       |
| Response 409: case not in awaiting_approval                           |
|                                                                       |
| Response 403: role != approver                                        |

**POST /cases/:id/reject**

| Request: { reason: string (min 50 chars), policy_refs?: string\[\] }  |
|                                                                       |
| Response 200: { status: 'rejected_human_required' }                 |
|                                                                       |
| Response 422: reason under 50 chars or invalid policy slug            |

**GET /cases (dashboard list)**

| Query: status, search, dispute_type, limit, offset                    |
|                                                                       |
| Response 200: { cases: \[\...\], total: number }                      |

### 4.4 Chat
**POST /cases/:id/messages**

| Request: { content: string, sender_type: 'customer' \| 'agent' }  |
|                                                                       |
| Response 201: message object                                          |
|                                                                       |
| Note: append-only --- no PATCH or DELETE on messages                  |

**GET /cases/:id/messages**

| Response 200: { messages: \[\...\] }                                  |
|                                                                       |
| Used by frontend polling (every 4s) and n8n WF1/WF6                   |

**POST /cases/:id/close**

| Request: { closed_by: 'customer'\|'agent'\|'timeout', close_reason: 'resolved'\|'unresponsive'\|'duplicate'\|null } |
|                                                                                                                                 |
| Response 200: triggers WF6 via POST /webhooks/conversation-closed                                                               |
|                                                                                                                                 |
| Validates: agent must provide close_reason. Customer close_reason is null.                                                      |

### 4.5 Resolution Records (Refund/Return)
**POST /cases/:id/claim**

| Auth | Request | Response |
| --- | --- | --- |
| escalation JWT | none | 200: claimed (idempotent if already owned), 409: already claimed by another agent |

**GET /cases/:id/refund_requests**

| Auth | Response |
| --- | --- |
| approver/escalation JWT | { refund_requests: [ ... ] } (escalation agents only see records for their assigned cases) |

**GET /cases/:id/return_requests**

| Auth | Response |
| --- | --- |
| approver/escalation JWT | { return_requests: [ ... ] } (escalation agents only see records for their assigned cases) |

**POST /refund_requests**

| Auth | Request | Response |
| --- | --- | --- |
| agent JWT (WF5-safe) | { case_id, order_id, amount, reason, status? } | 201: refund_request created + persisted chat notification |

**POST /return_requests**

| Auth | Request | Response |
| --- | --- | --- |
| agent JWT (WF5-safe) | { case_id, order_id, item_ids[], return_reason, status? } | 201: return_request created + persisted chat notification |

**POST /cases/:id/deny-refund**

| Auth | Request | Response |
| --- | --- | --- |
| escalation JWT | { reason, policy_slug? } | 200: persisted agent chat message (no refund_request record created) |

**POST /cases/:id/mark-duplicate-refund**

| Auth | Request | Response |
| --- | --- | --- |
| escalation JWT | none | 200: persisted chat message (no refund_request record created) |

**PATCH /return_requests/:id**

| Auth | Request | Response |
| --- | --- | --- |
| escalation JWT | { status: 'approved'|'rejected', reason? } | 200: return_request status updated + persisted chat notification |

### 4.6 Case Reports
| GET /cases/:id/report → full case_report object \| 404 if not yet generated       |
|                                                                                   |
| POST /cases/:id/report → write report (n8n WF6 only, protected by webhook secret) |

### 4.7 Webhooks (n8n triggers --- FastAPI → n8n)
  **Webhook**                          **Trigger**                                             **n8n Workflow**
  POST /webhooks/case-created          New case + each customer message while pending_triage   WF1

  POST /webhooks/bundle-ready          WF1 confirms intent                                     WF2

  POST /webhooks/triage-complete       WF2 bundle assembled                                    WF3

  POST /webhooks/triage-escalation     WF3 → escalation path                                   WF4

  POST /webhooks/resolution-plan       WF3 → autonomous path                                   WF5 phase 1

  POST /webhooks/approved              Approver approves                                       WF5 phase 2

  POST /webhooks/conversation-closed   Conversation close event                                WF6

**5. n8n Workflow Designs**

| Full node-by-node workflow specs, tool definitions, and prompt library: see n8n Spec v2.0.                                                  |
|                                                                                                                                             |
| Key change from v1.0: WF2 Data Retrieval Agent now calls FastAPI /internal/sources/\* endpoints instead of querying Supabase REST directly. |
|                                                                                                                                             |
| All other workflow logic unchanged from n8n Spec v2.0.                                                                                      |

### 5.1 WF2 Data Retrieval --- Updated Node Map
Only WF2 changes from n8n Spec v2.0. Nodes N3--N9 now call FastAPI internal endpoints instead of Supabase REST. All other nodes unchanged.

  **\#**   **Node Name**               **Node Type**   **Configuration**                                                                                                                                  **Output**
  N1       Webhook Trigger             Webhook         Path: bundle-ready. Method: POST. Auth: ROAR FastAPI.                                                                                              { case_id, dispute_type, order_id }

  N2       Route by Dispute Type       Switch          Route on dispute_type. Branch A: refund. Branch B: delivery.                                                                                       Two branches

  N3       Query OMS                   HTTP Request    \[Both\] GET {{FASTAPI_BASE_URL}}/internal/sources/orders?order_id={{order_id}}. Header: X-Webhook-Secret.                                         { order, order_items\[\] }

  N4       Query Payment --- Txn       HTTP Request    \[A\] GET {{FASTAPI_BASE_URL}}/internal/sources/transactions?order_id={{order_id}}. Header: X-Webhook-Secret.                                      transaction record

  N5       Query Payment --- Refunds   HTTP Request    \[A\] GET {{FASTAPI_BASE_URL}}/internal/sources/refunds?order_id={{order_id}}. Header: X-Webhook-Secret.                                           refund_records\[\]

  N6       Query Logistics             HTTP Request    \[B\] GET {{FASTAPI_BASE_URL}}/internal/sources/shipments?order_id={{order_id}}. Header: X-Webhook-Secret.                                         { shipment, tracking_events\[\] }

  N7       Query Inventory             HTTP Request    \[B\] GET {{FASTAPI_BASE_URL}}/internal/sources/inventory?item_ids={{csv}}. Header: X-Webhook-Secret.                                              stock_records\[\]

  N8       Assemble Bundle             Code (JS)       Merge all outputs: { order, order_items, transaction?, refund_records?, shipment?, tracking_events?, stock_records?, queried_at, dispute_type }.   information_bundle JSON

  N9       Update Case --- Bundle      HTTP Request    PATCH {{FASTAPI_BASE_URL}}/cases/{{case_id}}. Body: { information_bundle }. Auth: ROAR FastAPI Bearer.                                             Updated case

  N10      Trigger Triage              HTTP Request    POST {{FASTAPI_BASE_URL}}/webhooks/triage-complete. Body: { case_id, dispute_type }.                                                               WF3 triggered

| WF2 is now 10 nodes (reduced from 12) because OMS order + items are returned in a single /internal/sources/orders response, and logistics shipment + events in a single /internal/sources/shipments response. |
|                                                                                                                                                                                                               |
| The FastAPI internal endpoints handle the multi-table joins internally --- WF2 nodes are simpler.                                                                                                             |

## 6. AI Agent Prompt Templates
All six system prompts unchanged from n8n Spec v2.0 §12. See n8n Spec v2.0 §12.1--12.6 for copy-paste versions.

## 7. Frontend Component Inventory
All components unchanged from PBD v1.0. See PBD v1.0 §7 for the complete component inventory. No component changes result from the database stack change.

## 8. Page Map and Route Definitions
All routes unchanged from PBD v1.0. See PBD v1.0 §8. Auth mechanism changed: Supabase Auth session replaced with FastAPI JWT stored in httpOnly cookie or localStorage. Route protection via Next.js middleware that validates JWT and checks role claim.

## 9. Repository Structure
### 9.1 Root
| roar-engine/                                                          |
|                                                                       |
| ├── web/ \# Next.js 14 frontend                                       |
|                                                                       |
| ├── api/ \# FastAPI Python backend                                    |
|                                                                       |
| ├── n8n/ \# n8n workflow JSON exports                                 |
|                                                                       |
| ├── db/ \# DB migrations and seed data (replaces supabase/ from v1.0) |
|                                                                       |
| └── README.md                                                         |

### 9.2 Backend (api/) --- Updated
| api/                                                                  |
|                                                                       |
| ├── main.py                                                           |
|                                                                       |
| ├── Dockerfile                                                        |
|                                                                       |
| ├── requirements.txt                                                  |
|                                                                       |
| ├── routers/                                                          |
|                                                                       |
| │ ├── auth.py \# POST /auth/login, /auth/refresh ← NEW                |
|                                                                       |
| │ ├── cases.py                                                        |
|                                                                       |
| │ ├── messages.py                                                     |
|                                                                       |
| │ ├── reports.py                                                      |
|                                                                       |
| │ ├── webhooks.py                                                     |
|                                                                       |
| │ ├── policies.py                                                     |
|                                                                       |
| │ └── internal.py \# GET /internal/sources/\* ← NEW                   |
|                                                                       |
| ├── models/                                                           |
|                                                                       |
| │ ├── case.py                                                         |
|                                                                       |
| │ ├── message.py                                                      |
|                                                                       |
| │ ├── report.py                                                       |
|                                                                       |
| │ ├── policy.py                                                       |
|                                                                       |
| │ └── user.py                                                         |
|                                                                       |
| ├── db/                                                               |
|                                                                       |
| │ ├── database.py \# SQLAlchemy async engine + session ← NEW          |
|                                                                       |
| │ └── models.py \# SQLAlchemy ORM models ← NEW                        |
|                                                                       |
| ├── services/                                                         |
|                                                                       |
| │ ├── cases.py                                                        |
|                                                                       |
| │ └── n8n.py                                                          |
|                                                                       |
| └── auth/                                                             |
|                                                                       |
| ├── jwt.py \# python-jose JWT create/verify ← NEW                     |
|                                                                       |
| ├── middleware.py \# JWT validation FastAPI dependency ← UPDATED      |
|                                                                       |
| └── rbac.py                                                           |

### 9.3 Database (db/) --- Replaces supabase/
| db/                                                                   |
|                                                                       |
| ├── migrations/                                                       |
|                                                                       |
| │ ├── 001_core_tables.sql                                             |
|                                                                       |
| │ ├── 002_resolution_records.sql                                      |
|                                                                       |
| │ ├── 003_reports_policies.sql                                        |
|                                                                       |
| │ ├── 004_simulated_sources.sql                                       |
|                                                                       |
| │ └── 005_indexes.sql                                                 |
|                                                                       |
| └── seed/                                                             |
|                                                                       |
| ├── 001_policies.sql \# 25 policy records (from Policies v1.0)        |
|                                                                       |
| ├── 002_users.sql                                                     |
|                                                                       |
| ├── 003_scenario_a.sql \# Refund demo scenario                        |
|                                                                       |
| └── 004_scenario_b.sql \# Delivery demo scenario                      |

## 10. Demo Data Seed Plan
Two demo scenarios unchanged from PBD v1.0 §10. Seed scripts now in db/seed/ instead of supabase/seed/. Run order: 001 (policies) → 002 (users) → 003 (scenario A) → 004 (scenario B).

| Run migrations before seed scripts: psql \$DATABASE_URL \< db/migrations/001_core_tables.sql (etc.) |
|                                                                                                     |
| Then: psql \$DATABASE_URL \< db/seed/001_policies.sql (etc.)                                        |
|                                                                                                     |
| Railway provides the DATABASE_URL in the project environment variables automatically.               |

**11. 48-Hour Build Plan**

  **Phase**                        **Hours**   **Owner**      **Deliverables**
  Phase 0 --- Setup                0--2h       All            Repo created, Railway project provisioned (FastAPI + PostgreSQL + n8n), env vars configured

  Phase 1 --- Schema + Seed        2--5h       Data           All DB migrations run, simulated source tables seeded, policy records seeded, demo scenarios A and B seeded, demo users created

  Phase 2 --- FastAPI Core         2--8h       Backend        Auth endpoints (login/JWT), all /cases endpoints, /messages, /webhooks, /reports, /internal/sources/\*. JWT middleware. Role enforcement.

  Phase 3 --- n8n Workflows        4--14h      AI / Backend   All 6 workflows built and tested. Agent prompts tuned. WF2 uses /internal/sources/\* endpoints. E2E flow validated with seeded data.

  Phase 4 --- Frontend Core        4--18h      Frontend       App shell, login + JWT role routing, customer chat, approver dashboard + record view, escalation dashboard + record view

  Phase 5 --- Integration          18--30h     All            Frontend wired to FastAPI. n8n workflows triggered from UI. Chat polling working. Approve/reject flow working. Live chat handoff working.

  Phase 6 --- Polish + Demo Prep   30--42h     All            Dark mode, /policies page, case status tracker, empty states, loading states, error handling, ConversationClosePanel

  Phase 7 --- Rehearsal + Buffer   42--48h     All            Full demo run-throughs for both scenarios. Bug fixes. Pitch alignment.

*--- End of Document ---*
