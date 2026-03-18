**Changelog**

  **Version**   **Date**     **Change**                                                                                                          **Section(s)**
  v1.0          March 2026   Initial release                                                                                                     All

  v1.1          March 2026   Corrected §9 to 6 workflows. Added §9.1 architecture classification. Added §15 Business Rules Reference.            §9, §9.1, §15

  v1.2          March 2026   Retail context updated: removed convenience store framing, replaced with Thai retail e-commerce / online delivery   §2, §14

  v1.2          March 2026   Stack updated: Supabase replaced with PostgreSQL + Railway + FastAPI JWT                                            §1, §12

  v1.2          March 2026   New companion docs added: Policies v1.0, Resolution Paths v1.0                                                      §1, §15

  v1.2          March 2026   Live chat updated: polling spec added, both-sides-terminate rule, chat lock behavior                                §7 F5

## 1. Document Overview
  **Field**             **Value**
  Product Name          ROAR Engine --- Retail Operations and Resolution Engine

  Document Type         Product Requirements Document (PRD)

  Version               1.2

  Date                  March 2026

  Context               Gosoft Retail Hackathon 2026

  Target Audience       Development team, hackathon judges, stakeholders

  Status                Approved for development

  Companion Docs        PBD v1.0, Architecture v1.1, n8n Spec v2.0, Design Guidelines v1.0, BRL v1.1, Policies v1.0, Resolution Paths v1.0

## 2. Executive Summary
ROAR Engine is a SaaS AI orchestration platform that integrates with existing retail backend systems to autonomously triage, investigate, and resolve customer disputes. It is purpose-built to reduce the volume of repetitive, time-consuming tasks performed by customer care agents by delegating the intake-to-resolution pipeline to a multi-agent AI system.

The system targets two dispute categories in its MVP: refund disputes and delivery disputes. ROAR Engine is designed for Thai retail enterprises operating online ordering and delivery channels --- merchants with e-commerce platforms, online grocery services, and food or product delivery operations where customers place orders digitally and expect delivery to a specified address.

The solution is positioned as an augmentation layer on top of existing retail backend infrastructure, consuming transactional data from OMS, payment, logistics, and inventory systems to enable AI-driven dispute resolution without replacing the systems that generate that data.

  Core value proposition: ROAR Engine reduces 'problem introduction' and 'resolution triage' --- the two most repetitive and resource-intensive steps in customer care operations --- through AI, allowing agents to focus only on cases requiring genuine human judgment.


## 3. Problem Statement
### 3.1 Current State
In retail customer care operations, the standard dispute resolution workflow requires agents to manually perform all of the following for each incoming case:

-   Collect initial complaint context from the customer through back-and-forth conversation

-   Pull and cross-reference data from multiple disconnected systems (OMS, payment gateway, logistics, inventory)

-   Apply store policies, SLA rules, and payment policies to evaluate the complaint

-   Determine whether the case qualifies for resolution or escalation

-   Draft a resolution plan and route it for approval

-   Execute the resolution or hand off to a senior agent

-   Document the outcome for audit purposes

### 3.2 Key Pain Points
  **Pain Point**                         **Impact**                                         **Frequency**
  Fragmented data across systems         Agents switch between 4+ tools per case            Every case

  Manual triage and policy application   Inconsistent decisions, agent fatigue              Every case

  Slow intake and evidence gathering     Average handle time inflated                       Every case

  No standardized escalation context     Escalation agents lack structured case summaries   Escalated cases

  No audit trail automation              Case documentation done manually post-resolution   Every case

### 3.3 Opportunity
A significant portion of refund and delivery disputes follow predictable, policy-compliant patterns that do not require human judgment. ROAR Engine identifies these cases automatically and resolves them autonomously --- reducing agent workload, improving resolution speed, and ensuring consistent policy application across all cases.

## 4. Goals and Success Metrics
### 4.1 Primary Goals
1.  Automate dispute intake and evidence gathering, eliminating manual data pulling for agents

2.  Apply rule-based triage consistently across all incoming disputes

3.  Resolve qualifying disputes autonomously with agent approval gating

4.  Provide human agents with structured, AI-generated context for escalated cases

