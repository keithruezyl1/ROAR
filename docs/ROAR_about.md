# ROAR Engine
### Retail Operations and Resolution Engine

---

## What is ROAR?

ROAR Engine is a supervised agentic dispute resolution platform built for retail enterprises operating online ordering and delivery channels. It sits between a retailer's existing backend systems — order management, payment gateway, logistics, and inventory — and their customer care team, automating the most repetitive and time-consuming parts of the dispute resolution process.

When a customer has a problem with their order — a missing refund, a delayed delivery, a lost parcel — they don't fill out a static form and wait three days for a human to read it. They open ROAR, describe what happened, and a pipeline of six specialized AI agents gets to work immediately: gathering data from every relevant system, evaluating the case against store policies and SLA rules, generating a resolution plan, and in many cases, resolving the dispute entirely — all before a human agent even opens their dashboard.

ROAR is not a chatbot. It is not a ticketing system. It is an agentic operations layer that makes human agents faster, more informed, and more consistent — and eliminates the need for human involvement entirely on the cases that don't require it.

---

## Why does ROAR exist?

Retail customer care is broken in a very specific way.

The problem isn't that agents are bad at their jobs. The problem is that the job asks agents to do things that are slow, repetitive, and cognitively expensive — things that have nothing to do with genuine human judgment.

Every time a customer files a refund dispute, an agent has to:

1. Read the complaint and ask follow-up questions to get the full picture
2. Pull up the order in the OMS
3. Cross-check the payment status in the payment gateway
4. Look up whether a refund has already been issued
5. Check when the order was placed against the return window policy
6. Decide whether the amount qualifies for immediate resolution or escalation
7. Write up a resolution plan and route it for approval
8. Document the outcome for audit purposes

That is eight steps, four systems, and at least three policy lookups — for a case that, if the transaction is confirmed, the amount is under ฿500, the order was fulfilled, and no prior refund exists, has a deterministic answer. The agent didn't need to think. They needed to look things up. And they just spent fifteen minutes doing it.

Multiply that by forty cases a day. Multiply that by a contact center with thirty agents. Multiply that by a peak sales period when order volume triples.

This is the problem ROAR exists to solve. Not by replacing agents — but by taking the lookup work, the policy evaluation work, and the documentation work off their plate entirely, so they can focus on the cases that actually need a human: the complex, the ambiguous, the ones where a customer is genuinely distressed and needs someone to talk to.

---

## Who is ROAR for?

ROAR is built for three groups of people, and it is designed around the specific pressures each of them faces.

### The Customer

The customer is frustrated. Something went wrong with their order and they don't know if anyone is going to help them or when. They don't want to fill out a form and wait. They don't want to be passed between departments. They want to describe what happened, get an answer, and move on with their day.

ROAR gives customers a structured intake experience that feels like a conversation — not a support ticket. The AI asks the right follow-up questions, presents options rather than demanding freeform text, and pulls real order data directly into the flow so the customer doesn't have to look up tracking numbers or transaction amounts. They just confirm what they see.

When a case qualifies for autonomous resolution, the customer gets their answer in minutes. When it needs a human, they get a real agent — not a bot pretending to be one.

### The Approver

The approver is a customer care agent who has been given responsibility for reviewing and approving resolution plans. They are processing cases at volume. They need to move fast, make good decisions, and not miss anything.

ROAR's approver experience is built around two principles: give them everything they need to make a decision in one screen, and make the decision a single click. The information bundle — pulled from OMS, payment, logistics, and inventory — is already assembled and structured when the approver opens a case. The resolution plan is already written. The approver reads, approves or rejects, and moves to the next case. Their job is judgment, not data entry.

When they reject a plan, ROAR puts them directly into a live conversation with the customer — because rejection without follow-through is not resolution.

### The Escalation Agent

The escalation agent handles the cases that can't be automated: lost parcels, high-value refunds, damaged goods, situations that require investigation and discretion. These are the hardest cases, and they often arrive without context.

ROAR changes that. By the time an escalation agent opens a case, an AI-generated summary is already waiting for them — structured, specific, and grounded in the actual data from the customer's order. The agent doesn't have to reconstruct the situation from scratch. They join the live chat with full context and can focus immediately on resolution.

---

## How ROAR innovates customer care through automation

### Six agents, one pipeline

ROAR's core innovation is the supervised agentic pipeline — six specialized AI agents, each with a specific role, operating in sequence through a deterministic orchestration framework built on n8n.

| Agent | Role |
|---|---|
| Intake Agent | Conducts the intake conversation, asks follow-up questions, classifies dispute intent |
| Data Retrieval Agent | Pulls order, payment, logistics, and inventory data simultaneously from all connected systems |
| Triage Agent | Applies rule-based policy evaluation deterministically — no LLM arithmetic, no hallucinations |
| Resolution Agent | Generates a structured resolution plan for human review, then executes it after approval |
| Summarization Agent | Writes a structured case brief for escalation agents who are jumping in cold |
| Case Report Agent | Compiles a complete audit record on every conversation close, regardless of outcome |

Every agent is specialized. None of them do more than their defined job. And no agent executes a real-world action — issuing a refund, creating a return request — without human approval first. This is the supervised part. The system is fast, but it is not autonomous in the dangerous sense. A human is always in the loop before money moves.

### Deterministic triage, not probabilistic guessing

One of the most important architectural decisions in ROAR is how triage works. The Triage Agent does not ask an LLM whether a ฿320 refund qualifies for autonomous resolution. It computes the answer in code.

The rules are fixed:
- Is the payment confirmed?
- Is the order fulfilled or returned?
- Is the amount at or below ฿500?
- Has a refund already been issued for this order?
- Was the dispute filed within the 7-day return window?

All five must pass for autonomous resolution. Any single failure triggers escalation. The LLM's job is to explain the decision and apply policy language — not to do the math. This makes ROAR's triage reliable, auditable, and consistent across every case.

### A single source of truth, not a data aggregation nightmare

Before ROAR, resolving a dispute meant switching between four systems. With ROAR, the Data Retrieval Agent assembles a complete information bundle — order details, transaction status, shipment history, inventory availability — in a single automated pass, before the approver ever sees the case. Every agent and every human in the system works from the same data snapshot.

### Structured intake that knows the order

ROAR's intake experience does something most support tools don't: it pulls live order data into the conversation itself. When a customer says they only received part of their order, ROAR doesn't ask them to type the item names — it shows them the items from their actual order and asks them to select which ones they received. When it needs to confirm a refund amount, it shows the exact transaction amount from the payment record. The customer confirms or corrects. The system gets precise, structured signals instead of ambiguous freeform text.

This makes triage more reliable and makes the customer feel like the system actually knows who they are.

### Audit by default

Every conversation that closes in ROAR — whether it resolves autonomously, escalates to a human, or gets rejected and handled manually — generates a complete case report. Intent classification, data sources queried, policies applied, triage decision, approval outcome, resolution actions, closure reason. All of it, automatically, written by the Case Report Agent from the full conversation transcript.

No manual documentation. No gaps in the audit trail. Every case is accounted for.

### Human judgment where it matters, automation everywhere else

The line ROAR draws is simple: if the answer is deterministic, automate it. If the answer requires judgment, discretion, or a human relationship, put a human there — but give them everything they need to be excellent.

Autonomous resolution handles the routine. Escalation handles the complex. Rejection creates a direct line between the approver and the customer. And every outcome is documented, consistent, and explainable.

This is not AI replacing customer care. This is AI making customer care worth doing again.

---

*ROAR Engine — Gosoft Retail Hackathon 2026*
