<div align="center">

# 🦁 ROAR Engine

### **R**etail **O**perations **A**nd **R**esolution Engine

*A supervised agentic dispute-resolution platform for retail e-commerce.*

<br />

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![n8n](https://img.shields.io/badge/n8n-Workflows-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io)
[![OpenAI](https://img.shields.io/badge/GPT--4o--mini-OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)

[![Hackathon](https://img.shields.io/badge/🏆_Gosoft_Retail_Hackathon-2026-D4581A?style=flat-square)](#)
[![Status](https://img.shields.io/badge/status-active-success?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey?style=flat-square)](#license)

</div>

---

## 📑 Table of Contents

- [🦁 What is ROAR?](#-what-is-roar)
- [💡 Why ROAR exists](#-why-roar-exists)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 The Six-Agent Pipeline](#-the-six-agent-pipeline)
- [👥 User Personas](#-user-personas)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Repository Structure](#-repository-structure)
- [📜 Business Rules](#-business-rules)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [🗄️ Database](#️-database)
- [⚙️ n8n Workflows](#️-n8n-workflows)
- [📡 API Surface](#-api-surface)
- [🎨 Design System](#-design-system)
- [📚 Documentation Index](#-documentation-index)
- [🧪 Demo Scenarios](#-demo-scenarios)
- [🗺️ Roadmap & Scope](#️-roadmap--scope)
- [📄 License](#-license)

---

## 🦁 What is ROAR?

**ROAR Engine** is a supervised agentic dispute-resolution platform built for retail enterprises operating online ordering and delivery channels. It sits between a retailer's existing backend systems — order management, payment gateway, logistics, and inventory — and their customer-care team, automating the most repetitive and time-consuming parts of dispute resolution.

When a customer has a problem — a missing refund, a delayed delivery, a lost parcel — they don't fill out a static form and wait three days. They open ROAR, describe what happened, and a pipeline of **six specialized AI agents** gets to work immediately: gathering data from every relevant system, evaluating the case against store policies and SLA rules, generating a resolution plan, and in many cases, resolving the dispute entirely — all before a human agent even opens their dashboard.

> ROAR is **not a chatbot**. It is **not a ticketing system**. It is an **agentic operations layer** that makes human agents faster, more informed, and more consistent — and eliminates the need for human involvement entirely on the cases that don't require it.

---

## 💡 Why ROAR exists

Retail customer care is broken in a very specific way. The problem isn't that agents are bad at their jobs — it's that the job asks them to do things that are slow, repetitive, and cognitively expensive: things that have nothing to do with genuine human judgment.

Every refund dispute typically requires:

1. 📖 Reading the complaint and asking follow-up questions
2. 🛒 Pulling the order from the OMS
3. 💳 Cross-checking the payment-gateway status
4. 🔁 Verifying whether a refund has already been issued
5. 📅 Checking the order date against the return-window policy
6. ⚖️ Deciding qualification for immediate resolution vs. escalation
7. ✍️ Writing a resolution plan and routing it for approval
8. 📝 Documenting the outcome for audit

> Eight steps. Four systems. Three policy lookups. **Fifteen minutes** — for a case with a deterministic answer.
> Multiply by 40 cases/day × 30 agents × peak season. That's the problem ROAR solves.

ROAR doesn't replace agents. It removes the lookup work, the policy evaluation, and the documentation work entirely — so humans can focus on what humans are uniquely good at: the **complex**, the **ambiguous**, and the **emotionally charged** cases that need a real person.

---

## ✨ Key Features

| Icon | Feature | Description |
|------|---------|-------------|
| 🧠 | **Six-Agent Pipeline** | Specialized agents for intake, retrieval, triage, resolution, summarization, and reporting — each with a single job. |
| ⚖️ | **Deterministic Triage** | Triage rules are **computed in code**, not guessed by an LLM. Auditable, reliable, consistent every time. |
| 🔒 | **Human-in-the-Loop** | No real-world action (refund, return) executes without explicit human approval. Supervised, not autonomous. |
| 💬 | **Structured Intake** | The chat pulls **live order data** into the conversation — customers confirm, not retype. |
| 🛰️ | **Unified Source of Truth** | The Data Retrieval Agent assembles a complete information bundle from all systems in a single pass. |
| 📝 | **Audit by Default** | Every closed case auto-generates a complete case report — intent, policies, decisions, actions. |
| 🚦 | **Strict Status FSM** | Case-status transitions are validated in FastAPI — invalid transitions return HTTP 422. |
| 🧾 | **Append-Only Chat** | `chat_messages` is enforced as append-only at the router level. No edits, no deletes. |
| 🎨 | **Token-Based Design** | All colors via CSS custom properties — light/dark mode without hex churn. |

---

## 🏗️ System Architecture

ROAR is built as **four cleanly decoupled layers**. The frontend never calls n8n or an LLM directly. n8n never touches the database. All AI orchestration is triggered exclusively through FastAPI webhooks.

```
┌──────────────────────────────────────────────────────────────────────────┐
│   👤 Customer · Approver · Escalation Agent                              │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────────────────────────┐
│  LAYER 1 — FRONTEND     ▲ Next.js 14 (App Router) · Vercel AI SDK · TW  │
│  • JWT in httpOnly cookie       • 4s polling for live chat               │
│  • Class-based dark mode        • Hosted on Vercel                       │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │ REST (JSON)
┌──────────────────────────▼───────────────────────────────────────────────┐
│  LAYER 2 — BACKEND API  ▲ FastAPI (async) · SQLAlchemy + asyncpg · JWT  │
│  • /cases, /messages, /orders, /policies, /reports                       │
│  • /internal/sources/*    (X-Webhook-Secret, n8n only)                   │
│  • /webhooks/*            (X-Webhook-Secret, n8n only)                   │
│  • Status-transition FSM validated on every PATCH                        │
└──────────┬───────────────────────────────────────┬───────────────────────┘
           │ HTTP POST (webhook)                   │ SQLAlchemy async
┌──────────▼──────────────────────────┐    ┌───────▼──────────────────────┐
│  LAYER 3 — AI ORCHESTRATION         │    │  LAYER 4 — DATA              │
│  n8n · LangChain · GPT-4o-mini      │    │  PostgreSQL on Railway       │
│  6 workflows · webhook-triggered    │    │  Migrations + seed scripts   │
│  Retries: 3× w/ 5/15/30s backoff    │    │  UUID PKs · timestamptz      │
└─────────────────────────────────────┘    └──────────────────────────────┘
```

**Design principles:**

- 🔐 **Frontend never calls n8n or the LLM directly** — only FastAPI.
- 🛡️ **n8n never queries the database directly** — only `/internal/sources/*`.
- ✅ **FastAPI is the single gate for state changes** — status FSM, append-only chat, JWT enforcement.

---

## 🤖 The Six-Agent Pipeline

Each agent is **specialized**, **bounded**, and **never performs a real-world action without approval**.

| # | 🤖 Agent | 🎯 Role | 🌡️ Temp | 🔗 Input → Output |
|---|---------|--------|--------|-------------------|
| 1 | **Intake Agent** | Conducts the intake conversation, asks follow-ups, classifies dispute intent. | 0.2 | `dispute_type, intake_message, order_id` → `intent, questions[]` |
| 2 | **Data Retrieval** | Pulls order, payment, logistics & inventory data via `/internal/sources/*`. | — | `case_id` → `information_bundle` *(no LLM call)* |
| 3 | **Triage Agent** | Rule-based policy evaluation — **deterministic, no LLM arithmetic**. | 0.0 | `bundle, policies, SLA` → `routing_decision, rules_evaluated[], justification` |
| 4 | **Resolution Agent** | Generates a structured resolution plan for human review, then executes after approval. | 0.2 | `bundle, triage` → `resolution_plan{steps, type, amount}` |
| 5 | **Summarization Agent** | Writes a structured case brief for escalation agents jumping in cold. | 0.2 | `bundle, transcript` → `escalation_brief` |
| 6 | **Case Report Agent** | Compiles a complete audit record on every conversation close. | 0.0 | `full_transcript, events` → `case_report` |

> 🚦 **The line is simple:** if the answer is deterministic, automate it. If it requires judgment, give a human everything they need to be excellent.

---

## 👥 User Personas

### 🛍️ The Customer

Frustrated, in a hurry, doesn't want a form. ROAR gives them a **conversational intake** that asks the right follow-up questions and pulls **live order data** into the chat — so they confirm what they see instead of typing tracking numbers. If the case qualifies for autonomous resolution, they get an answer in minutes.

### ✅ The Approver

A care agent processing cases at volume. Their job is **judgment, not data entry**. ROAR presents the full information bundle and a pre-written resolution plan in a single screen. Approve, reject, or send to escalation — one click. Rejection drops them directly into a live chat with the customer, because rejection without follow-through isn't resolution.

### 🚨 The Escalation Agent

Handles cases that can't be automated: lost parcels, high-value refunds, damaged goods. ROAR ensures they **never open a case cold** — the Summarization Agent has already prepared a structured brief grounded in real order data. They join the live chat with full context.

---

## 🛠️ Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-streaming-000000?style=for-the-badge&logo=vercel&logoColor=white)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_async-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI-499848?style=for-the-badge&logo=gunicorn&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-python--jose-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### Orchestration & AI
![n8n](https://img.shields.io/badge/n8n-Workflows-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-prompts-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)

### Data & Hosting
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-Hosting-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-local_dev-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## 📁 Repository Structure

```
roar-engine/
├── 📂 web/                  # Next.js 14 frontend (App Router)
│   ├── app/
│   │   ├── (customer)/      # Customer-facing case pages
│   │   ├── (agent)/         # Internal agent pages (policies)
│   │   ├── approver/        # Approver dashboard, refunds, replacements
│   │   ├── escalation/      # Escalation queue + case detail
│   │   ├── login/           # Auth screen
│   │   └── layout.tsx       # Root layout + ThemeProvider
│   ├── components/          # Shared UI primitives
│   ├── lib/                 # API client, hooks, utils
│   ├── types/               # TypeScript interfaces (no `any`)
│   └── tailwind.config.js   # Tied to design tokens
│
├── 📂 api/                  # FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── auth/                # JWT issuance + middleware
│   ├── db/                  # Async session, base, dependencies
│   ├── models/              # SQLAlchemy models
│   ├── routers/
│   │   ├── auth.py
│   │   ├── cases.py             # Status FSM enforcement
│   │   ├── messages.py          # Append-only chat
│   │   ├── customers.py
│   │   ├── orders.py
│   │   ├── policies.py
│   │   ├── replacement_requests.py
│   │   ├── return_requests.py
│   │   ├── resolution_records.py
│   │   ├── reports.py
│   │   ├── internal.py          # /internal/sources/* (n8n only)
│   │   └── webhooks.py          # /webhooks/* (n8n only)
│   └── services/            # Business logic, orchestration helpers
│
├── 📂 n8n/                  # n8n workflow exports + guides
│   └── workflows/
│       ├── 01_intake_agent.json
│       ├── 02_data_retrieval.json
│       ├── 03_triage_agent.json
│       ├── 04_summarization.json
│       ├── 05_resolution.json
│       └── 06_case_report.json
│
├── 📂 db/                   # PostgreSQL migrations + seeds
│   ├── migrations/          # 001…010 numbered SQL files
│   ├── seed/                # Policies, users, demo scenarios
│   └── scripts/             # Maintenance scripts
│
├── 📂 docs/                 # Source-of-truth specifications
│   ├── ROAR_PRD_v1.2.md
│   ├── ROAR_PBD_v1.1.md
│   ├── ROAR_Architecture_v1.1.md
│   ├── ROAR_DesignGuidelines_v1.md
│   ├── ROAR_n8n_Spec_v2.1.md
│   ├── ROAR_BRL_v1.1.md
│   ├── ROAR_Policies_v1.md
│   └── ROAR_ResolutionPaths_v1.md
│
├── 📄 bootup.bat            # One-command local boot (Postgres + n8n + API + web)
├── 📄 shutdown.bat          # Companion shutdown script
├── 📄 .cursorrules.md       # Editor rules / project conventions
└── 📄 package.json          # Root scripts (dev:web, dev:api, build:web)
```

---

## 📜 Business Rules

These constants are **non-negotiable** and enforced in FastAPI. See [ROAR_BRL_v1.1.md](docs/ROAR_BRL_v1.1.md) for full rules.

| Constant | Value | Meaning |
|----------|-------|---------|
| `REFUND_AUTO_THRESHOLD` | **฿500** | Refunds ≤ this amount may qualify for autonomous resolution. |
| `RETURN_WINDOW_DAYS` | **7** | A dispute must be filed within 7 days of order date. |
| `DELIVERY_SLA_BREACH_DAYS` | **3** | Beyond this, delivery is considered SLA-breached. |
| `INACTIVITY_TIMEOUT_MINUTES` | **15** | Chat inactivity threshold for auto-close. |
| `MIN_REJECTION_REASON_CHARS` | **50** | Approver rejection must include a substantive reason. |
| `MAX_INTAKE_QUESTIONS` | **3** | Cap on follow-up questions per intake. |
| `CHAT_POLL_INTERVAL_MS` | **4000** | Frontend polls messages every 4s during live chat. |

🚦 **Triage rules** (all five must pass for autonomous resolution):

1. ✅ Payment is confirmed
2. ✅ Order is fulfilled or returned
3. ✅ Refund amount ≤ ฿500
4. ✅ No prior refund issued for this order
5. ✅ Dispute filed within the 7-day return window

Any single failure → **escalation**. The LLM only explains the decision; it never does the math.

---

## 🚀 Getting Started

### 📋 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| ![Node](https://img.shields.io/badge/Node.js-≥18-339933?style=flat-square&logo=node.js&logoColor=white) | 18+ | Frontend dev server |
| ![Python](https://img.shields.io/badge/Python-≥3.11-3776AB?style=flat-square&logo=python&logoColor=white) | 3.11+ | Backend runtime |
| ![Docker](https://img.shields.io/badge/Docker-Desktop-2496ED?style=flat-square&logo=docker&logoColor=white) | latest | Local Postgres + n8n containers |
| ![Git](https://img.shields.io/badge/Git-any-F05032?style=flat-square&logo=git&logoColor=white) | any | Cloning |

### ⚡ One-Command Boot (Windows)

If you have Docker containers `roar-postgres` and `roar-n8n` set up, you can launch the entire stack with one command:

```powershell
.\bootup.bat
```

This starts:

| Service | URL |
|---------|-----|
| 🐘 PostgreSQL | `localhost:5432` |
| 🔗 n8n | http://localhost:5678 |
| ⚡ FastAPI | http://localhost:8000/docs |
| 🖼️ Frontend | http://localhost:3000 |

To stop everything cleanly:

```powershell
.\shutdown.bat
```

### 🔧 Manual Setup

#### 1️⃣ Clone & install

```bash
git clone https://github.com/keithruezyl1/ROAR.git
cd ROAR
```

#### 2️⃣ Frontend

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

#### 3️⃣ Backend

```bash
cd api
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI: http://localhost:8000/docs

#### 4️⃣ Database

```bash
# From the repo root, after Postgres is running:
psql $DATABASE_URL -f db/migrations/001_core_tables.sql
# … run migrations 002 through 010 in numeric order
psql $DATABASE_URL -f db/seed/001_policies.sql
psql $DATABASE_URL -f db/seed/002_users.sql
psql $DATABASE_URL -f db/seed/003_scenario_a.sql
psql $DATABASE_URL -f db/seed/004_scenario_b.sql
```

#### 5️⃣ n8n

1. Open http://localhost:5678
2. Import each workflow in `n8n/workflows/` in numeric order
3. Set credentials (OpenAI API key, FastAPI base URL, webhook secret)
4. Activate workflows

---

## 🔑 Environment Variables

> 🔒 Never commit `.env` files. Validate on startup; never hardcode.

### `web/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ROAR Engine
```

### `api/.env`

```env
# Database
DATABASE_URL=postgresql+asyncpg://roar:roar@localhost:5432/roar

# Auth
JWT_SECRET=change-me-to-a-long-random-string
JWT_ALG=HS256
JWT_EXP_MINUTES=480

# n8n integration
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=shared-secret-between-fastapi-and-n8n

# Optional
LOG_LEVEL=info
```

### n8n credentials

| Credential | Where |
|-----------|-------|
| `OPENAI_API_KEY` | All LLM-using workflows |
| `FASTAPI_BASE_URL` | WF2 (data retrieval) + all status updates |
| `X-Webhook-Secret` | Header on every call into FastAPI |

---

## 🗄️ Database

**PostgreSQL 16** on Railway. UUID primary keys via `gen_random_uuid()`. All timestamps are `timestamptz`.

### Migrations

Files in `db/migrations/`, run in order:

| # | File | Purpose |
|---|------|---------|
| 001 | `001_core_tables.sql` | Users, cases, chat_messages, policies |
| 002 | `002_resolution_records.sql` | Resolution record table |
| 003 | `003_simulated_sources.sql` | Mock OMS / payment / shipment / inventory |
| 004 | `004_indexes.sql` | Performance indexes |
| 005 | `005_chat_messages_sender_type_check.sql` | Append-only constraint enforcement |
| 006 | `006_customer_role.sql` | Customer role addition |
| 007 | `007_intake_v2_fields.sql` | Updated intake schema |
| 008 | `008_replacement_requests.sql` | Replacement-request domain |
| 009 | `009_cases_status_constraint.sql` | Status FSM constraint |
| 010 | `010_decision_matrix_alignment.sql` | Alignment with decision matrix |

### Seeds

```
db/seed/
├── 001_policies.sql       # 25 policy records
├── 002_users.sql          # Demo users (customer, approver, escalation)
├── 003_scenario_a.sql     # Refund demo
└── 004_scenario_b.sql     # Delivery demo
```

---

## ⚙️ n8n Workflows

Six workflows, one per agent. All are **webhook-triggered by FastAPI** — never by the frontend.

| File | Workflow | Trigger | Temp |
|------|----------|---------|------|
| `01_intake_agent.json` | 🗣️ Intake | `POST /webhooks/intake` | 0.2 |
| `02_data_retrieval.json` | 🛰️ Data Retrieval | After intake completes | — |
| `03_triage_agent.json` | ⚖️ Triage | After bundle is built | **0.0** |
| `04_summarization.json` | 📝 Summarization | On escalation | 0.2 |
| `05_resolution.json` | 🛠️ Resolution | After triage = autonomous | 0.2 |
| `06_case_report.json` | 📄 Case Report | On case close | **0.0** |

### Rules

- 🧱 **Every LLM call has a fallback** — never throw uncaught on AI failure.
- 🔁 Built-in retries: **3 attempts** with **5/15/30s** exponential backoff.
- 🔐 Every call into FastAPI carries the `X-Webhook-Secret` header.
- 🧪 Every `JSON.parse` in a Code node is wrapped in `try/catch`.

---

## 📡 API Surface

### 🔑 Public (JWT-protected)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/login` | Issue JWT |
| `POST` | `/auth/refresh` | Rotate JWT |
| `GET / PATCH` | `/cases` · `/cases/:id` | Case CRUD; PATCH enforces status FSM |
| `GET / POST` | `/cases/:id/messages` | Append-only chat (no DELETE/UPDATE) |
| `GET` | `/customers/me` | Current-user context |
| `GET` | `/orders/:id` | Order lookup |
| `GET` | `/policies` | Policy listing |
| `POST / GET` | `/replacement_requests` · `/return_requests` | Resolution actions |
| `GET` | `/reports/:case_id` | Final case report |

### 🛡️ Internal (n8n only — `X-Webhook-Secret`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/internal/sources/orders` | OMS data |
| `GET` | `/internal/sources/transactions` | Payment data |
| `GET` | `/internal/sources/shipments` | Logistics data |
| `GET` | `/internal/sources/inventory` | Inventory data |

### 🪝 Webhooks (n8n only — `X-Webhook-Secret`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/webhooks/intake_complete` | Intake done → trigger retrieval |
| `POST` | `/webhooks/triage_complete` | Triage decision in |
| `POST` | `/webhooks/resolution_ready` | Plan ready for approver |
| `POST` | `/webhooks/case_report_ready` | Final report ready |

> 🚫 **Hard rules:** chat is **append-only**; n8n **never queries the DB directly**; invalid status transitions return **HTTP 422**.

---

## 🎨 Design System

All component specs live in [`docs/ROAR_DesignGuidelines_v1.md`](docs/ROAR_DesignGuidelines_v1.md).

### 🎨 Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary` | `#D4581A` 🟧 | `#E8862E` 🟧 |

All colors flow through CSS custom properties. **Hex values are never hardcoded** in components.

### 🔤 Typography

- **Sans:** Inter (via `next/font`)
- **Mono:** JetBrains Mono (via `next/font`)
- ❌ Body text never uses font-weight 600/700 — only headings and labels.

### 📐 Radii

| Token | Value |
|-------|-------|
| `--radius-card` | `12px` |
| `--radius-btn` | `8px` |
| `--radius-pill` | `999px` |

### 🌓 Dark Mode

Class-based via `.dark` on `<html>` — **not** `prefers-color-scheme`. Persisted to `localStorage` by `ThemeProvider`.

---

## 📚 Documentation Index

All architectural decisions, business rules, schemas, API contracts, component specs, and workflow designs are defined as markdown documents in [`docs/`](docs/). **In any conflict between documents and assumptions — documents win.**

| 📄 Document | 📝 What it defines |
|-------------|--------------------|
| [`ROAR_PRD_v1.2.md`](docs/ROAR_PRD_v1.2.md) | Product requirements, features, scope |
| [`ROAR_PBD_v1.1.md`](docs/ROAR_PBD_v1.1.md) | DB schema, API contracts, component map, build plan |
| [`ROAR_Architecture_v1.1.md`](docs/ROAR_Architecture_v1.1.md) | System layers, auth, project structure, env vars |
| [`ROAR_DesignGuidelines_v1.md`](docs/ROAR_DesignGuidelines_v1.md) | Color tokens, typography, component specs |
| [`ROAR_n8n_Spec_v2.1.md`](docs/ROAR_n8n_Spec_v2.1.md) | n8n workflow nodes, tools, prompts, webhooks |
| [`ROAR_BRL_v1.1.md`](docs/ROAR_BRL_v1.1.md) | All business rules, system constants, chat rules |
| [`ROAR_Policies_v1.md`](docs/ROAR_Policies_v1.md) | 25 policy records with SQL seed script |
| [`ROAR_ResolutionPaths_v1.md`](docs/ROAR_ResolutionPaths_v1.md) | 34 dispute resolution scenarios |
| [`ROAR_about.md`](docs/ROAR_about.md) | Long-form vision & narrative |
| [`ROAR_frontend_e2e_test_guide.md`](docs/ROAR_frontend_e2e_test_guide.md) | E2E test choreography |

---

## 🧪 Demo Scenarios

The seed data ships with two end-to-end demonstrable scenarios.

### 🅰️ Scenario A — Refund (Autonomous Path)

A confirmed payment, fulfilled order, amount **≤ ฿500**, no prior refund, filed within the 7-day window. All five triage rules pass → autonomous resolution. Customer gets an answer in minutes.

### 🅱️ Scenario B — Delivery (Escalation Path)

A delivery that has breached the SLA window and requires investigation. Triage routes to escalation → Summarization Agent prepares a brief → escalation agent joins live chat with full context.

The full **34 resolution paths** are documented in [`ROAR_ResolutionPaths_v1.md`](docs/ROAR_ResolutionPaths_v1.md).

---

## 🗺️ Roadmap & Scope

### ✅ In Scope (v1)

- Six-agent pipeline with deterministic triage
- Customer intake, approver dashboard, escalation queue
- 25 policies + 34 resolution paths
- Append-only audit chat + auto-generated case reports
- Dark mode, design tokens, polling-based live chat

### ❌ Explicitly Out of Scope (v1)

- ❌ Settings screen
- ❌ Analytics dashboard
- ❌ WebSocket-based chat (we poll — see `CHAT_POLL_INTERVAL_MS`)
- ❌ Direct DB access from n8n or the frontend
- ❌ Supabase client libs or Supabase Auth (we use FastAPI JWT)

---

## 📄 License

This project was developed for the **🏆 Gosoft Retail Hackathon 2026**.
All rights reserved by the project owners.

---

<div align="center">

**ROAR Engine** — *not AI replacing customer care.*
*AI making customer care worth doing again.*

🦁

</div>
ocuments
