# ROAR Engine — System Architecture

**Changelog**

  **Version**   **Date**     **Change**                                                                                        **Section(s)**
  v1.0          March 2026   Initial release                                                                                   All

  v1.2          April 2026   Review and version alignment completed                                                            All

  v1.1          March 2026   Data layer: Supabase replaced with PostgreSQL + Railway + FastAPI JWT                             §2 Layer 4, §3, §5, §6, §7, §8

  v1.1          March 2026   n8n WF2 updated: no longer queries DB directly --- calls FastAPI /internal/sources/\* endpoints   §4, §7.4

  v1.1          March 2026   Auth updated: Supabase Auth replaced with FastAPI JWT middleware (python-jose + passlib)          §2 Layer 1 + 2, §5

  v1.1          March 2026   Retail context: target clarified as Thai retail e-commerce / online delivery                      §9

  v1.1          March 2026   New companion docs referenced: Policies v1.0, Resolution Paths v1.0, BRL v1.1                     §1

## 1. Architecture Overview
ROAR Engine is composed of four primary layers: a Next.js frontend on Vercel, a FastAPI backend on Railway, an n8n orchestration layer managing all AI agent workflows, and a PostgreSQL database on Railway. All layers communicate via REST APIs and HTTP webhooks.

| Design principle: The frontend never calls n8n or the LLM directly.                                |
|                                                                                                    |
| All AI orchestration is triggered exclusively through FastAPI webhook endpoints.                   |
|                                                                                                    |
| n8n no longer queries the database directly --- all DB access goes through FastAPI REST endpoints. |
|                                                                                                    |
| This keeps the AI pipeline fully decoupled from both the UI and the database.                      |

## 2. System Layers
| **Layer 1 --- Frontend**                                                                                 |
|                                                                                                          |
| Next.js 14 · Vercel AI SDK · Tailwind CSS · Hosted on Vercel                                             |
| **Framework:** Next.js 14 (App Router) with server and client components                                 |
| **Chat:** Vercel AI SDK for streaming chatbot UI and AI state management                                 |
| **Live chat:** Frontend polls GET /cases/:id/messages every 4 seconds (CHAT_POLL_INTERVAL_MS)            |
| **Auth:** JWT stored in httpOnly cookie or localStorage. Role from JWT claims used for route protection. |
| **API calls:** All data fetched from FastAPI via REST. No direct DB access from frontend.                |
| **Hosting:** Vercel --- auto-deploy from main branch.                                                    |
| **Dark mode:** Class-based dark mode via ThemeProvider. Persisted to localStorage.                       |

| **Layer 2 --- Backend API**                                                                                                                                 |
|                                                                                                                                                             |
| FastAPI (Python) · SQLAlchemy + asyncpg · Railway                                                                                                           |
| **Framework:** FastAPI with async endpoints. Uvicorn ASGI server.                                                                                           |
| **Auth:** FastAPI JWT middleware (python-jose + passlib). Issues JWTs on login. Validates on every protected route. Role extracted from JWT payload claims. |
| **DB access:** SQLAlchemy async ORM + asyncpg driver. All DB reads and writes through FastAPI --- no direct DB access from n8n or frontend.                 |
| **Internal endpoints:** GET /internal/sources/orders, /transactions, /shipments, /inventory etc. consumed by n8n WF2 instead of direct DB queries.          |
| **Webhooks:** FastAPI exposes /webhooks/\* endpoints triggered by n8n on workflow completion.                                                               |
| **n8n triggers:** On case state changes, FastAPI sends HTTP POST to n8n webhook URLs.                                                                       |
| **Hosting:** Railway. Dockerfile provided. Auto-deploy from main branch.                                                                                    |

| **Layer 3 --- AI Orchestration**                                                                                                     |
|                                                                                                                                      |
| n8n · LangChain · GPT-4o-mini (OpenAI API) · Railway                                                                                 |
| **Platform:** n8n self-hosted on Railway. Six workflows covering all AI agent tasks.                                                 |
| **Agent framework:** LangChain within n8n for structured prompt construction and output parsing.                                     |
| **LLM:** GPT-4o-mini via OpenAI API. All agents use JSON output mode.                                                                |
| **Data access:** n8n calls FastAPI /internal/sources/\* endpoints --- never queries DB directly. All state updates via FastAPI REST. |
| **Trigger model:** All workflows triggered by HTTP webhooks from FastAPI --- never from frontend.                                    |
| **Routing:** n8n Switch and IF nodes handle conditional routing (autonomous vs escalation paths).                                    |
| **Retries:** n8n built-in retry logic. Max 3 retries with exponential backoff (5/15/30s).                                            |