5.  Generate complete audit records for every case without manual documentation

### 4.2 Success Metrics (MVP)
  **Metric**                     **Target**                   **Measurement**
  Dispute intake-to-case time    \< 2 minutes                 Timestamp: form submit → case created

  Triage accuracy (rule-based)   \> 95%                       Manual review of routed cases post-demo

  Autonomous resolution rate     \> 60% of qualifying cases   Cases approved and executed vs. escalated

  Agent time-to-review           \< 30 seconds per case       Timestamp: case assigned → approval action

  Case report generation time    \< 10 seconds post-close     Timestamp: conversation close → report created

  System uptime during demo      100%                         Monitored during hackathon presentation

## 5. Users and Roles
ROAR Engine is a single application with role-based routing. All users authenticate through the same login --- their role determines which dashboard and features they access.

  **Role**                **Description**                                                                                           **Primary Access**
  Customer                End user submitting a refund or delivery dispute via the public chat interface                            Chat UI, case status tracker

  Approver (Care Agent)   Reviews AI-generated resolution plans. Approves or rejects. If rejected, joins live chat with customer.   Approver dashboard, record view, live chat

  Escalation Agent        Handles cases routed for human intervention. Receives AI case summary and joins live chat.                Escalation dashboard, record view, live chat

## 6. Scope
### 6.1 In Scope --- MVP
-   Customer dispute intake via hybrid form + chat UI

-   AI chatbot with rule-based follow-up questions (max 3) and intent detection

-   Automated case creation upon dispute validation

-   AI data pull from simulated OMS, Payment, Logistics, and Inventory sources

-   Rule-based triage engine with 9 triage rules across 2 dispute types (see BRL v1.1 §5)

-   34 resolution scenarios mapped (see Resolution Paths v1.0)

-   Autonomous resolution path: resolution plan generation, approval queue, execution

-   Escalation path: AI case summary, human agent joins live chat via polling

-   Rejection path: approver rejection with policy citation (min 50 chars), approver joins live chat

-   Both sides (customer and agent) can terminate conversation. Agent requires valid reason.

-   Customer chat locks on closure with 'Conversation closed' system message

-   Refund and return request records created on autonomous resolution

-   Conversation close triggers: customer mark done, inactivity 15 min, agent close (3 valid reasons)

-   AI-generated case report on conversation close --- all paths

-   Customer notification at every major status change --- never left without status

-   Approver dashboard (card grid) with record view and approve/reject actions

-   Escalation dashboard (card grid) with record view and live chat access

-   Static /policies page with 25 seeded policy records and deep-linkable anchors

-   Case status tracker (customer-facing)

-   Search and filter on both dashboards

-   Dark mode support

-   Role-based routing from single login

### 6.2 Out of Scope --- MVP
-   Superadmin policies management UI

-   Live integration with actual retail POS or payment systems

-   Multi-language support

-   Analytics or reporting dashboard

-   Agent performance metrics

-   Customer notification via SMS or email (in-app only for MVP)

-   Settings screen

-   Native mobile application

## 7. Functional Requirements
### 7.1 High-Level Feature Areas
  **Feature Area**             **Description**
  F1 --- Dispute Intake        Hybrid form + chat interface for customers to submit and contextualize disputes

  F2 --- AI Orchestration      Six-agent supervised pipeline: data pull, triage, resolution, summarization, reporting

  F3 --- Approval Workflow     Approver queue and record view with approve/reject actions and policy citation

  F4 --- Escalation Workflow   Escalation queue and record view with live chat handoff and AI case summary

  F5 --- Live Chat System      Shared chat thread via polling. AI-to-human handoff. Both sides can terminate.

  F6 --- Case Management       Case lifecycle from creation to closure and report generation

  F7 --- Policies Reference    Static /policies page with 25 deep-linkable policy records

  F8 --- Case Status Tracker   Customer-facing real-time case status view

### 7.2 Detailed Requirements
**F1 --- Dispute Intake**

-   Structured intake form: order_id, dispute_type (refund/delivery), customer_name, customer_email, intake_message

-   AI chatbot follow-up: max 3 rule-based questions based on dispute type

