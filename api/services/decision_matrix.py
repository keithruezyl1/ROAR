"""Decision-matrix normalization and shared constants."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable


CANONICAL_DISPUTE_SUBTYPE_TO_TYPE: dict[str, str] = {
    # Refund lane
    "duplicate_charge": "refund",
    "not_as_described": "refund",
    "damaged_goods": "refund",
    "wrong_item": "refund",
    "partial_fulfillment": "refund",
    "return_request": "refund",
    "changed_mind": "refund",
    "other": "refund",
    # Delivery lane
    "non_receipt": "delivery",
    "delayed": "delivery",
    "exception": "delivery",
    "lost": "delivery",
}

# Backward-compatible aliases mapped to canonical matrix values.
DISPUTE_SUBTYPE_ALIASES: dict[str, str] = {
    "package_never_arrived": "non_receipt",
    "delivery_late": "delayed",
    "wrong_delivery_address": "exception",
    "quality_issue": "not_as_described",
    "return_for_refund": "return_request",
}

ALLOWED_RESOLUTION_PREFERENCES = {"refund", "replacement", "return"}

# Per-matrix applicability
ALLOWED_PREFERENCES_BY_SUBTYPE: dict[str, set[str]] = {
    "duplicate_charge": {"refund"},
    "not_as_described": {"refund", "replacement"},
    "damaged_goods": {"refund", "replacement"},
    "wrong_item": {"refund", "replacement"},
    "partial_fulfillment": {"refund"},
    "return_request": {"return"},
    "changed_mind": {"return"},
    "other": {"refund"},
    "non_receipt": {"refund", "replacement"},
    "delayed": {"refund"},
    "exception": {"refund"},
    "lost": {"refund", "replacement"},
}


def normalize_dispute_subtype(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if not normalized:
        return None
    return DISPUTE_SUBTYPE_ALIASES.get(normalized, normalized)


def normalize_resolution_preference(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if not normalized:
        return None
    return normalized


def subtype_expected_type(subtype: str | None) -> str | None:
    if subtype is None:
        return None
    return CANONICAL_DISPUTE_SUBTYPE_TO_TYPE.get(subtype)


def allowed_preferences_for(dispute_type: str, subtype: str | None) -> set[str]:
    if subtype is None:
        # Safe fallback when subtype is omitted.
        return {"refund"} if dispute_type == "delivery" else {"refund"}
    return ALLOWED_PREFERENCES_BY_SUBTYPE.get(subtype, {"refund"})


def default_preference_for(dispute_type: str, subtype: str | None) -> str:
    allowed = allowed_preferences_for(dispute_type, subtype)
    if "refund" in allowed:
        return "refund"
    if "return" in allowed:
        return "return"
    return next(iter(allowed))


def is_known_subtype(subtype: str | None) -> bool:
    return subtype in CANONICAL_DISPUTE_SUBTYPE_TO_TYPE


@dataclass
class WindowBasis:
    basis: str
    date: datetime | None


def _to_datetime(value: object) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except Exception:
        return None


def choose_window_basis_dates(candidates: Iterable[tuple[str, object]]) -> WindowBasis:
    for name, value in candidates:
        parsed = _to_datetime(value)
        if parsed is not None:
            return WindowBasis(basis=name, date=parsed)
    return WindowBasis(basis="none", date=None)


def days_since(when: datetime | None, now: datetime | None = None) -> int | None:
    if when is None:
        return None
    cursor = now or datetime.now(timezone.utc)
    aware_when = when if when.tzinfo else when.replace(tzinfo=timezone.utc)
    aware_now = cursor if cursor.tzinfo else cursor.replace(tzinfo=timezone.utc)
    return max(0, (aware_now.date() - aware_when.date()).days)