| **Layer 4 --- Data Layer**                                                                                             |
|                                                                                                                        |
| PostgreSQL on Railway · FastAPI ORM · SQL migrations                                                                   |
| **Platform:** PostgreSQL database hosted on Railway. Persistent volume. Free tier sufficient for demo.                 |
| **ORM:** SQLAlchemy async with asyncpg driver. Managed entirely through FastAPI.                                       |
| **Auth:** No Supabase Auth. FastAPI handles login, issues JWTs, validates tokens. User roles stored in DB users table. |
| **Access pattern:** Only FastAPI reads from and writes to PostgreSQL. n8n and frontend have no direct DB connection.   |
| **Migrations:** SQL migration files in /db/migrations/. Run via alembic or raw psql on Railway before demo.            |
| **Seed data:** Pre-seeded demo scenarios (Scenario A: refund, Scenario B: delivery) + 25 policy records + demo users.  |

## 3. Inter-Service Communication Map
  **From**                     **To**                            **Protocol**        **When**                          **Data**
  Browser (customer)           Next.js frontend                  HTTPS               User loads /chat                  ---

  Next.js frontend             FastAPI                           REST (HTTPS)        All data operations               JSON payloads

  Next.js frontend             Vercel AI SDK endpoint            HTTP streaming      Chat messages                     Token stream

  Next.js frontend (polling)   FastAPI GET /cases/:id/messages   REST GET            Every 4 seconds while chat open   Messages array

  FastAPI                      PostgreSQL                        SQLAlchemy async    All DB reads/writes               SQL

  FastAPI                      n8n                               HTTP POST webhook   Case state transitions            { case_id, event_type }

  n8n                          FastAPI /internal/sources/\*      HTTP GET            WF2 data source queries           JSON

  n8n                          FastAPI GET/PATCH /cases/\*       REST                All workflow state reads/writes   JSON

  n8n                          OpenAI API                        HTTPS               All LLM agent calls               Chat completions

## 4. AI Agent Pipeline
  **Stage**   **Agent**                    **Input**                                 **Output**                                         **LLM Call**
  1           Intake Agent                 dispute_type, intake_message, order_id    intent classification, follow-up questions         Yes --- per chat turn

  2           Data Retrieval Agent         case_id, dispute_type, order_id           information_bundle (all source data)               No --- FastAPI /internal/sources calls

  3           Triage Agent                 information_bundle, policies, SLA rules   routing_decision, rules_evaluated, justification   Yes --- one call

  4a          Resolution Agent (plan)      information_bundle, triage_decision       resolution_plan (steps, type, amount)              Yes --- one call

  4b          Resolution Agent (execute)   resolution_plan (post-approval)           actions_taken, outcome                             Yes --- one call

  5           Summarization Agent          information_bundle, triage_decision       case_summary                                       Yes --- one call

  6           Case Report Agent            full case, chat transcript                case_report record                                 Yes --- one call

| WF2 Data Retrieval Agent change from v1.0: n8n now calls FastAPI /internal/sources/\* endpoints instead of querying Supabase REST directly. |
|                                                                                                                                             |
| This means all DB access is centralized in FastAPI. Easier to debug, easier to swap data sources post-MVP.                                  |
|                                                                                                                                             |
| Internal endpoints are FastAPI routes protected by the n8n shared secret (X-Webhook-Secret header).                                         |
|                                                                                                                                             |
| No other changes to agent pipeline logic from v1.0.                                                                                         |

## 5. Authentication and RBAC
Authentication is handled entirely by FastAPI using python-jose for JWT generation and passlib for password hashing. No external auth service. On login, FastAPI issues a JWT containing the user's role claim. Middleware validates this JWT on every protected request.

  **Route Pattern**      **Auth Required**   **Allowed Roles**      **Redirect if Unauthorized**
  /chat                  No                  Public                 ---

  /case/:id              No                  Public (case ref)      ---

  /login                 No                  All                    ---

  /approver/\*           Yes                 approver               /login

  /escalation/\*         Yes                 escalation             /login

  /policies              Yes                 approver, escalation   /login

  /internal/sources/\*   n8n secret          Internal only          401

  /webhooks/\*           n8n secret          Internal only          401