-   Intent detection: valid_dispute or insufficient_context classification

-   Customer receives case reference and access to status tracker on validation

**F2 --- AI Orchestration**

-   Six agents in supervised pipeline via n8n (see §9 and n8n Spec v2.0)

-   Data Retrieval: OMS + Payment for refund; OMS + Logistics + Inventory for delivery

-   Triage: 5 refund rules + 4 delivery rules --- ALL must pass for autonomous (see BRL v1.1 §5)

-   Resolution Agent: generates plan for approval, executes after approval

-   Summarization Agent: generates case summary for escalation team

-   Case Report Agent: compiles audit record on conversation close --- all paths

**F3 --- Approval Workflow**

-   Dashboard: all pending plans as cards, sorted oldest first

-   Approve action triggers Resolution Agent execution via n8n

-   Reject requires min 50-char reason with optional policy citations

-   Post-rejection: approver mandatory redirect to live chat with customer

-   Approver locked in chat until valid closure condition met

**F4 --- Escalation Workflow**

-   Dashboard: all escalated cases as cards

-   Record view: AI case summary + info bundle + Join Chat button

-   Escalation agent joins same customer chat thread

-   Same closure rules as post-rejection path

**F5 --- Live Chat System**

-   Hybrid: intake form first, then traditional chat bubbles

-   Three participant states: AI active, human active, closed

-   AI-to-human handoff: seamless, irreversible, same thread

-   Live updates via polling: frontend polls GET /cases/:id/messages every 4 seconds

-   Both customer and agent can terminate conversation

-   Agent must select valid reason to close (Resolved / Unresponsive / Duplicate)

-   On closure: chat input disabled, 'Conversation closed' system message posted, chat locks

-   Chat history is append-only --- no edits or deletions

**F6 --- Case Management**

-   7 case statuses with defined valid transitions (see BRL v1.1 §3)

-   Refund and return request records created on autonomous resolution

-   Case report generated on every conversation close regardless of path

**F7 --- Policies Reference**

-   25 policy records across 5 categories (Store, Payment, Return, Delivery, SLA)

-   Each policy has a unique slug --- deep-linkable as /policies#\[slug\]

-   Not editable in MVP. Seeded via seed/001_policies.sql

**F8 --- Case Status Tracker**

-   Status timeline: current state, last updated, next expected action

-   Updated via polling --- same 4-second interval as chat

## 8. Non-Functional Requirements
  **Requirement**       **Specification**
  Performance           AI pipeline intake-to-triage decision in \< 30 seconds end-to-end

  Availability          System stable for full duration of hackathon demo

  Scalability           Architecture supports horizontal scaling post-MVP

  Security              RBAC at API and UI level. FastAPI JWT middleware for all protected routes.

  Data integrity        All simulated data sources pre-seeded with demo-ready records

  Dark mode             Full dark mode via CSS token system

  Responsiveness        Desktop-optimized. Mobile-responsive is nice-to-have.

  AI reliability        GPT-4o-mini outputs structured JSON. Fallback handling on all agents.

## 9. AI Agent Specifications
ROAR Engine employs six specialized AI agents in a supervised agentic pipeline. All orchestrated via n8n. LLM: GPT-4o-mini (OpenAI API).

| 6 workflows, one per agent. Summarization Agent (Agent 5) is standalone WF4 (corrected from v1.0 which stated 5 workflows). |
|                                                                                                                             |
| See n8n Spec v2.0 for full workflow node specs, tool definitions, and prompt library.                                       |

  **Agent**                  **Responsibility**                                                  **Trigger**                    **Output**
  1\. Intake Agent           Chatbot conversation. Follow-up questions. Intent classification.   Customer message               Validated dispute context JSON

  2\. Data Retrieval Agent   Queries data sources. Assembles info bundle. No LLM call.           Intent confirmed               Information bundle JSON

  3\. Triage Agent           Applies rule-based logic. Determines resolution path.               Bundle ready                   Routing decision JSON

  4\. Resolution Agent       Generates plan (phase 1). Executes after approval (phase 2).        Triage autonomous + approval   Resolution plan + execution

  5\. Summarization Agent    Generates case summary for escalation team.                         Triage → escalation            Case summary JSON

  6\. Case Report Agent      Compiles full audit record on close.                                Conversation close             Case report record

