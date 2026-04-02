"""Helpers for extracting customer-selected affected items from case transcript/history."""

from __future__ import annotations

from typing import Any, Iterable


def _normalized(value: str | None) -> str:
    return str(value or "").strip().lower()


def _name_variants(value: str | None) -> set[str]:
    text = str(value or "").strip()
    if not text:
        return set()
    lowered = text.lower()
    return {
        lowered,
        lowered.replace("-", " "),
        lowered.replace("(", "").replace(")", ""),
        lowered.replace("-", " ").replace("(", "").replace(")", ""),
    }


def affected_item_ids_from_messages(messages: Iterable[Any]) -> list[str]:
    for message in reversed(list(messages)):
        sender_type = getattr(message, "sender_type", None)
        metadata = getattr(message, "metadata_", None) or {}
        if sender_type != "customer" or not isinstance(metadata, dict):
            continue

        if metadata.get("selection_type") != "affected_items":
            continue

        raw_ids = metadata.get("affected_item_ids")
        if not isinstance(raw_ids, list):
            continue

        normalized_ids = [str(item_id).strip() for item_id in raw_ids if str(item_id).strip()]
        if normalized_ids:
            return normalized_ids

    return []


def filter_order_items_to_affected(order_items: list[dict[str, Any]], affected_item_ids: list[str]) -> list[dict[str, Any]]:
    if not order_items or not affected_item_ids:
        return order_items

    normalized_ids = {_normalized(item_id) for item_id in affected_item_ids if _normalized(item_id)}
    if not normalized_ids:
        return order_items

    filtered = [
        item
        for item in order_items
        if _normalized(item.get("item_id")) in normalized_ids or _normalized(item.get("sku")) in normalized_ids
    ]

    return filtered or order_items


def fallback_match_item_ids_from_text(order_items: list[dict[str, Any]], content: str | None) -> list[str]:
    lowered_content = _normalized(content)
    if not lowered_content:
        return []

    matched: list[str] = []
    for item in order_items:
        item_id = str(item.get("item_id") or item.get("sku") or "").strip()
        if not item_id:
            continue

        candidate_names = _name_variants(item.get("product_name")) | _name_variants(item.get("item_name"))
        if any(name and name in lowered_content for name in candidate_names):
            matched.append(item_id)

    return matched