### 5.1 FastAPI JWT Implementation
| \# auth/jwt.py                                                                                              |
|                                                                                                             |
| from jose import JWTError, jwt                                                                              |
|                                                                                                             |
| from passlib.context import CryptContext                                                                    |
|                                                                                                             |
| from datetime import datetime, timedelta                                                                    |
|                                                                                                             |
| SECRET_KEY = os.getenv('JWT_SECRET_KEY')                                                                  |
|                                                                                                             |
| ALGORITHM = 'HS256'                                                                                       |
|                                                                                                             |
| ACCESS_TOKEN_EXPIRE_MINUTES = 480 \# 8 hours                                                                |
|                                                                                                             |
| pwd_context = CryptContext(schemes=\['bcrypt'\], deprecated='auto')                                     |
|                                                                                                             |
| def create_access_token(data: dict):                                                                        |
|                                                                                                             |
| to_encode = data.copy()                                                                                     |
|                                                                                                             |
| expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)                                 |
|                                                                                                             |
| to_encode.update({'exp': expire})                                                                         |
|                                                                                                             |
| return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)                                               |
|                                                                                                             |
| def verify_token(token: str) -\> dict:                                                                      |
|                                                                                                             |
| payload = jwt.decode(token, SECRET_KEY, algorithms=\[ALGORITHM\])                                           |
|                                                                                                             |
| return payload \# Contains: sub (user_id), role, email                                                      |
|                                                                                                             |
| \# Token payload structure:                                                                                 |
|                                                                                                             |
| \# { 'sub': 'user-uuid', 'role': 'approver' \| 'escalation', 'email': '\...', 'exp': \... } |

## 6. Environment Variables
### 6.1 Frontend (web/.env.local)
| NEXT_PUBLIC_API_BASE_URL=https://api.roarengine.railway.app           |
|                                                                       |
| NEXT_PUBLIC_APP_URL=https://roarengine.vercel.app                     |

### 6.2 Backend (api/.env)
| DATABASE_URL=postgresql+asyncpg://user:password@host:5432/roar        |
|                                                                       |
| JWT_SECRET_KEY=your-jwt-secret-key                                    |
|                                                                       |
| N8N_WEBHOOK_BASE_URL=https://n8n.roarengine.railway.app/webhook       |
|                                                                       |
| N8N_WEBHOOK_SECRET=your-shared-secret                                 |
|                                                                       |
| OPENAI_API_KEY=sk-\...                                                |
|                                                                       |
| APP_ENV=production                                                    |

**6.3 n8n (workflow credentials)**

| FASTAPI_BASE_URL=https://api.roarengine.railway.app                   |
|                                                                       |
| FASTAPI_WEBHOOK_SECRET=your-shared-secret                             |
|                                                                       |
| OPENAI_API_KEY=sk-\...                                                |

## 7. Project Structure
### 7.1 Root Structure
| roar-engine/                                                          |
|                                                                       |
| ├── web/ \# Next.js 14 frontend                                       |
|                                                                       |
| ├── api/ \# FastAPI Python backend                                    |
|                                                                       |
| ├── n8n/ \# n8n workflow JSON exports                                 |
|                                                                       |
| ├── db/ \# DB migrations and seed data                                |
|                                                                       |
| ├── .github/                                                          |
|                                                                       |
| │ └── workflows/ \# CI/CD                                             |
|                                                                       |
| └── README.md                                                         |

