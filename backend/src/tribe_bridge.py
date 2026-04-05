"""Utilities that map TRIBE v2 outputs into project-level cognitive metrics."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Protocol

from backend.src.models import BrainRegionActivation, BrainResponse, CognitiveMetrics


class TribeAdapterError(ValueError):
    """Raised when a TRIBE adapter output is invalid for bridge mapping."""


@dataclass(frozen=True)
class TribeRoiTimeseries:
    """Canonical TRIBE adapter payload consumed by the bridge."""

    attention: list[float]
    memory: list[float]
    emotion: list[float]
    load: list[float]


class TribeAdapter(Protocol):
    """Strict adapter contract for TRIBE-style ROI predictions."""

    def predict_roi_timeseries(self, text: str, segment_count: int) -> TribeRoiTimeseries:
        """Return ROI timeseries for attention/memory/emotion/load."""


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _normalize_series(values: list[float], name: str) -> list[float]:
    if not isinstance(values, list) or not values:
        raise TribeAdapterError(f"'{name}' must be a non-empty list of numbers.")
    normalized: list[float] = []
    for idx, value in enumerate(values):
        if not isinstance(value, (int, float)):
            raise TribeAdapterError(f"'{name}[{idx}]' is not numeric.")
        normalized.append(_clamp(float(value), 0.0, 1.0))
    return normalized


def validate_roi_timeseries(payload: TribeRoiTimeseries) -> TribeRoiTimeseries:
    """Validate and normalize adapter output into canonical bounds."""
    attention = _normalize_series(payload.attention, "attention")
    memory = _normalize_series(payload.memory, "memory")
    emotion = _normalize_series(payload.emotion, "emotion")
    load = _normalize_series(payload.load, "load")
    return TribeRoiTimeseries(
        attention=attention,
        memory=memory,
        emotion=emotion,
        load=load,
    )


def fetch_roi_timeseries_from_adapter(adapter: TribeAdapter, text: str, segment_count: int) -> TribeRoiTimeseries:
    """Call adapter and return validated canonical ROI timeseries."""
    if segment_count <= 0:
        raise TribeAdapterError("segment_count must be >= 1.")
    raw = adapter.predict_roi_timeseries(text=text, segment_count=segment_count)
    if not isinstance(raw, TribeRoiTimeseries):
        raise TribeAdapterError("Adapter must return TribeRoiTimeseries.")
    return validate_roi_timeseries(raw)


def _chunk_average(values: list[float], segments: int) -> list[float]:
    if segments <= 0:
        raise TribeAdapterError("segment_count must be >= 1 for chunking.")
    if not values:
        raise TribeAdapterError("Timeseries cannot be empty.")
    chunked: list[float] = []
    for idx in range(segments):
        start = int(idx * len(values) / segments)
        end = int((idx + 1) * len(values) / segments)
        if end <= start:
            end = min(len(values), start + 1)
        chunk = values[start:end]
        chunked.append(_clamp(mean(chunk), 0.0, 1.0))
    return chunked


def classify_attention_flow(values: list[float]) -> str:
    """Classify attention-curve shape from per-segment scores.

    Shapes:
      rising   — attention increases from start to end (good for CTA-ending ads)
      falling  — attention decreases from start to end
      u_shaped — attention dips in the middle then recovers (emotional arc)
      flat     — no clear trend

    FIX: The original u-shaped check was inverted. U-shaped means the middle is
    LOWER than the endpoints (a valley), not higher. Previous code checked
    mid + 0.06 < (first + last) / 2 which catches when mid is already below
    average, but the rising/falling checks must come first so a strong monotonic
    trend is not misclassified as u-shaped.
    """
    if len(values) < 2:
        return "flat"

    first = values[0]
    last = values[-1]

    # For u-shaped, use the true midpoint of the curve
    mid_idx = len(values) // 2
    mid = values[mid_idx]
    endpoints_avg = (first + last) / 2.0

    # Rising: last is meaningfully higher than first
    if last - first > 0.08:
        return "rising"

    # Falling: first is meaningfully higher than last
    if first - last > 0.08:
        return "falling"

    # U-shaped: midpoint is notably LOWER than both endpoints
    # (valley shape — dip in the middle)
    if endpoints_avg - mid > 0.07:
        return "u_shaped"

    return "flat"


def build_brain_response_from_roi_means(
    attention_mean: float,
    memory_mean: float,
    emotion_mean: float,
    load_mean: float,
    attention_map: list[float],
    memory_map: list[float],
    emotion_map: list[float],
    load_map: list[float],
    source: str = "tribev2",
) -> BrainResponse:
    """Build normalized region activations from ROI-level means."""
    regions = [
        BrainRegionActivation(
            region_name="V1",
            activation_level=_clamp(attention_mean, 0.0, 1.0),
            cognitive_function="visual_attention",
        ),
        BrainRegionActivation(
            region_name="PEF",
            activation_level=_clamp(attention_mean * 0.93, 0.0, 1.0),
            cognitive_function="attention_control",
        ),
        BrainRegionActivation(
            region_name="Hippocampus",
            activation_level=_clamp(memory_mean, 0.0, 1.0),
            cognitive_function="memory_encoding",
        ),
        BrainRegionActivation(
            region_name="Amygdala",
            activation_level=_clamp(emotion_mean, 0.0, 1.0),
            cognitive_function="emotional_processing",
        ),
        BrainRegionActivation(
            region_name="IFSa",
            activation_level=_clamp(load_mean, 0.0, 1.0),
            cognitive_function="cognitive_control",
        ),
    ]
    return BrainResponse(
        source="tribev2" if source == "tribev2" else "parametric",
        region_activations=regions,
        cortical_attention_map=attention_map,
        cortical_memory_map=memory_map,
        cortical_emotion_map=emotion_map,
        cortical_load_map=load_map,
    )


def map_tribe_roi_timeseries_to_metrics(
    *,
    attention_timeseries: list[float],
    memory_timeseries: list[float],
    emotion_timeseries: list[float],
    load_timeseries: list[float],
    segment_count: int,
    source: str = "tribev2",
) -> CognitiveMetrics:
    """Convert TRIBE v2 ROI timeseries into project cognitive metrics."""
    if segment_count <= 0:
        raise TribeAdapterError("segment_count must be >= 1.")
    attention_scores = _chunk_average(attention_timeseries, segment_count)
    memory_scores = _chunk_average(memory_timeseries, segment_count)
    emotion_scores = _chunk_average(emotion_timeseries, segment_count)
    load_scores = _chunk_average(load_timeseries, segment_count)

    attention_mean = _clamp(mean(attention_scores) if attention_scores else 0.0, 0.0, 1.0)
    memory_mean = _clamp(mean(memory_scores) if memory_scores else 0.0, 0.0, 1.0)
    emotion_mean = _clamp(mean(emotion_scores) if emotion_scores else 0.0, 0.0, 1.0)
    load_mean = _clamp(mean(load_scores) if load_scores else 0.0, 0.0, 1.0)

    emotional_valence = _clamp((emotion_mean - 0.5) * 2.0, -1.0, 1.0)
    engagement_score = _clamp(
        attention_mean * 0.42 + memory_mean * 0.34 + emotion_mean * 0.19 - load_mean * 0.14,
        0.0,
        1.0,
    )

    brain = build_brain_response_from_roi_means(
        attention_mean=attention_mean,
        memory_mean=memory_mean,
        emotion_mean=emotion_mean,
        load_mean=load_mean,
        attention_map=attention_scores,
        memory_map=memory_scores,
        emotion_map=emotion_scores,
        load_map=load_scores,
        source=source,
    )

    return CognitiveMetrics(
        attention_scores=attention_scores,
        memory_retention=memory_scores,
        cognitive_load=load_mean,
        emotional_valence=emotional_valence,
        engagement_score=engagement_score,
        attention_flow=classify_attention_flow(attention_scores),  # type: ignore[arg-type]
        simulation_source="tribev2" if source == "tribev2" else "parametric",
        brain_response=brain,
    )