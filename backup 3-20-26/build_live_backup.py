"""Assemble live-workflows-sanitized.json from n8n workflow_entity + MCP triggerInfo strings."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB = Path.home() / ".n8n" / "database.sqlite"
OUT = Path(__file__).resolve().parent / "live-workflows-sanitized.json"

ORDER = [
    ("01_intake_agent.json", "IFYMhz16s9NvAInS"),
    ("02_data_retrieval.json", "YgwEprPNmzxzKHVH"),
    ("03_triage_agent.json", "PRCMSJ8mOPbRY7Tr"),
    ("04_summarization.json", "v8DDRaFudzxJc3Ak"),
    ("05_resolution.json", "j5AO9jThlTSFeDGS"),
    ("06_case_report.json", "rZa7u65ET6JwkhTp"),
]

# Verbatim triggerInfo from user-n8n-local get_workflow_details (2026-03-20).
TRIGGER_INFO = {
    "IFYMhz16s9NvAInS": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook — case-created\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/case-created\n"
        "\t\t\t\t\t - Test path: /webhook-test/case-created\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond when the last node is executed. "
        "Returns the JSON data of the first entry of the last node. Always returns a JSON object.\n"
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>"
    ),
    "YgwEprPNmzxzKHVH": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook Trigger\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/bundle-ready\n"
        "\t\t\t\t\t - Test path: /webhook-test/bundle-ready\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond when the last node is executed. "
        "Returns the JSON data of the first entry of the last node. Always returns a JSON object.\n"
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>"
    ),
    "PRCMSJ8mOPbRY7Tr": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook Trigger\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/triage-complete\n"
        "\t\t\t\t\t - Test path: /webhook-test/triage-complete\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond immediately with the message "
        '"Workflow got started."\n'
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>"
    ),
    "v8DDRaFudzxJc3Ak": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook Trigger\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/triage-escalation\n"
        "\t\t\t\t\t - Test path: /webhook-test/triage-escalation\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond immediately with the message "
        '"Workflow got started."\n'
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>"
    ),
    "j5AO9jThlTSFeDGS": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook - Plan\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/resolution-plan\n"
        "\t\t\t\t\t - Test path: /webhook-test/resolution-plan\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond immediately with the message "
        '"Workflow got started."\n'
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>\n\n\n"
        "\t\t\t\t<trigger 2>\n"
        "\t\t\t\t\t - Node name: Webhook - Approved\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/approved\n"
        "\t\t\t\t\t - Test path: /webhook-test/approved\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond immediately with the message "
        '"Workflow got started."\n'
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 2>"
    ),
    "rZa7u65ET6JwkhTp": (
        "This workflow has the following trigger(s):\n\n\nWebhook trigger(s):\n\n\n"
        "\t\t\t\t<trigger 1>\n"
        "\t\t\t\t\t - Node name: Webhook Trigger\n"
        "\t\t\t\t\t - Base URL: http://localhost:5678/\n"
        "\t\t\t\t\t - Production path: /webhook/conversation-closed\n"
        "\t\t\t\t\t - Test path: /webhook-test/conversation-closed\n"
        "\t\t\t\t\t - HTTP Method: POST\n"
        "\t\t\t\t\t - Response Mode: Webhook is configured to respond immediately with the message "
        '"Workflow got started."\n'
        "\t\t\t\t\t - No credentials required for this webhook.\n"
        "\t\t\t\t</trigger 1>"
    ),
}


def to_iso_z(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if "T" in s:
        return s if s.endswith("Z") else s + "Z"
    return s.replace(" ", "T", 1) + "Z"


def main():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    workflows = []
    for canonical_repo_filename, wf_id in ORDER:
        cur.execute(
            """
            SELECT id, name, active, createdAt, updatedAt, versionId, activeVersionId,
                   triggerCount, settings, connections, nodes
            FROM workflow_entity
            WHERE id = ?
            """,
            (wf_id,),
        )
        row = cur.fetchone()
        if row is None:
            raise SystemExit(f"Missing workflow {wf_id} in {DB}")

        settings = json.loads(row["settings"]) if row["settings"] else None
        connections = json.loads(row["connections"]) if row["connections"] else {}
        nodes = json.loads(row["nodes"]) if row["nodes"] else []

        workflows.append(
            {
                "canonical_repo_filename": canonical_repo_filename,
                "id": row["id"],
                "name": row["name"],
                "active": bool(row["active"]),
                "createdAt": to_iso_z(row["createdAt"]),
                "updatedAt": to_iso_z(row["updatedAt"]),
                "versionId": row["versionId"],
                "activeVersionId": row["activeVersionId"],
                "triggerCount": row["triggerCount"],
                "settings": settings,
                "connections": connections,
                "nodes": nodes,
                "triggerInfo": TRIGGER_INFO[wf_id],
            }
        )

    conn.close()

    payload = {
        "exported_at": datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z"),
        "source": (
            "Local n8n SQLite workflow_entity (%s) for graph, settings, connections, nodes, and "
            "version metadata; triggerInfo strings verbatim from user-n8n-local "
            "get_workflow_details (same workflow IDs, 2026-03-20)."
        )
        % DB.as_posix(),
        "note": (
            "activeVersion graph omitted by design. Node parameters match the live rows in "
            "workflow_entity for this instance. triggerInfo is copied from MCP, not derived from "
            "the database."
        ),
        "workflows": workflows,
    }

    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("Wrote", OUT, "workflows:", len(workflows))


if __name__ == "__main__":
    main()