### 9.1 Architecture Classification
  **Agent**              **Pattern**                   **Agentic?**               **Human Gate**
  Intake Agent           Conversational AI Agent       Yes --- tool-calling       No

  Data Retrieval Agent   Deterministic Pipeline        No --- HTTP only           No

  Triage Agent           Structured Reasoning Agent    Partially --- rule-bound   No

  Resolution Agent       Supervised Execution Agent    Yes --- tool-calling       YES --- approval required

  Summarization Agent    Structured Generation Agent   Yes --- tool-calling       No

  Case Report Agent      Structured Generation Agent   Yes --- tool-calling       No

  ROAR Engine implements a supervised agentic pipeline --- six specialized AI agents with tool-calling capabilities, operating within a deterministic n8n orchestration framework. Human-in-the-loop approval is required before any autonomous resolution executes. This is the production-grade pattern for agentic AI in enterprise operations.


## 10. Data Sources
All data sources simulated via PostgreSQL on Railway. Exposed as FastAPI internal endpoints consumed by n8n WF2.

  **Data Source**    **Simulated Tables**                 **Used For**                               **Dispute Type**
  OMS                orders, order_items, order_status    Order verification, fulfillment status     Refund + Delivery

  Payment Gateway    transactions, refund_records         Payment confirmation, refund status        Refund

  Logistics          shipments, tracking_events           Delivery status, delay classification      Delivery

  Inventory          stock_records, warehouse_locations   Item availability, shipment confirmation   Delivery

## 11. Screens and UX
  **Screen**             **Route**                  **Access**     **Key Components**
  Customer Chat          / chat                     Public         IntakeForm, ChatWindow, CaseStatusTracker, ParticipantBanner

  Case Status            /case/:id                  Public (ref)   Status timeline, last updated

  Login                  /login                     All            FastAPI JWT auth, role-based redirect

  Approver Dashboard     /approver                  approver       DashboardGrid, SearchFilterBar, NotificationBadge

  Approver Record        /approver/:caseId          approver       InfoBundlePanel, ResolutionPlanPanel, ApproveRejectBar

  Approver Live Chat     /approver/:caseId/chat     approver       ChatWindow, ParticipantBanner, ConversationClosePanel

  Escalation Dashboard   /escalation                escalation     DashboardGrid, SearchFilterBar, NotificationBadge

  Escalation Record      /escalation/:caseId        escalation     EscalationSummaryPanel, InfoBundlePanel, Join Chat

  Escalation Live Chat   /escalation/:caseId/chat   escalation     ChatWindow, ParticipantBanner, ConversationClosePanel

  Policies Page          /policies                  All auth       25 policy records, deep-linkable anchors, search

## 12. Technology Stack
  **Layer**          **Technology**                        **Purpose**
  Frontend           Next.js 14 (App Router)               Web application, routing, SSR

  Chat UI            Vercel AI SDK                         Streaming chatbot UI, AI state management

  Styling            Tailwind CSS                          Design token integration

  AI Orchestration   n8n + LangChain                       Six-workflow sequencing, agent tool-calling

  LLM                GPT-4o-mini (OpenAI API)              All six AI agents

  Backend API        FastAPI (Python)                      Case management, CRUD, JWT auth, n8n webhooks

  Database           PostgreSQL on Railway                 All application data + simulated sources

  Authentication     FastAPI JWT (python-jose + passlib)   Role-based session management --- no external auth service

  ORM                SQLAlchemy + asyncpg                  FastAPI ↔ PostgreSQL

  Frontend Hosting   Vercel                                Next.js deployment

  Backend Hosting    Railway                               FastAPI + PostgreSQL + n8n

## 13. Constraints and Assumptions
### 13.1 Constraints
-   Build window is 48 hours --- all MVP scope achievable by a team of 5

-   No access to live retail data --- all data sources are simulated

-   GPT-4o-mini has token and rate limits --- prompts must be concise, outputs structured

-   n8n must be deployed and stable before integration begins

-   Policy content must be seeded (seed/001_policies.sql) before demo

