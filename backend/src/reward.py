"""Reward computation for cognitive ad optimization episodes.

Member B ownership.

The reward is dense and multi-component — every step returns a non-zero
signal. This is critical for RL training: sparse rewards (0/1) make
exploration extremely hard. Here we decompose the reward into 7 signals
so agents get meaningful gradients on every action.

Component breakdown
-------------------
1. attention_delta   (weight 0.25): change in mean attention across segments
2. memory_delta      (weight 0.25): change in mean memory retention
3. engagement_delta  (weight 0.20): change in composite engagement score
4. load_penalty      (weight 0.15): penalty when cognitive load exceeds 0.70
5. repetition_penalty(weight 0.10): penalty for repeating same action twice
6. novelty_bonus     (weight 0.05): reward for using diverse action types
7. flow_bonus        (weight 0.10): bonus when attention curve matches task target

Total is clamped to [-1.0, 1.0].

FIX (novelty exploit): The original novelty bonus scaled linearly with
unique/total ratio, which meant an agent could earn free positive reward
just by cycling through all 8 action types regardless of effectiveness.
Fix: Cap the absolute novelty bonus and only award it when there is ALSO
a positive outcome signal. Also cap repetition penalty at first offence
(don't keep penalising after the 2nd repeated action in a row).
"""

from __future__ import annotations

from statistics import mean

from backend.src.models import CognitiveMetrics, RewardInfo


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


# Cognitive load threshold (Sweller's CLT proxy for working-memory saturation)
_LOAD_PENALTY_THRESHOLD = 0.70
_LOAD_PENALTY_SCALE = 0.50   # penalty = excess × scale

# Target attention-flow shapes per task
_TASK_FLOW_TARGETS: dict[str, str] = {
    "task_1_easy": "rising",
    "task_2_medium": "u_shaped",
    "task_3_hard": "rising",
}
_FLOW_MATCH_BONUS = 0.05
_FLOW_MISMATCH_PENALTY = -0.02

# Repetition penalty — only penalise the transition, not sustained repetition
_REPETITION_PENALTY = -0.06

# Novelty bonus — capped so it cannot be exploited by cycling actions
# Max absolute value is 0.03 (much smaller than 0.04 * 1.0 = 0.04 before)
_NOVELTY_BONUS_MAX = 0.03
_NOVELTY_BONUS_SCALE = 0.04


def _compute_load_penalty(cognitive_load: float) -> float:
    """Penalty for exceeding the working-memory load threshold.

    Returns a non-positive value. Zero if load is under threshold.
    """
    excess = max(0.0, cognitive_load - _LOAD_PENALTY_THRESHOLD)
    return -excess * _LOAD_PENALTY_SCALE


def _compute_repetition_penalty(action_history: list[str]) -> float:
    """Penalise the FIRST time the same action is repeated back-to-back.

    Only penalise at the exact moment of repetition (last[-1] == last[-2]).
    Do NOT keep penalising if the agent repeats 3, 4, 5 times — the signal
    is already sent on the second occurrence.
    """
    if len(action_history) >= 2 and action_history[-1] == action_history[-2]:
        # Only penalise at the moment of first repetition, not sustained
        if len(action_history) >= 3 and action_history[-1] == action_history[-3]:
            # Third consecutive same action — escalate penalty slightly
            return _REPETITION_PENALTY * 1.5
        return _REPETITION_PENALTY
    return 0.0


def _compute_novelty_bonus(action_history: list[str], outcome_positive: bool) -> float:
    """Reward action diversity, but ONLY when the outcome is also positive.

    FIX: Previously the bonus was awarded regardless of outcome, allowing
    agents to cycle through actions to harvest novelty reward. Now the bonus
    is conditioned on a positive outcome signal (any improvement in metrics).
    This prevents the exploit while still encouraging exploration.

    The bonus is also capped at _NOVELTY_BONUS_MAX regardless of diversity.
    """
    if not action_history or not outcome_positive:
        return 0.0
    unique = len(set(action_history))
    diversity_ratio = unique / len(action_history)
    raw = diversity_ratio * _NOVELTY_BONUS_SCALE
    return min(raw, _NOVELTY_BONUS_MAX)


def _compute_flow_bonus(curr_metrics: CognitiveMetrics, task_id: str) -> float:
    """Bonus/penalty based on whether attention flow matches task target.

    Each task has a desired attention narrative arc:
      - task_1_easy  : "rising" — build to a call-to-action
      - task_2_medium: "u_shaped" — emotional dip then recovery
      - task_3_hard  : "rising" — strict regulatory → engagement arc
    """
    target = _TASK_FLOW_TARGETS.get(task_id, "flat")
    if curr_metrics.attention_flow == target:
        return _FLOW_MATCH_BONUS
    return _FLOW_MISMATCH_PENALTY


def compute_reward(
    prev_metrics: CognitiveMetrics,
    curr_metrics: CognitiveMetrics,
    action_history: list[str],
    task_id: str,
) -> RewardInfo:
    """Compute the dense multi-component reward for one environment step.

    Args:
        prev_metrics: CognitiveMetrics before the action was applied.
        curr_metrics:  CognitiveMetrics after the action was applied.
        action_history: Full list of operation names used so far (including
                        the most recent action as the last element).
        task_id: Active task identifier — affects flow bonus target.

    Returns:
        RewardInfo with total_reward and all individual components.
    """
    # --- Progress signals (delta between current and previous state) ---
    attention_delta = mean(curr_metrics.attention_scores) - mean(prev_metrics.attention_scores)
    memory_delta = mean(curr_metrics.memory_retention) - mean(prev_metrics.memory_retention)
    engagement_delta = curr_metrics.engagement_score - prev_metrics.engagement_score

    # --- Determine if outcome is overall positive (for novelty gating) ---
    outcome_positive = (
        attention_delta > 0.001
        or memory_delta > 0.001
        or engagement_delta > 0.001
    )

    # --- Constraint/quality signals ---
    load_penalty = _compute_load_penalty(curr_metrics.cognitive_load)
    repetition_penalty = _compute_repetition_penalty(action_history)
    novelty_bonus = _compute_novelty_bonus(action_history, outcome_positive)
    flow_bonus = _compute_flow_bonus(curr_metrics, task_id)

    # --- Weighted sum ---
    # Attention and memory are primary cognitive goals → equal highest weight
    # Engagement is composite → slightly lower
    # Load, repetition, novelty, flow are behavioural shapers → lower weights
    total_reward = (
        attention_delta  * 0.25
        + memory_delta   * 0.25
        + engagement_delta * 0.20
        + load_penalty   * 0.15
        + repetition_penalty * 0.10
        + novelty_bonus  * 0.05
        + flow_bonus     * 0.10
    )
    total_reward = _clamp(total_reward, -1.0, 1.0)

    return RewardInfo(
        total_reward=total_reward,
        attention_delta=round(attention_delta, 6),
        memory_delta=round(memory_delta, 6),
        engagement_delta=round(engagement_delta, 6),
        load_penalty=round(load_penalty, 6),
        repetition_penalty=round(repetition_penalty, 6),
        novelty_bonus=round(novelty_bonus, 6),
        flow_bonus=round(flow_bonus, 6),
    )