"""Episode grading logic for all three task difficulties.

Member B ownership.

The grader is called once at the end of an episode. It produces a
GradeResult with a score in [0.0, 1.0] and a rubric-aligned breakdown.

Grading rubric (weights):
  55% Quality score   — how much did cognitive metrics actually improve?
  20% Constraint score — were all task constraints satisfied?
  10% Flow score      — does the final attention curve match the task arc?
  10% Diversity score — did the agent use varied action types?
   5% Efficiency score — did the agent solve it without wasting steps?

Determinism guarantee: given the same inputs, this function always returns
the same score. No randomness here — the grader is a pure function.

Sensitivity guarantee: random actions, no actions, and good actions all
produce meaningfully different scores — see test_grader.py for verification.

FIX: flow_score was using a fixed mismatch value of 0.60 which meant a
mismatching agent still got 60% credit on that dimension. Changed to a
proper scaled score: exact match = 1.0, adjacent flow = 0.5, wrong = 0.2.
Also "flat" flow is partially acceptable for task_2 u_shaped when the curve
is not clearly u-shaped yet (agent may be in progress).
"""

from __future__ import annotations

from statistics import mean

from backend.src.models import Action, CognitiveMetrics, GradeResult


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _normalize_delta(delta: float, scale: float = 0.35) -> float:
    """Map a delta in roughly [-scale, +scale] to [0, 1].

    A delta of 0 (no improvement) maps to 0.5.
    A delta of +scale maps to 1.0 (excellent).
    A delta of -scale maps to 0.0 (made things worse).
    """
    return _clamp(0.5 + delta / scale, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Flow score mapping — more granular than before
# ---------------------------------------------------------------------------

# Adjacency graph: which flow types are "close" to the target
# (partial credit if the agent is in the right ballpark)
_FLOW_ADJACENCY: dict[str, set[str]] = {
    "rising": {"flat"},          # flat is a step toward rising
    "falling": {"flat"},         # flat is a step toward recovering
    "u_shaped": {"flat", "falling"},  # flat or falling midpoint can be u-shaped in progress
    "flat": {"rising", "falling", "u_shaped"},
}


def _compute_flow_score(actual_flow: str, target_flow: str) -> float:
    """Compute flow score with partial credit for adjacent flow types.

    FIX: The original code used hardcoded MATCH=1.0 and MISMATCH=0.60,
    meaning wrong flow still gave 60% credit on this dimension. Now:
      - exact match   → 1.0
      - adjacent type → 0.50 (partial credit, agent is on the right track)
      - wrong type    → 0.20 (minimal credit, not zero so agent is not punished
                              for things outside its control early in episode)
    """
    if actual_flow == target_flow:
        return 1.0
    if actual_flow in _FLOW_ADJACENCY.get(target_flow, set()):
        return 0.50
    return 0.20


# ---------------------------------------------------------------------------
# Task-specific grader helpers
# ---------------------------------------------------------------------------

def _grade_task_1_quality(
    initial: CognitiveMetrics,
    final: CognitiveMetrics,
) -> tuple[float, dict]:
    """Task 1 (Easy): Attention + Engagement improvement, load controlled."""
    attention_delta = mean(final.attention_scores) - mean(initial.attention_scores)
    memory_delta = mean(final.memory_retention) - mean(initial.memory_retention)
    engagement_delta = final.engagement_score - initial.engagement_score
    load_control = _clamp(1.0 - final.cognitive_load, 0.0, 1.0)

    quality = (
        _normalize_delta(attention_delta, 0.30) * 0.35
        + _normalize_delta(memory_delta, 0.25) * 0.20
        + _normalize_delta(engagement_delta, 0.25) * 0.35
        + load_control * 0.10
    )
    breakdown = {
        "attention_delta": round(attention_delta, 4),
        "memory_delta": round(memory_delta, 4),
        "engagement_delta": round(engagement_delta, 4),
    }
    return _clamp(quality, 0.0, 1.0), breakdown


def _grade_task_2_quality(
    initial: CognitiveMetrics,
    final: CognitiveMetrics,
) -> tuple[float, dict]:
    """Task 2 (Medium): Balance memory retention and emotional response."""
    attention_delta = mean(final.attention_scores) - mean(initial.attention_scores)
    memory_delta = mean(final.memory_retention) - mean(initial.memory_retention)
    engagement_delta = final.engagement_score - initial.engagement_score
    valence_delta = final.emotional_valence - initial.emotional_valence
    load_control = _clamp(1.0 - final.cognitive_load, 0.0, 1.0)

    quality = (
        _normalize_delta(attention_delta, 0.25) * 0.20
        + _normalize_delta(memory_delta, 0.30) * 0.30
        + _normalize_delta(engagement_delta, 0.25) * 0.25
        + _normalize_delta(valence_delta, 0.40) * 0.15
        + load_control * 0.10
    )
    breakdown = {
        "attention_delta": round(attention_delta, 4),
        "memory_delta": round(memory_delta, 4),
        "engagement_delta": round(engagement_delta, 4),
        "valence_delta": round(valence_delta, 4),
    }
    return _clamp(quality, 0.0, 1.0), breakdown


def _grade_task_3_quality(
    initial: CognitiveMetrics,
    final: CognitiveMetrics,
) -> tuple[float, dict]:
    """Task 3 (Hard): Maximise engagement under strict constraints."""
    attention_delta = mean(final.attention_scores) - mean(initial.attention_scores)
    memory_delta = mean(final.memory_retention) - mean(initial.memory_retention)
    engagement_delta = final.engagement_score - initial.engagement_score
    load_control = _clamp(1.0 - final.cognitive_load, 0.0, 1.0)

    quality = (
        _normalize_delta(attention_delta, 0.25) * 0.25
        + _normalize_delta(memory_delta, 0.25) * 0.25
        + _normalize_delta(engagement_delta, 0.25) * 0.40
        + load_control * 0.10
    )
    breakdown = {
        "attention_delta": round(attention_delta, 4),
        "memory_delta": round(memory_delta, 4),
        "engagement_delta": round(engagement_delta, 4),
    }
    return _clamp(quality, 0.0, 1.0), breakdown


# ---------------------------------------------------------------------------
# Dispatcher: pick the right quality grader per task
# ---------------------------------------------------------------------------

_QUALITY_GRADERS = {
    "task_1_easy": _grade_task_1_quality,
    "task_2_medium": _grade_task_2_quality,
    "task_3_hard": _grade_task_3_quality,
}

# Desired attention-flow shape per task
_TASK_FLOW_TARGETS: dict[str, str] = {
    "task_1_easy": "rising",
    "task_2_medium": "u_shaped",
    "task_3_hard": "rising",
}


# ---------------------------------------------------------------------------
# Main grader
# ---------------------------------------------------------------------------

def grade_episode(
    task_id: str,
    initial_metrics: CognitiveMetrics,
    final_metrics: CognitiveMetrics,
    action_history: list[Action],
    constraints_ok: bool,
    steps_taken: int,
    max_steps: int,
) -> GradeResult:
    """Score a completed episode and return a GradeResult.

    Args:
        task_id:          Active task identifier.
        initial_metrics:  Cognitive metrics at the start of the episode.
        final_metrics:    Cognitive metrics at the end of the episode.
        action_history:   Ordered list of all actions taken.
        constraints_ok:   Whether all task constraints were satisfied at end.
        steps_taken:      Number of steps used.
        max_steps:        Maximum allowed steps for this task.

    Returns:
        GradeResult with score in [0.0, 1.0] and a full breakdown dict.
    """
    # --- 1. Quality score (55%) ---
    quality_grader = _QUALITY_GRADERS.get(task_id, _grade_task_1_quality)
    quality_score, quality_detail = quality_grader(initial_metrics, final_metrics)

    # --- 2. Constraints score (20%) ---
    constraints_score = 1.0 if constraints_ok else 0.0

    # --- 3. Flow score (10%) — FIX: use granular scoring instead of binary ---
    flow_target = _TASK_FLOW_TARGETS.get(task_id, "flat")
    flow_score = _compute_flow_score(final_metrics.attention_flow, flow_target)

    # --- 4. Diversity score (10%) ---
    action_names = [a.operation for a in action_history]
    if action_names:
        diversity_score = len(set(action_names)) / len(action_names)
    else:
        diversity_score = 0.0

    # --- 5. Efficiency score (5%) ---
    if max_steps > 0:
        efficiency_score = _clamp(1.0 - (steps_taken / max_steps), 0.0, 1.0)
    else:
        efficiency_score = 0.0

    # --- Weighted composite ---
    total_score = (
        quality_score    * 0.55
        + constraints_score * 0.20
        + flow_score       * 0.10
        + diversity_score  * 0.10
        + efficiency_score * 0.05
    )
    total_score = _clamp(total_score, 0.0, 1.0)

    # --- Feedback message ---
    feedback = _build_feedback(
        total_score=total_score,
        constraints_ok=constraints_ok,
        quality_score=quality_score,
        flow_actual=final_metrics.attention_flow,
        flow_target=flow_target,
        diversity_score=diversity_score,
        quality_detail=quality_detail,
        task_id=task_id,
    )

    return GradeResult(
        score=round(total_score, 4),
        breakdown={
            # Sub-scores (each in [0,1])
            "quality_score": round(quality_score, 4),
            "constraints_score": round(constraints_score, 4),
            "flow_score": round(flow_score, 4),
            "diversity_score": round(diversity_score, 4),
            "efficiency_score": round(efficiency_score, 4),
            # Deltas for debugging
            **{k: round(v, 4) for k, v in quality_detail.items()},
        },
        task_id=task_id,
        steps_taken=steps_taken,
        feedback=feedback,
    )


# ---------------------------------------------------------------------------
# Feedback generator
# ---------------------------------------------------------------------------

def _build_feedback(
    total_score: float,
    constraints_ok: bool,
    quality_score: float,
    flow_actual: str,
    flow_target: str,
    diversity_score: float,
    quality_detail: dict,
    task_id: str,
) -> str:
    """Build a human-readable feedback string for the episode result."""
    if not constraints_ok:
        return (
            "Task constraints were violated — this is a critical failure for "
            "regulated or structured ad content. Prioritise constraint "
            "satisfaction over metric optimisation. For task_3, ensure the "
            "brand segment stays in the top 2 positions and CTA is always last."
        )

    if total_score >= 0.80:
        return (
            "Excellent episode. Strong cognitive improvements with constraint "
            "compliance and diverse action use. The attention curve matches "
            f"the target '{flow_target}' shape well."
        )

    if total_score >= 0.60:
        hints: list[str] = []
        if quality_detail.get("attention_delta", 0) < 0:
            hints.append(
                "attention scores decreased — try reordering to put "
                "hooks and questions earlier (position 0-1 gets a primacy boost)"
            )
        if quality_detail.get("memory_delta", 0) < 0:
            hints.append(
                "memory retention dropped — consider emphasising "
                "testimonial or data segments which get encoding bonuses"
            )
        if flow_actual != flow_target:
            hints.append(
                f"attention flow is '{flow_actual}' but target is '{flow_target}' — "
                f"reorder segments to shape the attention curve: for 'rising' put "
                f"low-complexity content first; for 'u_shaped' put emotional content "
                f"at positions 0 and last"
            )
        if diversity_score < 0.50:
            hints.append(
                "action diversity is low — try different operation types: "
                "reorder, modify_hook, set_pacing, emphasize all affect different metrics"
            )
        hint_text = "; ".join(hints) if hints else "minor room for improvement in metric deltas"
        return f"Good episode. Suggestions: {hint_text}."

    if total_score >= 0.40:
        return (
            "Moderate performance. Try this sequence: (1) reorder to put the "
            "hook segment first, (2) use modify_hook with strategy='question' "
            "to boost opening attention, (3) emphasise the testimonial/data "
            "segment for memory, (4) finish by using set_pacing='slow' on "
            "high-complexity segments to reduce cognitive load."
        )

    return (
        "Low performance. Start by moving the hook to position 0 using reorder, "
        "then use modify_hook to convert it to a question format. Avoid actions "
        "that increase cognitive load without corresponding attention or memory "
        "gains. Ensure the CTA segment stays in the final position."
    )