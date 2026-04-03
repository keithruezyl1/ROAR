from __future__ import annotations

import base64
import hashlib
import imghdr
import logging
import os
import re
import struct
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile

from api.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PROOF_UPLOADS = 2
MAX_FILE_SIZE = 10 * 1024 * 1024
MIN_IMAGE_DIMENSION = 200
MAX_IMAGE_DIMENSION = 4096
PROOF_ANALYSIS_MODEL = os.getenv("ROAR_PROOF_ANALYSIS_MODEL", "gpt-4o-mini")

INVALID_REASON_CODES = {
    "outside_return_window",
    "prior_refund_exists",
    "payment_not_confirmed",
    "non_returnable_item",
    "insufficient_proof",
    "proof_contradicts_claim",
    "tracking_shows_delivered",
    "amount_exceeds_limit",
    "unsupported_resolution_type",
    "policy_exception_requires_human_review",
}

HIGH_PRIORITY_APPEAL_CODES = {
    "insufficient_proof",
    "proof_contradicts_claim",
    "tracking_shows_delivered",
}

DEFAULT_PROOF_REQUIRED_SUBTYPES = {
    "damaged_goods",
    "wrong_item",
    "not_as_described",
    "partial_fulfillment",
}


def requires_proof_for_case(
    dispute_subtype: str | None,
    policy_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    subtype = str(dispute_subtype or "").strip().lower()
    required_subtypes = set(DEFAULT_PROOF_REQUIRED_SUBTYPES)

    if isinstance(policy_context, dict):
        rules = policy_context.get("required_subtypes")
        if isinstance(rules, list):
            required_subtypes = {str(v).strip().lower() for v in rules if str(v).strip()}

    required = subtype in required_subtypes
    return {
        "required": required,
        "reason": "policy_required_for_subtype" if required else "not_required_for_subtype",
        "required_subtypes": sorted(required_subtypes),
    }


def get_appeal_priority(invalid_reason_code: str | None) -> str:
    code = str(invalid_reason_code or "").strip().lower()
    return "urgent" if code in HIGH_PRIORITY_APPEAL_CODES else "normal"


def get_customer_invalid_reason_message(code: str | None, detail: str | None = None) -> str:
    normalized = str(code or "").strip().lower()
    label_map = {
        "outside_return_window": "This case falls outside the allowed return or refund window.",
        "prior_refund_exists": "A prior refund already exists for this order, so this case cannot be auto-processed.",
        "payment_not_confirmed": "We could not confirm payment for this order.",
        "non_returnable_item": "This item is not eligible for return under current policy.",
        "insufficient_proof": "The uploaded proof does not provide enough evidence to support this claim yet.",
        "proof_contradicts_claim": "The uploaded proof appears inconsistent with the reported issue.",
        "tracking_shows_delivered": "Tracking records show the parcel as delivered, so this case needs your decision before escalation.",
        "amount_exceeds_limit": "This case exceeds the current automatic handling limits.",
        "unsupported_resolution_type": "The requested resolution is not supported for this dispute type.",
        "policy_exception_requires_human_review": "This case falls under a policy exception and cannot continue automatically.",
    }
    base = label_map.get(normalized, "This case cannot continue automatically under current policy.")
    if detail:
        return f"{base} {detail}".strip()
    return base


@dataclass
class ValidatedProofUpload:
    filename: str
    content_type: str
    byte_size: int
    sha256: str
    image_width: int
    image_height: int
    image_data: bytes


def _png_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return int(width), int(height)


def _gif_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 10 or data[:6] not in (b"GIF87a", b"GIF89a"):
        return None
    width, height = struct.unpack("<HH", data[6:10])
    return int(width), int(height)


def _webp_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    return None


def _jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return None
    index = 2
    while index < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        while index < len(data) and data[index] == 0xFF:
            index += 1
        if index >= len(data):
            break
        marker = data[index]
        index += 1
        if marker in {0xD8, 0xD9}:
            continue
        if index + 2 > len(data):
            break
        length = struct.unpack(">H", data[index:index + 2])[0]
        if length < 2 or index + length > len(data):
            break
        if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
            if index + 7 > len(data):
                break
            height, width = struct.unpack(">HH", data[index + 3:index + 7])
            return int(width), int(height)
        index += length
    return None


def detect_image_dimensions(data: bytes, content_type: str) -> tuple[int, int]:
    parsers = (
        _png_dimensions,
        _jpeg_dimensions,
        _webp_dimensions,
        _gif_dimensions,
    )
    for parser in parsers:
        dims = parser(data)
        if dims:
            return dims
    kind = imghdr.what(None, h=data)
    raise HTTPException(status_code=422, detail=f"Unable to determine image dimensions for upload type '{content_type}' ({kind or 'unknown'})")


async def validate_proof_upload(file: UploadFile) -> ValidatedProofUpload:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {file.content_type}")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    if len(payload) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail=f"File too large. Max size is {MAX_FILE_SIZE} bytes")

    width, height = detect_image_dimensions(payload, file.content_type or "")
    if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
        raise HTTPException(status_code=422, detail=f"Image too small. Minimum size is {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION}")
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise HTTPException(status_code=422, detail=f"Image too large. Maximum size is {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION}")

    digest = hashlib.sha256(payload).hexdigest()
    return ValidatedProofUpload(
        filename=file.filename or "proof-upload",
        content_type=file.content_type or "application/octet-stream",
        byte_size=len(payload),
        sha256=digest,
        image_width=width,
        image_height=height,
        image_data=payload,
    )


def build_proof_analysis_prompt(
    dispute_subtype: str | None,
    customer_claim: str | None,
    ordered_items: list[dict[str, Any]] | None,
    image_count: int,
) -> str:
    return (
        "You are analyzing customer-uploaded proof for a retail dispute resolution system.\n\n"
        f"Dispute subtype: {dispute_subtype or 'unknown'}\n"
        f"Customer claim: {customer_claim or 'unknown'}\n"
        f"Ordered items: {ordered_items or []}\n"
        f"Image count: {image_count}\n\n"
        "For not_as_described disputes, compare the visible product against the ordered items and record any visible "
        "brand, product-line, variant, roast, flavor, size, weight, packaging, or quantity mismatch in "
        "not_as_described_signals.differences.\n"
        "If the visible item appears to be the same general item category but with clearly different brand, variant, "
        "or size/weight than ordered, set not_as_described_signals.detected to true.\n"
        "If the image shows a completely different product than ordered, use wrong_item_signals.detected = true.\n\n"
        "Return only valid JSON with this schema:\n"
        "{"
        '"proof_present": boolean,'
        '"image_count": number,'
        '"items_visible": ["string"],'
        '"observations": ["string"],'
        '"damage_detected": {"visible": boolean, "type": "physical_damage|packaging_damage|none", "severity": "minor|moderate|severe|none", "description": "string"},'
        '"wrong_item_signals": {"detected": boolean, "differences": ["string"]},'
        '"missing_item_signals": {"detected": boolean, "empty_packaging": boolean},'
        '"not_as_described_signals": {"detected": boolean, "differences": ["string"]},'
        '"confidence": number,'
        '"limitations": "string",'
        '"analysis_version": "v1",'
        f'"model": "{PROOF_ANALYSIS_MODEL}"'
        "}\n\n"
        "Only describe factual observations visible in the images. Do not decide whether the case is valid."
    )


def _normalize_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _extract_weight_tokens(value: Any) -> set[str]:
    text = _normalize_text(value)
    tokens: set[str] = set()
    for match in re.finditer(r"(\d+(?:\.\d+)?)\s*(kg|g|gram|grams)", text):
        amount = match.group(1)
        unit = match.group(2)
        if unit in {"gram", "grams"}:
            unit = "g"
        elif unit == "kg":
            unit = "kg"
        tokens.add(f"{amount}{unit}")
    return tokens


def _extract_order_item_texts(ordered_items: list[dict[str, Any]] | None) -> list[str]:
    if not isinstance(ordered_items, list):
        return []
    texts: list[str] = []
    for item in ordered_items:
        if not isinstance(item, dict):
            continue
        for key in ("product_name", "item_name", "name", "title", "sku", "item_id"):
            value = item.get(key)
            if value:
                texts.append(str(value))
    return texts


COMPARISON_STOPWORDS = {
    "a",
    "an",
    "and",
    "bag",
    "box",
    "can",
    "canister",
    "coffee",
    "container",
    "dark",
    "flavor",
    "g",
    "gold",
    "grams",
    "ground",
    "in",
    "instant",
    "medium",
    "of",
    "original",
    "premium",
    "product",
    "roast",
    "shown",
    "the",
    "whole",
}


def _extract_comparison_tokens(value: Any) -> set[str]:
    return {
        token
        for token in _normalize_text(value).split()
        if token and token not in COMPARISON_STOPWORDS and not token.isdigit()
    }


def _postprocess_proof_analysis(
    data: dict[str, Any],
    *,
    dispute_subtype: str | None,
    ordered_items: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    subtype = str(dispute_subtype or "").strip().lower()
    if subtype not in {"not_as_described", "wrong_item"}:
        return data

    ordered_texts = _extract_order_item_texts(ordered_items)
    if not ordered_texts:
        return data

    ordered_normalized = " ".join(_normalize_text(text) for text in ordered_texts if text)
    ordered_weight_tokens = set().union(*(_extract_weight_tokens(text) for text in ordered_texts))

    visible_texts = [
        *[str(v) for v in data.get("items_visible", []) if v],
        *[str(v) for v in data.get("observations", []) if v],
    ]
    visible_normalized = " ".join(_normalize_text(text) for text in visible_texts if text)
    visible_weight_tokens = set().union(*(_extract_weight_tokens(text) for text in visible_texts))
    ordered_tokens = set().union(*(_extract_comparison_tokens(text) for text in ordered_texts))
    visible_tokens = set().union(*(_extract_comparison_tokens(text) for text in visible_texts))
    shared_tokens = ordered_tokens.intersection(visible_tokens)
    ordered_unique = ordered_tokens.difference(visible_tokens)
    visible_unique = visible_tokens.difference(ordered_tokens)

    def _ensure_difference_list(key: str) -> list[str]:
        differences = data.setdefault(key, {}).setdefault("differences", [])
        if not isinstance(differences, list):
            differences = []
            data[key]["differences"] = differences
        return differences

    not_as_described_differences = _ensure_difference_list("not_as_described_signals")
    wrong_item_differences = _ensure_difference_list("wrong_item_signals")

    def add_difference(target: list[str], message: str) -> None:
        if message not in target:
            target.append(message)

    def add_shared_difference(message: str) -> None:
        add_difference(not_as_described_differences, message)
        if subtype == "wrong_item":
            add_difference(wrong_item_differences, message)

    ordered_has_nescafe = "nescafe" in ordered_normalized
    visible_has_nescafe = "nescafe" in visible_normalized
    ordered_has_mccafe = "mccafe" in ordered_normalized or "mc cafe" in ordered_normalized
    visible_has_mccafe = "mccafe" in visible_normalized or "mc cafe" in visible_normalized

    if ordered_has_nescafe and visible_has_mccafe:
        add_shared_difference("Visible brand appears to be McCafe while the ordered item is Nescafe.")
    if ordered_has_mccafe and visible_has_nescafe:
        add_shared_difference("Visible brand appears to be Nescafe while the ordered item is McCafe.")

    if ordered_weight_tokens and visible_weight_tokens and ordered_weight_tokens != visible_weight_tokens:
        add_shared_difference(
            "Visible weight/size appears different from the ordered item "
            f"({', '.join(sorted(visible_weight_tokens))} visible vs {', '.join(sorted(ordered_weight_tokens))} ordered)."
        )

    if "whole beans" in visible_normalized and "whole beans" not in ordered_normalized:
        add_shared_difference("Visible product appears to be whole beans, which differs from the ordered item description.")
    if "dark roast" in visible_normalized and "dark roast" not in ordered_normalized:
        add_shared_difference("Visible roast/variant appears different from the ordered item description.")
    if "medium dark roast" in visible_normalized and "medium dark roast" not in ordered_normalized:
        add_shared_difference("Visible roast/variant appears different from the ordered item description.")

    if ordered_unique and visible_unique and len(shared_tokens) <= 1:
        ordered_summary = ", ".join(sorted(ordered_unique)[:3]) or "ordered descriptors"
        visible_summary = ", ".join(sorted(visible_unique)[:3]) or "visible descriptors"
        add_shared_difference(
            f"Visible product descriptors differ from the ordered item ({visible_summary} visible vs {ordered_summary} ordered)."
        )

    if subtype == "not_as_described" and not_as_described_differences:
        data["not_as_described_signals"]["detected"] = True

    if subtype == "wrong_item":
        strong_wrong_item_signal = (
            (ordered_has_nescafe and visible_has_mccafe)
            or (ordered_has_mccafe and visible_has_nescafe)
            or (ordered_unique and visible_unique and len(shared_tokens) == 0)
        )
        if strong_wrong_item_signal and wrong_item_differences:
            data["wrong_item_signals"]["detected"] = True

    return data


async def analyze_proof_images(
    *,
    dispute_subtype: str | None,
    customer_claim: str | None,
    ordered_items: list[dict[str, Any]] | None,
    uploads: list[Any],
    max_retries: int = 2,
) -> dict[str, Any]:
    if not uploads:
        return {
            "proof_present": False,
            "image_count": 0,
            "items_visible": [],
            "observations": [],
            "damage_detected": {"visible": False, "type": "none", "severity": "none", "description": ""},
            "wrong_item_signals": {"detected": False, "differences": []},
            "missing_item_signals": {"detected": False, "empty_packaging": False},
            "not_as_described_signals": {"detected": False, "differences": []},
            "confidence": 0,
            "limitations": "No proof uploads were provided.",
            "analysis_version": "v1",
            "model": PROOF_ANALYSIS_MODEL,
        }

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    prompt = build_proof_analysis_prompt(dispute_subtype, customer_claim, ordered_items, len(uploads))
    content = [{"type": "text", "text": "Analyze these uploaded proof images."}]
    for upload in uploads:
        mime = getattr(upload, "content_type", "image/jpeg")
        raw = getattr(upload, "image_data", b"")
        data_url = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
        content.append({"type": "image_url", "image_url": {"url": data_url}})

    payload = {
        "model": PROOF_ANALYSIS_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": content},
        ],
        "temperature": 0,
        "max_tokens": 900,
    }

    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                body = response.json()
            raw = body["choices"][0]["message"]["content"]
            if isinstance(raw, list):
                raw = "".join(part.get("text", "") for part in raw if isinstance(part, dict))
            import json
            data = json.loads(raw)
            data.setdefault("analysis_version", "v1")
            data.setdefault("model", PROOF_ANALYSIS_MODEL)
            return _postprocess_proof_analysis(
                data,
                dispute_subtype=dispute_subtype,
                ordered_items=ordered_items,
            )
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt >= max_retries:
                break
    assert last_error is not None
    logger.exception("Proof analysis failed after retries")
    raise last_error