### 7.2 Frontend (web/)
| web/                                                                  |
|                                                                       |
| ├── app/                                                              |
|                                                                       |
| │ ├── layout.tsx                                                      |
|                                                                       |
| │ ├── (public)/                                                       |
|                                                                       |
| │ │ ├── chat/page.tsx                                                 |
|                                                                       |
| │ │ └── case/\[id\]/page.tsx                                          |
|                                                                       |
| │ ├── login/page.tsx                                                  |
|                                                                       |
| │ ├── (agent)/                                                        |
|                                                                       |
| │ │ ├── layout.tsx                                                    |
|                                                                       |
| │ │ ├── approver/                                                     |
|                                                                       |
| │ │ │ ├── page.tsx                                                    |
|                                                                       |
| │ │ │ └── \[caseId\]/                                                 |
|                                                                       |
| │ │ │ ├── page.tsx                                                    |
|                                                                       |
| │ │ │ └── chat/page.tsx                                               |
|                                                                       |
| │ │ ├── escalation/                                                   |
|                                                                       |
| │ │ │ ├── page.tsx                                                    |
|                                                                       |
| │ │ │ └── \[caseId\]/                                                 |
|                                                                       |
| │ │ │ ├── page.tsx                                                    |
|                                                                       |
| │ │ │ └── chat/page.tsx                                               |
|                                                                       |
| │ │ └── policies/page.tsx                                             |
|                                                                       |
| │ └── api/                                                            |
|                                                                       |
| │ └── chat/route.ts \# Vercel AI SDK streaming endpoint               |
|                                                                       |
| ├── components/                                                       |
|                                                                       |
| │ ├── layout/ \# AppShell, Sidebar, TopBar, RoleBadge                 |
|                                                                       |
| │ ├── chat/ \# IntakeForm, ChatWindow, ChatBubble, etc.               |
|                                                                       |
| │ ├── dashboard/ \# DashboardGrid, CaseCard, etc.                     |
|                                                                       |
| │ └── shared/ \# Button, Input, Modal, etc.                           |
|                                                                       |
| ├── lib/                                                              |
|                                                                       |
| │ ├── api.ts \# FastAPI fetch helpers                                 |
|                                                                       |
| │ ├── auth.ts \# JWT decode + role check                              |
|                                                                       |
| │ └── utils.ts                                                        |
|                                                                       |
| ├── types/index.ts                                                    |
|                                                                       |
| ├── styles/                                                           |
|                                                                       |
| │ ├── globals.css                                                     |
|                                                                       |
| │ └── tokens.css \# ROAR design tokens                                |
|                                                                       |
| └── middleware.ts \# Route auth + role enforcement                    |

### 7.3 Backend (api/)
| api/                                                                  |
|                                                                       |
| ├── main.py \# FastAPI app init, router registration, CORS            |
|                                                                       |
| ├── Dockerfile                                                        |
|                                                                       |
| ├── requirements.txt                                                  |
|                                                                       |
| ├── routers/                                                          |
|                                                                       |
| │ ├── auth.py \# POST /auth/login, /auth/refresh                      |
|                                                                       |
| │ ├── cases.py \# GET/POST/PATCH /cases, approve, reject              |
|                                                                       |
| │ ├── messages.py \# GET/POST /cases/:id/messages                     |
|                                                                       |
| │ ├── reports.py \# GET/POST /cases/:id/report                        |
|                                                                       |
| │ ├── webhooks.py \# POST /webhooks/\* (n8n inbound)                  |
|                                                                       |
| │ ├── policies.py \# GET /policies                                    |
|                                                                       |
| │ └── internal.py \# GET /internal/sources/\* (n8n data queries)      |
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
| │ ├── database.py \# SQLAlchemy async engine + session                |
|                                                                       |
| │ └── models.py \# SQLAlchemy ORM models                              |
|                                                                       |
| ├── services/                                                         |
|                                                                       |
| │ ├── cases.py \# Case business logic + status transitions            |
|                                                                       |
| │ └── n8n.py \# Webhook trigger helpers                               |
|                                                                       |
| └── auth/                                                             |
|                                                                       |
| ├── jwt.py \# JWT create/verify (python-jose)                         |
|                                                                       |
| ├── middleware.py \# JWT validation dependency                        |
|                                                                       |
| └── rbac.py \# Role extraction + permission checks                    |

**7.4 n8n Workflows (n8n/)**

