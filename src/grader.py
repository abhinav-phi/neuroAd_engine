"""Episode grading helpers and final task scoring logic."""

from __future__ import annotations

from statistics import mean

from src.models import Action, CognitiveMetrics, GradeResult


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _normalize_delta(delta: float, scale: float = 0.35) -> float:
    return _clamp(0.5 + delta / scale, 0.0, 1.0)


def grade_episode(
    task_id: str,
    initial_metrics: CognitiveMetrics,
    final_metrics: CognitiveMetrics,
    action_history: list[Action],
    constraints_ok: bool,
    steps_taken: int,
    max_steps: int,
) -> GradeResult:
    """Return deterministic score in [0, 1] with rubric-aligned breakdown."""
    attention_delta = mean(final_metrics.attention_scores) - mean(initial_metrics.attention_scores)
    memory_delta = mean(final_metrics.memory_retention) - mean(initial_metrics.memory_retention)
    engagement_delta = final_metrics.engagement_score - initial_metrics.engagement_score
    load_control = _clamp(1.0 - final_metrics.cognitive_load, 0.0, 1.0)

    quality_score = (
        _normalize_delta(attention_delta, 0.30) * 0.30
        + _normalize_delta(memory_delta, 0.30) * 0.25
        + _normalize_delta(engagement_delta, 0.25) * 0.35
        + load_control * 0.10
    )

    flow_target = {
        "task_1_easy": "rising",
        "task_2_medium": "u_shaped",
        "task_3_hard": "rising",
    }.get(task_id, "flat")
    flow_score = 1.0 if final_metrics.attention_flow == flow_target else 0.6
    constraints_score = 1.0 if constraints_ok else 0.0

    action_names = [action.operation for action in action_history]
    diversity = len(set(action_names)) / max(1, len(action_names))
    efficiency = _clamp(1.0 - (steps_taken / max(1, max_steps)), 0.0, 1.0)

    total_score = (
        quality_score * 0.55
        + constraints_score * 0.20
        + flow_score * 0.10
        + diversity * 0.10
        + efficiency * 0.05
    )
    total_score = _clamp(total_score, 0.0, 1.0)

    feedback = "Strong progression with stable constraints."
    if total_score < 0.40:
        feedback = "Low improvement. Try reordering and pacing changes earlier."
    elif not constraints_ok:
        feedback = "Performance improved, but critical task constraints were violated."

    return GradeResult(
        score=total_score,
        breakdown={
            "quality_score": round(quality_score, 4),
            "constraints_score": round(constraints_score, 4),
            "flow_score": round(flow_score, 4),
            "diversity_score": round(diversity, 4),
            "efficiency_score": round(efficiency, 4),
            "attention_delta": round(attention_delta, 4),
            "memory_delta": round(memory_delta, 4),
            "engagement_delta": round(engagement_delta, 4),
        },
        task_id=task_id,
        steps_taken=steps_taken,
        feedback=feedback,
    )