### 13.2 Assumptions
-   All five team members available for the full 48-hour window

-   Railway PostgreSQL free tier sufficient for demo data volume

-   GPT-4o-mini produces reliable structured JSON when prompted correctly

-   Judges will evaluate via live demo of both dispute scenarios (refund + delivery)

-   Gosoft judges recognize ROAR as an AI augmentation layer for retail e-commerce operations

## 14. Strategic Positioning
ROAR Engine is positioned as an AI augmentation layer designed to sit on top of existing retail operations infrastructure --- not replace it.

| Target context: Thai retail enterprises with online ordering and delivery channels.                                                                      |
|                                                                                                                                                          |
| This includes e-commerce platforms, food delivery services, online grocery, and any retailer where customers place digital orders and expect delivery.   |
|                                                                                                                                                          |
| ROAR Engine is not designed for walk-in convenience store transactions --- the dispute types (refund + delivery) are inherently online retail scenarios. |
|                                                                                                                                                          |
| In the Gosoft context: the relevant channel is 7-Delivery (CP ALL's online delivery arm) --- not in-store 7-Eleven POS transactions.                    |

  **Positioning Axis**     **ROAR Engine**
  Primary value            Reduces agent workload on routine disputes in online retail operations

  Integration model        Consumes existing retail backend data (OMS, payment, logistics, inventory)

  Differentiation          Supervised agentic pipeline with rule-based triage --- reliable, auditable, explainable

  Target buyer             Thai retail enterprises with online ordering + delivery and fragmented dispute triage

  Hackathon angle          Direct augmentation of Gosoft's 7-Delivery infrastructure and contact center operations

## 15. Business Rules Reference
Canonical system constants and triage rule summary. Full definitions in Business Rules and Logic Specification v1.1.

### 15.1 System Constants
  **Constant**                 **Value**    **Description**
  REFUND_AUTO_THRESHOLD        ฿500         Maximum refund amount eligible for autonomous resolution

  RETURN_WINDOW_DAYS           7 days       Days from delivery date within which a refund dispute is eligible

  DELIVERY_SLA_BREACH_DAYS     3 days       Days past EDD before delivery dispute is valid

  INACTIVITY_TIMEOUT_MINUTES   15 minutes   Inactivity period before conversation auto-closes

  CHAT_POLL_INTERVAL_MS        4000ms       Frontend polls /messages every 4 seconds

  MAX_INTAKE_QUESTIONS         3            Maximum follow-up questions by Intake Agent

  MIN_REJECTION_REASON_CHARS   50           Minimum characters in rejection reason

### 15.2 Triage Rule Summary
**Refund --- all 5 must pass:**

-   BR-REF-001: Payment confirmed

-   BR-REF-002: Order fulfilled or returned

-   BR-REF-003: Amount ≤ ฿500

-   BR-REF-004: No prior refund on order

-   BR-REF-005: Within 7-day return window

**Delivery --- all 4 must pass:**

-   BR-DEL-001: Shipment status = delayed (not lost/failed)

-   BR-DEL-002: Item confirmed shipped

-   BR-DEL-003: No duplicate complaint

-   BR-DEL-004: Current date \> EDD + 3 days

  Full rule definitions: BRL v1.1 §5. All 12 escalation triggers: BRL v1.1 §5.3. All 34 resolution scenarios: Resolution Paths v1.0. All 25 policy records: Policies v1.0.


**Appendix A --- Policy Categories**

25 policy records seeded across 5 categories. See Policies v1.0 for full content.

-   Store (POL-001 to POL-005) --- Return eligibility, exclusions, cancellation, damaged goods, exchange

-   Payment (POL-006 to POL-010) --- Refund timelines, methods, partial refund, chargeback, failed transaction

-   Return (POL-011 to POL-015) --- 7-day window, item condition, proof of purchase, process steps, refund vs replacement

-   Delivery (POL-016 to POL-020) --- Standard SLA, express SLA, failed attempt, lost parcel, carrier responsibility

-   SLA (POL-021 to POL-025) --- Response time, refund resolution, delivery resolution, escalation response, autonomous execution

*--- End of Document ---*
