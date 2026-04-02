# feat: deterministic intake, triage, and resolution pipeline + affected-item enforcement

## Summary

This update introduces a deterministic, end-to-end pipeline for intake → triage → resolution, ensuring that replacement and resolution flows strictly adhere to customer-selected affected items. It eliminates drift between customer intent and backend execution, improves workflow reliability, and aligns UI, backend logic, and n8n workflows under a unified decision model.

---

## Core Improvements

- Enforced **structured affected-item selection** across the system
- Eliminated **intake loops and regressions**
- Standardized **triage decisions via decision matrix**
- Made **resolution flows deterministic and subtype-aware**
- Removed **duplicate system messaging**
- Improved **UI clarity and usability for replacement requests**
- Strengthened **workflow data contracts and normalization**

---

## Codebase Changes

### Affected Item Handling

- Persist structured affected-item selections in **customer message metadata**
  - `ChatWindow.tsx`
  - `StructuredResponse.tsx`

- Added backend helpers to resolve affected items:
  - Uses transcript metadata first
  - Falls back to text parsing if needed  
  - `affected_items.py`

- Replacement requests now:
  - Trim `replacement_items` to **customer-selected subset only**
  - Recalculate **eligible amount based on subset**
  - `replacement_requests.py`

- Enhanced triage supports:
  - `affected_item_ids`
  - `affected_items_detail`
  - `enhanced_triage.py`

---

### Replacement Requests UI

- Refactored admin UI:
  - Removed heavy queue-style layout
  - Introduced **compact card list**
  - Moved full request details into a **modal**
  - Kept actions inside modal for clarity
  - `page.tsx`

- Added **replacement table** for improved visibility and structure

---

## Workflow Changes

---

### WF1 — Intake

**Improvements:**
- Enforced strict intake sequence for damaged goods:
  1. Scope
  2. Item selection (if partial)
  3. Damage detail
  4. Classification

- Hardened JSON parsing:
  - Prevents re-asking scope
  - Eliminates looping behavior
  - Skips item selection when all items are affected
  - Requires damage detail before classification

**Result:**
- More stable intake
- Reduced regressions
- Cleaner structured output

---

### WF2 — Data Extraction

**Changes:**
- Updated bundle assembly to include:
  - `affected_item_ids`
  - `affected_items_detail`

- Identified need for:
  - **Fetch Transcript node** (new requirement)
  - Extract affected-item metadata from message history

- Shifted from:
  - Full transcript passing  
  → **Derived structured fields only**

- Added optional inventory extraction logic

**Status:**
- Partially complete  
- Transcript ingestion is the next priority

---

### WF3 — Triage

**Fixes & Enhancements:**
- Fixed PATCH behavior using code nodes to ensure valid JSON payloads
- Replaced incorrect field:
  - `triage_data` → `triage_decision`

- Updated triage paths:
  - `approved executing`
  - `awaiting approval`
  - `escalated`

- Fully aligned with:
  - `ROAR_WF_Manual_Mapping_Guide_Decision_Matrix.md`

- Introduced deterministic routing:
  - Canonical subtype handling
  - Subset-aware replacement logic
  - Delivery-specific logic
  - Explicit escalation rules
  - Return cases never autonomous

**Result:**
- Triage is now consistent, predictable, and contract-driven

---

### WF5 — Resolution

**Fixes:**

- Autonomous flow now runs correctly in two stages:
  1. Plan generation
  2. Approved execution

- Routing now based on:
  - Case + triage data  
  (not LLM output)

- Introduced normalization layer:
  - `Normalize Case`
  - `Normalize Case + Plan`

- Updated all downstream nodes to use normalized structure

---

### Request Handling Fixes

- Fixed request creation flows:
  - Refund
  - Replacement
  - Return

- Fixed case resolution update:
  - Correct case ID from normalized data

- Disabled duplicate messaging:
  - Backend owns system message posting
  - WF5 no longer posts duplicate messages

- Replacement request status behavior:
  - Created as `approved` after WF3 approval
  - No longer `pending`

---

## Behavioral Fixes Achieved

- Intake no longer loops or regresses
- Triage decisions are consistently written to cases
- WF5 execution no longer fails due to malformed data
- Replacement requests strictly follow selected items
- Duplicate system messages eliminated
- UI is more compact and actionable
- Workflow routing is deterministic and matrix-driven

---

## Additional Updates

- Added support for:
  - Return cases
  - Replacement cases

- Improved:
  - Autonomous resolution determination
  - Question sequencing logic
  - Case UI/UX consistency

---

## Current State

### Completed

- Affected-item persistence and enforcement (backend + frontend)
- Deterministic intake, triage, and resolution flows
- Workflow alignment with decision matrix
- UI improvements for replacement handling

### In Progress / Next Priority

- WF2 transcript ingestion:
  - Fetch transcript node
  - Extract affected-item metadata
  - Populate bundle with structured fields

- End-to-end validation across all scenarios

---

## Notes

This update establishes a **deterministic system contract** across:
- Intake (WF1)
- Data extraction (WF2)
- Triage (WF3)
- Resolution (WF5)

The system now prioritizes:
- Structured data over freeform interpretation
- Backend authority over workflow duplication
- Explicit decision logic over implicit LLM behavior