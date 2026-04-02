"""Simulation entrypoints for TRIBE v2-backed and parametric cognitive scoring."""

from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

from src.models import (
    AdScenario,
    BrainRegionActivation,
    BrainResponse,
    CognitiveMetrics,
)
from src.tribe_bridge import (
    TribeAdapter,
    TribeAdapterError,
    classify_attention_flow,
    fetch_roi_timeseries_from_adapter,
    map_tribe_roi_timeseries_to_metrics,
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


DEFAULT_COEFFICIENTS = {
    "attention": {
        "base": 0.40,
        "position_bonus_top2": 0.06,
        "hook_bonus": 0.10,
        "number_bonus": 0.05,
        "question_bonus": 0.06,
        "emphasis_bonus_per_level": 0.03,
        "complexity_penalty": 0.18,
        "pacing_fast_bonus": 0.03,
        "pacing_slow_penalty": 0.02,
    },
    "memory": {
        "base": 0.20,
        "attention_weight": 0.46,
        "emotion_weight": 0.24,
        "testimonial_or_data_bonus": 0.04,
        "emphasis_weight": 0.60,
        "complexity_penalty": 0.10,
    },
    "load": {
        "base": 0.30,
        "avg_complexity_weight": 0.44,
        "extra_segment_weight": 0.03,
        "avg_emphasis_weight": 0.16,
        "extra_segment_threshold": 5,
    },
    "emotional_valence": {
        "avg_emotion_offset": 0.35,
        "avg_emotion_weight": 1.60,
    },
    "engagement": {
        "attention_weight": 0.42,
        "memory_weight": 0.33,
        "emotion_weight": 0.18,
        "load_penalty": 0.15,
    },
}


def _default_coeff_path() -> Path:
    return Path(__file__).resolve().parents[1] / "calibration" / "coefficients.v1.json"


def load_parametric_coefficients(coeff_path: str | Path | None = None) -> dict:
    """Load coefficients from JSON, falling back to embedded defaults."""
    path = Path(coeff_path) if coeff_path else _default_coeff_path()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return DEFAULT_COEFFICIENTS
    coefficients = data.get("coefficients")
    if not isinstance(coefficients, dict):
        return DEFAULT_COEFFICIENTS
    return coefficients


def _build_parametric_brain_response(
    attention_scores: list[float],
    memory_scores: list[float],
    emotional_valence: float,
    load: float,
) -> BrainResponse:
    visual = _clamp(mean(attention_scores), 0.0, 1.0)
    memory = _clamp(mean(memory_scores), 0.0, 1.0)
    emotion = _clamp((emotional_valence + 1.0) / 2.0, 0.0, 1.0)
    control = _clamp(load, 0.0, 1.0)

    regions = [
        BrainRegionActivation(
            region_name="V1",
            activation_level=visual,
            cognitive_function="visual_attention",
        ),
        BrainRegionActivation(
            region_name="PEF",
            activation_level=_clamp(visual * 0.94, 0.0, 1.0),
            cognitive_function="attention_control",
        ),
        BrainRegionActivation(
            region_name="Hippocampus",
            activation_level=memory,
            cognitive_function="memory_encoding",
        ),
        BrainRegionActivation(
            region_name="Amygdala",
            activation_level=emotion,
            cognitive_function="emotional_processing",
        ),
        BrainRegionActivation(
            region_name="IFSa",
            activation_level=control,
            cognitive_function="cognitive_control",
        ),
    ]
    return BrainResponse(
        source="parametric",
        region_activations=regions,
        cortical_attention_map=attention_scores,
        cortical_memory_map=memory_scores,
        cortical_emotion_map=[emotion] * len(attention_scores),
        cortical_load_map=[control] * len(attention_scores),
    )


def simulate_parametric(scenario: AdScenario, coefficients: dict | None = None) -> CognitiveMetrics:
    """Deterministic cognitive simulator used for baseline and CPU fallback."""
    coeff = coefficients or load_parametric_coefficients()
    attention_c = coeff["attention"]
    memory_c = coeff["memory"]
    load_c = coeff["load"]
    valence_c = coeff["emotional_valence"]
    engagement_c = coeff["engagement"]

    attention_scores: list[float] = []
    memory_retention: list[float] = []

    for idx, seg in enumerate(scenario.segments):
        position_bonus = attention_c["position_bonus_top2"] if idx < 2 else 0.0
        hook_bonus = attention_c["hook_bonus"] if seg.segment_type == "hook" else 0.0
        data_bonus = attention_c["number_bonus"] if seg.has_number else 0.0
        question_bonus = attention_c["question_bonus"] if seg.has_question else 0.0
        emphasis_bonus = attention_c["emphasis_bonus_per_level"] * seg.emphasis_level
        complexity_penalty = attention_c["complexity_penalty"] * seg.complexity_score
        pacing_bonus = {
            "fast": attention_c["pacing_fast_bonus"],
            "medium": 0.0,
            "slow": -attention_c["pacing_slow_penalty"],
        }[seg.pacing]
        attention = _clamp(
            attention_c["base"]
            + position_bonus
            + hook_bonus
            + data_bonus
            + question_bonus
            + emphasis_bonus
            + pacing_bonus
            - complexity_penalty,
            0.0,
            1.0,
        )
        attention_scores.append(attention)

        memory = _clamp(
            memory_c["base"]
            + attention * memory_c["attention_weight"]
            + seg.emotional_intensity * memory_c["emotion_weight"]
            + (
                memory_c["testimonial_or_data_bonus"]
                if seg.segment_type in {"testimonial", "data"}
                else 0.0
            )
            + emphasis_bonus * memory_c["emphasis_weight"]
            - seg.complexity_score * memory_c["complexity_penalty"],
            0.0,
            1.0,
        )
        memory_retention.append(memory)

    avg_complexity = mean(seg.complexity_score for seg in scenario.segments)
    avg_emotion = mean(seg.emotional_intensity for seg in scenario.segments)
    avg_emphasis = mean(seg.emphasis_level for seg in scenario.segments) / 3.0

    cognitive_load = _clamp(
        load_c["base"]
        + avg_complexity * load_c["avg_complexity_weight"]
        + max(0, len(scenario.segments) - load_c["extra_segment_threshold"]) * load_c["extra_segment_weight"]
        + avg_emphasis * load_c["avg_emphasis_weight"],
        0.0,
        1.0,
    )
    emotional_valence = _clamp(
        (avg_emotion - valence_c["avg_emotion_offset"]) * valence_c["avg_emotion_weight"],
        -1.0,
        1.0,
    )
    engagement_score = _clamp(
        mean(attention_scores) * engagement_c["attention_weight"]
        + mean(memory_retention) * engagement_c["memory_weight"]
        + _clamp((emotional_valence + 1.0) / 2.0, 0.0, 1.0) * engagement_c["emotion_weight"]
        - cognitive_load * engagement_c["load_penalty"],
        0.0,
        1.0,
    )
    attention_flow = classify_attention_flow(attention_scores)
    brain_response = _build_parametric_brain_response(
        attention_scores=attention_scores,
        memory_scores=memory_retention,
        emotional_valence=emotional_valence,
        load=cognitive_load,
    )

    return CognitiveMetrics(
        attention_scores=attention_scores,
        memory_retention=memory_retention,
        cognitive_load=cognitive_load,
        emotional_valence=emotional_valence,
        engagement_score=engagement_score,
        attention_flow=attention_flow,  # type: ignore[arg-type]
        simulation_source="parametric",
        brain_response=brain_response,
    )


def simulate_with_tribev2(
    scenario: AdScenario,
    tribe_model: object | None = None,
    adapter: TribeAdapter | None = None,
    coefficients: dict | None = None,
) -> CognitiveMetrics:
    """TRIBE v2 path placeholder.

    Until model integration lands, this returns calibrated parametric scores while
    preserving a clear extension point for the GPU-backed path.
    """
    fallback_metrics = simulate_parametric(scenario, coefficients=coefficients)
    if adapter is None or tribe_model is None:
        return fallback_metrics

    segment_count = len(scenario.segments)
    prompt_text = " ".join(seg.content for seg in scenario.segments)

    try:
        _ = tribe_model
        roi = fetch_roi_timeseries_from_adapter(adapter, text=prompt_text, segment_count=segment_count)
    except (TribeAdapterError, Exception):
        return fallback_metrics

    return map_tribe_roi_timeseries_to_metrics(
        attention_timeseries=roi.attention,
        memory_timeseries=roi.memory,
        emotion_timeseries=roi.emotion,
        load_timeseries=roi.load,
        segment_count=segment_count,
        source="tribev2",
    )