| n8n/                                                                                       |
|                                                                                            |
| ├── workflows/                                                                             |
|                                                                                            |
| │ ├── 01_intake_agent.json                                                                 |
|                                                                                            |
| │ ├── 02_data_retrieval.json \# Now calls FastAPI /internal/sources/\* (not Supabase REST) |
|                                                                                            |
| │ ├── 03_triage_agent.json                                                                 |
|                                                                                            |
| │ ├── 04_summarization.json                                                                |
|                                                                                            |
| │ ├── 05_resolution.json                                                                   |
|                                                                                            |
| │ └── 06_case_report.json                                                                  |
|                                                                                            |
| ├── credentials/                                                                           |
|                                                                                            |
| │ └── credentials_template.json                                                            |
|                                                                                            |
| └── README.md \# Import instructions + credential setup                                    |

### 7.5 Database (db/)
| db/                                                                   |
|                                                                       |
| ├── migrations/                                                       |
|                                                                       |
| │ ├── 001_core_tables.sql \# users, cases, chat_messages              |
|                                                                       |
| │ ├── 002_resolution_records.sql \# refund_requests, return_requests  |
|                                                                       |
| │ ├── 003_reports_policies.sql \# case_reports, policies              |
|                                                                       |
| │ ├── 004_simulated_sources.sql \# All sim\_\* tables                 |
|                                                                       |
| │ └── 005_indexes.sql \# Performance indexes                          |
|                                                                       |
| └── seed/                                                             |
|                                                                       |
| ├── 001_policies.sql \# 25 policy records (from Policies v1.0)        |
|                                                                       |
| ├── 002_users.sql \# Demo agent users (approver + escalation)         |
|                                                                       |
| ├── 003_scenario_a.sql \# Refund dispute demo scenario                |
|                                                                       |
| └── 004_scenario_b.sql \# Delivery dispute demo scenario              |

## 8. Deployment Architecture
  **Service**        **Platform**   **Plan**       **Deploy Method**                       **URL Pattern**
  Next.js frontend   Vercel         Free (Hobby)   Git push to main → auto-deploy          https://roarengine.vercel.app

  FastAPI backend    Railway        Free tier      Dockerfile → Railway project            https://api.roarengine.railway.app

  PostgreSQL DB      Railway        Free tier      Auto-provisioned with FastAPI project   postgresql://\... (Railway internal)

  n8n instance       Railway        Free tier      n8n Docker image on Railway             https://n8n.roarengine.railway.app

| Hackathon deployment checklist:                                                              |
|                                                                                              |
| 1\. Railway project created → PostgreSQL provisioned → migrations run → seed scripts applied |
|                                                                                              |
| 2\. FastAPI deployed → env vars set → health check passing → JWT auth tested                 |
|                                                                                              |
| 3\. n8n deployed → workflows imported → FastAPI credential configured → webhook URLs noted   |
|                                                                                              |
| 4\. Next.js deployed to Vercel → env vars set → role-based routing tested                    |
|                                                                                              |
| 5\. E2E smoke test: Scenario A (refund autonomous) + Scenario B (delivery escalation)        |

## 9. Key Architectural Decisions
  **Decision**                        **Choice**                                 **Rationale**
  Database                            PostgreSQL on Railway                      Single infrastructure provider for FastAPI + DB + n8n. Simpler than Supabase for hackathon --- no external service dependency.

  Authentication                      FastAPI JWT (python-jose)                  No external auth service. 2-hour implementation. Full control over JWT payload structure and role claims.

  n8n data access                     FastAPI /internal/sources/\* endpoints     Centralizes all DB access in FastAPI. n8n never touches DB directly. Easier debugging. Simpler to swap data sources post-MVP.

  Live chat                           Polling every 4s                           Simpler than WebSocket for 48-hour build. Acceptable latency for demo context. No additional infrastructure required.

  AI orchestration                    n8n + LangChain                            Visual workflow = demonstrable to judges. LangChain adds structured prompt/output handling.

  Rule-based triage                   Hard rules in n8n Function nodes           Deterministic, auditable, explainable. No confidence score instability.

  Case report on conversation close   Triggered by close event                   Captures full context including human agent conversation for all paths.

  Monorepo                            web/ + api/ + n8n/ + db/                   Easier coordination for 5-person 48-hour build.

  LLM                                 GPT-4o-mini                                Best structured JSON output in cost-efficient tier. Essential for reliable triage.

  Target context                      Thai retail e-commerce / online delivery   Refund and delivery disputes are inherently digital order scenarios. Not applicable to walk-in convenience store transactions.

*--- End of Document ---*
