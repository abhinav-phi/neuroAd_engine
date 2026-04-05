"""Simulation entrypoints for TRIBE v2-backed and parametric cognitive scoring.

Member B ownership. This module is the 'physics engine' of the environment.
All functions are deterministic: given the same AdScenario, you always get
the same CognitiveMetrics back. Randomness lives only in reset(), not here.

Scientific grounding:
  - Serial Position Effect   (Murdock 1962): primacy and recency segments
                              get attention boosts
  - Cognitive Load Theory    (Sweller 1988): complexity drains working memory
  - Atkinson-Shiffrin Model  (1968): memory encoding is gated by attention
                              and emotion
  - Somatic Marker Hypothesis (Damasio): emotional intensity aids recall and
                              tags content as meaningful
"""

from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

from backend.src.models import (
    AdScenario,
    AdSegment,
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


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


# ---------------------------------------------------------------------------
# Default coefficients (embedded so the module works without a JSON file)
# ---------------------------------------------------------------------------

DEFAULT_COEFFICIENTS: dict = {
    "attention": {
        # Serial Position Effect: primacy boost for top-2 positions
        "base": 0.40,
        "position_bonus_top2": 0.06,   # primacy boost
        "position_bonus_last": 0.04,   # recency boost (last segment)
        "hook_bonus": 0.10,            # hook segment type is designed to grab attention
        "hook_primacy_synergy": 0.03,  # extra gain when a hook is placed in top-2
        "number_bonus": 0.05,          # numeric evidence anchors attention (Kahneman)
        "question_bonus": 0.06,        # open questions create cognitive engagement
        "emphasis_bonus_per_level": 0.03,
        "complexity_penalty": 0.18,    # high complexity drains attention
        "pacing_fast_bonus": 0.03,
        "pacing_slow_penalty": 0.02,
    },
    "memory": {
        # Atkinson-Shiffrin: attention + emotional intensity gate encoding
        "base": 0.20,
        "attention_weight": 0.46,
        "emotion_weight": 0.24,
        "testimonial_or_data_bonus": 0.04,  # episodic + semantic anchors
        "emphasis_weight": 0.60,             # salience amplifies encoding
        "complexity_penalty": 0.10,          # high load competes with encoding
        "primacy_bonus": 0.05,               # first 2 segments encoded stronger
        "recency_bonus": 0.04,               # last segment still in working memory
    },
    "load": {
        # Cognitive Load Theory: complexity × count vs. working-memory capacity
        "base": 0.30,
        "avg_complexity_weight": 0.44,
        "extra_segment_weight": 0.03,   # each segment beyond threshold costs
        "avg_emphasis_weight": 0.16,    # heavy styling adds visual processing cost
        "extra_segment_threshold": 5,
    },
    "emotional_valence": {
        # Simple offset-and-scale: raw emotion 0.35 maps to valence ≈ 0
        "avg_emotion_offset": 0.35,
        "avg_emotion_weight": 1.60,
    },
    "engagement": {
        # Composite: attention + memory drive engagement; load penalises it
        "attention_weight": 0.42,
        "memory_weight": 0.33,
        "emotion_weight": 0.18,
        "load_penalty": 0.15,
    },
}


# ---------------------------------------------------------------------------
# Coefficient loading
# ---------------------------------------------------------------------------

def _default_coeff_path() -> Path:
    return Path(__file__).resolve().parents[1] / "calibration" / "coefficients.v1.json"


def load_parametric_coefficients(coeff_path: str | Path | None = None) -> dict:
    """Load coefficients from JSON, falling back to embedded defaults.

    Falls back silently so that the simulator always works — even without
    the calibration artifact on disk.
    """
    path = Path(coeff_path) if coeff_path else _default_coeff_path()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return DEFAULT_COEFFICIENTS
    coefficients = data.get("coefficients")
    if not isinstance(coefficients, dict):
        return DEFAULT_COEFFICIENTS
    return coefficients


# ---------------------------------------------------------------------------
# Per-segment attention scorer
# ---------------------------------------------------------------------------

def _compute_attention_score(
    seg_idx: int,
    total_segments: int,
    segment,   # AdSegment
    attention_c: dict,
) -> float:
    """Compute attention score for a single segment.

    Implements:
      - Serial Position Effect: primacy (top-2) and recency (last) bonus
      - Hook segment gets extra grab bonus
      - Numeric/question content hooks cognitive engagement
      - Emphasis and pacing modifiers
      - Complexity penalty (high complexity degrades voluntary attention)

    FIX: hook_primacy_synergy was previously added separately to hook_bonus
    but the hook_bonus itself already applies when segment_type == hook.
    The synergy now ONLY fires when the hook is also in primacy position,
    creating a meaningful incentive to place hooks early.
    """
    position_bonus = 0.0
    if seg_idx < 2:
        position_bonus = attention_c["position_bonus_top2"]  # primacy
    elif seg_idx == total_segments - 1:
        position_bonus = attention_c.get("position_bonus_last", 0.04)  # recency

    is_hook = segment.segment_type == "hook"
    hook_bonus = attention_c["hook_bonus"] if is_hook else 0.0

    # Synergy: hook in primacy position is extra powerful (not double-counted)
    hook_primacy_bonus = (
        attention_c.get("hook_primacy_synergy", 0.03)
        if is_hook and seg_idx < 2
        else 0.0
    )

    number_bonus = attention_c["number_bonus"] if segment.has_number else 0.0
    question_bonus = attention_c["question_bonus"] if segment.has_question else 0.0
    emphasis_bonus = attention_c["emphasis_bonus_per_level"] * segment.emphasis_level
    complexity_penalty = attention_c["complexity_penalty"] * segment.complexity_score
    pacing_bonus = {
        "fast": attention_c["pacing_fast_bonus"],
        "medium": 0.0,
        "slow": -attention_c["pacing_slow_penalty"],
    }[segment.pacing]

    raw = (
        attention_c["base"]
        + position_bonus
        + hook_bonus
        + hook_primacy_bonus
        + number_bonus
        + question_bonus
        + emphasis_bonus
        + pacing_bonus
        - complexity_penalty
    )
    return _clamp(raw, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Per-segment memory retention scorer
# ---------------------------------------------------------------------------

def _compute_memory_score(
    seg_idx: int,
    total_segments: int,
    segment,           # AdSegment
    attention_score: float,
    memory_c: dict,
) -> float:
    """Compute memory retention for a single segment.

    Implements:
      - Atkinson-Shiffrin: attention × emotion gate encoding strength
      - Emphasis / salience multiplier
      - Testimonial and data segments are episodic anchors → bonus
      - Complexity drains encoding capacity
      - Primacy and recency effects (serial position on memory)
    """
    emotion_contribution = segment.emotional_intensity * memory_c["emotion_weight"]
    attention_contribution = attention_score * memory_c["attention_weight"]
    type_bonus = (
        memory_c["testimonial_or_data_bonus"]
        if segment.segment_type in {"testimonial", "data"}
        else 0.0
    )
    emphasis_contribution = (segment.emphasis_level / 3.0) * memory_c["emphasis_weight"]
    complexity_penalty = segment.complexity_score * memory_c["complexity_penalty"]

    # Serial position memory bonuses
    primacy_bonus = memory_c.get("primacy_bonus", 0.05) if seg_idx < 2 else 0.0
    recency_bonus = memory_c.get("recency_bonus", 0.04) if seg_idx == total_segments - 1 else 0.0

    raw = (
        memory_c["base"]
        + attention_contribution
        + emotion_contribution
        + type_bonus
        + emphasis_contribution
        + primacy_bonus
        + recency_bonus
        - complexity_penalty
    )
    return _clamp(raw, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Global-level metric computers
# ---------------------------------------------------------------------------

def _compute_cognitive_load(scenario: AdScenario, load_c: dict) -> float:
    """Cognitive Load Theory: complexity × count vs. working-memory capacity.

    More segments and higher average complexity both raise load.
    Heavy emphasis adds visual processing overhead.
    """
    avg_complexity = mean(seg.complexity_score for seg in scenario.segments)
    avg_emphasis = mean(seg.emphasis_level for seg in scenario.segments) / 3.0
    extra_segments = max(0, len(scenario.segments) - load_c["extra_segment_threshold"])

    raw = (
        load_c["base"]
        + avg_complexity * load_c["avg_complexity_weight"]
        + extra_segments * load_c["extra_segment_weight"]
        + avg_emphasis * load_c["avg_emphasis_weight"]
    )
    return _clamp(raw, 0.0, 1.0)


def _compute_emotional_valence(scenario: AdScenario, valence_c: dict) -> float:
    """Map average emotional intensity to a signed valence in [-1, 1].

    Damasio's Somatic Marker Hypothesis: emotional content tags memory and
    biases decision-making. We centre around 0.35 (neutral-ish) so that
    unemotional copy produces slight negative valence (cold/clinical feel)
    while emotionally warm copy is positive.
    """
    avg_emotion = mean(seg.emotional_intensity for seg in scenario.segments)
    raw = (avg_emotion - valence_c["avg_emotion_offset"]) * valence_c["avg_emotion_weight"]
    return _clamp(raw, -1.0, 1.0)


def _compute_engagement(
    attention_scores: list[float],
    memory_retention: list[float],
    emotional_valence: float,
    cognitive_load: float,
    engagement_c: dict,
) -> float:
    """Composite engagement: high attention + memory + positive emotion - load."""
    avg_attention = mean(attention_scores)
    avg_memory = mean(memory_retention)
    # Normalise valence from [-1,1] to [0,1] for the engagement formula
    normalised_valence = _clamp((emotional_valence + 1.0) / 2.0, 0.0, 1.0)

    raw = (
        avg_attention * engagement_c["attention_weight"]
        + avg_memory * engagement_c["memory_weight"]
        + normalised_valence * engagement_c["emotion_weight"]
        - cognitive_load * engagement_c["load_penalty"]
    )
    return _clamp(raw, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Public compute API (spec-facing wrappers)
# ---------------------------------------------------------------------------

def compute_attention(scenario: AdScenario, coefficients: dict | None = None) -> list[float]:
    """Compute per-segment attention scores for a scenario."""
    coeff = coefficients or load_parametric_coefficients()
    attention_c = coeff["attention"]
    n = len(scenario.segments)
    return [_compute_attention_score(idx, n, seg, attention_c) for idx, seg in enumerate(scenario.segments)]


def compute_memory(
    scenario: AdScenario,
    attention_scores: list[float] | None = None,
    coefficients: dict | None = None,
) -> list[float]:
    """Compute per-segment memory retention scores for a scenario."""
    coeff = coefficients or load_parametric_coefficients()
    memory_c = coeff["memory"]
    attn = attention_scores if attention_scores is not None else compute_attention(scenario, coefficients=coeff)
    n = len(scenario.segments)
    return [_compute_memory_score(idx, n, seg, attn[idx], memory_c) for idx, seg in enumerate(scenario.segments)]


def compute_cognitive_load(scenario: AdScenario, coefficients: dict | None = None) -> float:
    """Compute scenario-level cognitive load."""
    coeff = coefficients or load_parametric_coefficients()
    return _compute_cognitive_load(scenario, coeff["load"])


def compute_emotional_valence(scenario: AdScenario, coefficients: dict | None = None) -> float:
    """Compute scenario-level emotional valence in [-1, 1]."""
    coeff = coefficients or load_parametric_coefficients()
    return _compute_emotional_valence(scenario, coeff["emotional_valence"])


def compute_attention_flow(attention_scores: list[float]) -> str:
    """Classify attention curve shape using the fixed classifier."""
    return classify_attention_flow(attention_scores)


def compute_composite_engagement(
    attention_scores: list[float],
    memory_retention: list[float],
    cognitive_load: float,
    emotional_valence: float,
    coefficients: dict | None = None,
) -> float:
    """Compute final composite engagement score."""
    coeff = coefficients or load_parametric_coefficients()
    return _compute_engagement(
        attention_scores,
        memory_retention,
        emotional_valence,
        cognitive_load,
        coeff["engagement"],
    )


def compute_novelty(scenario: AdScenario) -> float:
    """Compute simple narrative novelty from segment-type diversity and lexical variety."""
    if not scenario.segments:
        return 0.0

    type_diversity = len({seg.segment_type for seg in scenario.segments}) / max(1, len(scenario.segments))
    words: list[str] = []
    for seg in scenario.segments:
        words.extend([w.strip(".,!?;:\"'()[]{}-").lower() for w in seg.content.split() if w.strip()])
    lexical_diversity = len(set(words)) / max(1, len(words))
    return _clamp(type_diversity * 0.55 + lexical_diversity * 0.45, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Parametric brain response builder (for observation enrichment)
# ---------------------------------------------------------------------------

def _build_parametric_brain_response(
    attention_scores: list[float],
    memory_scores: list[float],
    emotional_valence: float,
    load: float,
) -> BrainResponse:
    """Build a synthetic BrainResponse aligned to TRIBE v2 region naming."""
    visual = _clamp(mean(attention_scores), 0.0, 1.0)
    memory_mean = _clamp(mean(memory_scores), 0.0, 1.0)
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
            activation_level=memory_mean,
            cognitive_function="memory_encoding",
        ),
        BrainRegionActivation(
            region_name="TE1a",
            activation_level=_clamp(memory_mean * 0.91, 0.0, 1.0),
            cognitive_function="temporal_memory",
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
        cortical_attention_map=attention_scores[:],
        cortical_memory_map=memory_scores[:],
        cortical_emotion_map=[emotion] * len(attention_scores),
        cortical_load_map=[control] * len(attention_scores),
    )


# ---------------------------------------------------------------------------
# Main public entry points
# ---------------------------------------------------------------------------

def simulate_parametric(
    scenario: AdScenario,
    coefficients: dict | None = None,
) -> CognitiveMetrics:
    """Deterministic cognitive simulator — CPU fallback and baseline mode.

    Design guarantees:
      - Fully deterministic: same input → same output, always
      - All outputs bounded: attention/memory ∈ [0,1], valence ∈ [-1,1]
      - Brain response included for rich observation data
    """
    coeff = coefficients or load_parametric_coefficients()
    attention_scores = compute_attention(scenario, coefficients=coeff)
    memory_retention = compute_memory(scenario, attention_scores=attention_scores, coefficients=coeff)
    cognitive_load = compute_cognitive_load(scenario, coefficients=coeff)
    emotional_valence = compute_emotional_valence(scenario, coefficients=coeff)
    engagement_score = compute_composite_engagement(
        attention_scores,
        memory_retention,
        cognitive_load,
        emotional_valence,
        coefficients=coeff,
    )
    attention_flow = compute_attention_flow(attention_scores)

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
    """TRIBE v2-backed simulation with parametric fallback.

    When adapter and tribe_model are both present, this calls the adapter to
    get ROI timeseries predictions and maps them to cognitive metrics via the
    bridge. If either is absent OR the adapter raises, falls back to the
    parametric mode seamlessly.
    """
    fallback_metrics = simulate_parametric(scenario, coefficients=coefficients)
    if adapter is None or tribe_model is None:
        return fallback_metrics

    segment_count = len(scenario.segments)
    prompt_text = " ".join(seg.content for seg in scenario.segments)

    try:
        roi = fetch_roi_timeseries_from_adapter(
            adapter, text=prompt_text, segment_count=segment_count
        )
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


def _scenario_from_text(text: str) -> AdScenario:
    words = [w for w in text.split() if w.strip()]
    if not words:
        words = ["placeholder", "ad", "content"]
    chunk_size = max(1, len(words) // 3)
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunks.append(" ".join(words[i : i + chunk_size]))
    if len(chunks) < 3:
        chunks = chunks + ["Support your claim with data.", "Start your free trial now."]
    segments = []
    types = ["hook", "feature", "cta"]
    for idx, content in enumerate(chunks[:3]):
        segment_type = types[idx] if idx < len(types) else "feature"
        segments.append(
            AdSegment(
                id=f"text_seg_{idx}",
                content=content,
                segment_type=segment_type,  # type: ignore[arg-type]
                word_count=max(1, len(content.split())),
                complexity_score=0.35 + 0.05 * idx,
                emotional_intensity=0.35 + 0.07 * idx,
                has_question="?" in content,
                has_number=any(ch.isdigit() for ch in content),
                position=idx,
            )
        )
    return AdScenario(segments=segments, cta_segment_id=segments[-1].id if segments else None)


def predict_brain_response(
    tribe_model: object,
    text: str,
    adapter: TribeAdapter | None = None,
) -> BrainResponse:
    """Direct helper for TRIBE-mode brain response prediction from ad text.

    If strict adapter integration is unavailable or fails, returns parametric
    fallback brain response derived from the text.
    """
    scenario = _scenario_from_text(text)
    metrics = simulate_with_tribev2(scenario=scenario, tribe_model=tribe_model, adapter=adapter)
    if metrics.brain_response is None:
        fallback = simulate_parametric(scenario)
        return fallback.brain_response if fallback.brain_response is not None else BrainResponse(source="parametric")
    return metrics.brain_response
