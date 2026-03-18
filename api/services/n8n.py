"""n8n webhook trigger helpers.

Fires HTTP POST to n8n webhook URLs using the shared X-Webhook-Secret.
Errors are logged but never raised — n8n failures must not break FastAPI responses.
"""

from __future__ import annotations

import logging

import httpx

from api.config import settings

logger = logging.getLogger(__name__)


def _build_webhook_url(webhook_path: str) -> str:
    """Normalise webhook path against configured base URL."""
    base = settings.n8n_webhook_base_url.rstrip("/")
    path = webhook_path.strip()

    # Allow callers to pass either bare names or full /webhooks/* paths
    if path.startswith("/"):
        path = path[1:]
    if path.startswith("webhooks/"):
        path = path[len("webhooks/") :]
    if path.startswith("/webhooks/"):
        path = path[len("/webhooks/") :]

    return f"{base}/{path}"


async def trigger_workflow(webhook_path: str, payload: dict) -> bool:
    """
    Fire an n8n webhook.

    webhook_path: e.g. 'case-created', 'bundle-ready', 'approved', or '/webhooks/case-created'.
    Returns True on success, False on failure.
    """
    url = _build_webhook_url(webhook_path)
    headers = {"X-Webhook-Secret": settings.n8n_webhook_secret}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info("n8n webhook triggered", extra={"url": url, "status_code": resp.status_code})
            return True
    except httpx.TimeoutException:
        logger.warning("n8n webhook timeout", extra={"url": url})
        return False
    except httpx.HTTPStatusError as exc:
        logger.error(
            "n8n webhook HTTP error",
            extra={"url": url, "status_code": exc.response.status_code},
        )
        return False
    except Exception:
        logger.exception("Failed to trigger n8n webhook", extra={"url": url})
        return False


