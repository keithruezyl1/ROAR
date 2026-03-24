# Live workflow backup (2026-03-20)

`live-workflows-sanitized.json` is a **sanitized snapshot** of the six ROAR workflows from your **running local n8n instance**, not a guaranteed byte-for-byte match to an n8n UI “Download” export.

- **Graph data** (nodes, connections, settings, ids, version ids, timestamps, trigger counts) comes from the local n8n database table `workflow_entity` (`~/.n8n/database.sqlite`), which is the same source the instance executes.
- **`triggerInfo`** text is copied **verbatim** from `user-n8n-local` MCP `get_workflow_details` for those workflow IDs.
- The duplicate **`activeVersion`** subgraph is **omitted** on purpose to keep the file smaller.
- **Credentials**: n8n stores credentials separately. Do **not** assume this file contains every secret the runtime uses; values visible here are whatever is stored inline on nodes plus anything MCP chooses to expose. Treat the bundle as sensitive if it includes bearer tokens or webhook secrets in HTTP node parameters.

To regenerate the JSON (same machine, same n8n data directory), run:

`python build_live_backup.py`

Canonical repo filenames follow `docs/ROAR_n8n_Spec_v2.1.md` §4: `01_intake_agent.json` … `06_case_report.json`.
