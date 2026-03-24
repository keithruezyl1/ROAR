# UI Screens

This document summarizes the current frontend screen inventory in `web/`, what is already built, what still needs to be made, and which screens are still skeletal.

Sources reviewed:
- `docs/ROAR_Architecture_v1.1.md`
- `docs/ROAR_DesignGuidelines_v1.md`
- `docs/ROAR_workflow_final_review.md`
- current `web/app` pages and shared UI components

## Intended Screen Set From Spec

The specs define these main user-facing screens:

- Customer Chat: `/chat`
- Case Status: `/case/:id`
- Login: `/login`
- Approver Dashboard: `/approver`
- Approver Record: `/approver/:caseId`
- Approver Live Chat: `/approver/:caseId/chat`
- Escalation Dashboard: `/escalation`
- Escalation Record: `/escalation/:caseId`
- Escalation Live Chat: `/escalation/:caseId/chat`
- Policies Page: `/policies`

The current app also includes an extra customer dashboard screen:

- My Cases: `/cases`

## Current Screen Inventory

| Route | Current state | Notes |
| --- | --- | --- |
| `/` | Built | Redirects to `/chat`. |
| `/chat` | Built, partially wired | Intake form and chat UI exist. Uses `IntakeForm`, `ChatWindow`, and `CaseStatusTracker`. |
| `/cases` | Built | Customer "My Cases" dashboard exists even though it is not called out in the original screen list. |
| `/case/:id` | Built, skeletal | Public case status page exists, but it is intentionally very minimal. |
| `/login` | Built | Functional sign-in screen with role-based redirect. |
| `/approver` | Built | Approval queue dashboard is implemented and polls cases. |
| `/approver/:caseId` | Built | Record view exists with info bundle, plan, approve, and reject flows. |
| `/approver/:caseId/chat` | Built, skeletal | Live chat exists with close panel, but the experience is still fairly bare. |
| `/escalation` | Built | Escalation queue dashboard is implemented and polls cases. |
| `/escalation/:caseId` | Built, partially wired | Summary, info bundle, and join-chat flow exist. |
| `/escalation/:caseId/chat` | Built, skeletal | Live chat exists with close panel, but the experience is still fairly bare. |
| `/policies` | Built | Policies page exists with grouped sections, anchors, and search. |

## Screens That Are Present But Still Skeletal

### `/case/:id` public case status

This is the most skeletal screen in the repo.

- It shows only a heading, reference number, and `CaseStatusTracker`.
- It does not expose richer case context, timeline detail, next steps, or dispute metadata.
- It is serviceable for status checks, but it feels like a placeholder rather than a polished customer-facing record page.

### `/approver/:caseId/chat`

This is functional, but still skeletal compared with the spec.

- Core chat works.
- The close flow exists.
- The layout is very plain and does not yet feel like a full operational chat workspace.
- On mobile, the spec calls for a bottom-sheet style close experience, but the current page simply hides the side panel on smaller screens.

### `/escalation/:caseId/chat`

Same situation as the approver chat screen.

- Functional live chat is there.
- Close flow is there.
- The overall experience is still thin and missing the richer context and responsive behaviors described in the design notes.

### `/escalation/:caseId`

This is usable, but still only partly realized.

- Summary, info bundle, and join-chat are present.
- The spec calls for a two-column record layout with the action area separated from the information area.
- The current implementation is a simple stacked layout.

## Screens That Are Mostly There

### `/chat`

The customer chat flow is one of the more complete screens.

- Intake form exists.
- Chat window exists.
- Structured response handling exists.
- Polling exists.

Main gaps:

- `CaseStatusTracker` is currently rendered with a hardcoded `pending_triage` state after case creation instead of reflecting live case status.
- The participant banner does not truly transition between AI, human, and closed states based on actual conversation state.
- The screen is protected by middleware today, while the original spec describes `/chat` as public.

### `/approver`

The approval dashboard is in decent shape.

- Queue screen exists.
- Search/filter UI exists.
- Empty state exists.
- Cards and navigation are wired.

Main gaps:

- It is operational, but still needs polish around loading states, error states, and production-grade UX refinement.

### `/approver/:caseId`

This is one of the stronger screens.

- Breadcrumb exists.
- Info bundle panel exists.
- Resolution plan panel exists.
- Approve/reject flows exist.

Main gaps:

- It could use richer visual hierarchy and more complete case metadata.
- It should be checked against the "sticky bottom action area" expectation from the design spec.

### `/escalation`

The escalation dashboard is also mostly there.

- Queue screen exists.
- Search/filter UI exists.
- Empty state exists.

Main gaps:

- Same polish issues as the approver dashboard.

### `/policies`

This screen is fairly complete.

- Category nav exists.
- In-page search exists.
- Policy record anchors exist.
- Read-only registry pattern is implemented.

Main gap:

- The page is rendered through `AppShell` with `role="approver"` hardcoded, so escalation users may get the wrong shell treatment even though middleware allows them to access `/policies`.

### `/login`

This is functional and not especially skeletal.

- Form exists.
- API auth flow exists.
- Role-based redirect exists.

Main gap:

- It is more functional than polished. It may need final copy, validation messaging, and demo-grade visual refinement.

### `/cases`

This screen is useful and mostly functional.

- Customers can see their own cases.
- Cases link back into resumed chat.
- It provides a good customer entry point that the original screen list did not explicitly define.

Main gaps:

- It should be formally documented in the product docs if it is now part of the intended MVP.
- It could use filtering, clearer status grouping, and stronger closed-vs-active organization.

## What Still Needs To Be Made

These are the biggest missing or incomplete pieces from a screen/UX perspective.

### 1. Real screen-state fidelity in chat

- Live case status should drive `CaseStatusTracker` on `/chat`.
- Participant state should switch correctly between AI, human, and closed.
- Agent name and join/leave context should be represented more explicitly.

### 2. Mobile-friendly close flows

- Both agent live chat screens need the spec's mobile close interaction instead of just hiding the side panel.

### 3. Better record-view layout fidelity

- The escalation record screen should match the intended two-column structure.
- The approver record view should be checked and refined against the same layout expectations.

### 4. Better loading, empty, and error states

- Some screens still fall back to plain `Loading...` text.
- Failures from API reads are not surfaced consistently to the user.
- Several screens need more deliberate skeleton/loading patterns.

### 5. Access and route alignment with the spec

- `/chat` is currently protected in middleware, even though the spec describes it as public.
- `/cases` exists and should either be added to the spec or intentionally treated as a product extension.

### 6. Policies shell behavior for escalation users

- `/policies` should render the correct role shell for both approver and escalation users.

## Recommended Improvement Order

1. Fix `/chat` state fidelity: live status, participant state, and customer chat behavior.
2. Refine the two record views, especially `/escalation/:caseId`.
3. Upgrade both live chat screens for mobile and operational usability.
4. Normalize loading/error states across all dashboards and record pages.
5. Align route access behavior with the documented product spec.

## Short Verdict

The app already has the full core screen set needed for the MVP flow, plus an extra `/cases` customer dashboard. The biggest issue is not missing screens, but uneven completeness: several screens exist and work, but still feel skeletal because they are missing dynamic state fidelity, responsive behavior, or the richer layout patterns described in the design spec.
