"""Reward computation utilities for ad optimization episodes."""

from __future__ import annotations

from statistics import mean

from src.models import CognitiveMetrics, RewardInfo


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def compute_reward(
    prev_metrics: CognitiveMetrics,
    curr_metrics: CognitiveMetrics,
    action_history: list[str],
    task_id: str,
) -> RewardInfo:
    """Compute dense reward with progress signals and behavioral penalties."""
    attention_delta = mean(curr_metrics.attention_scores) - mean(prev_metrics.attention_scores)
    memory_delta = mean(curr_metrics.memory_retention) - mean(prev_metrics.memory_retention)
    engagement_delta = curr_metrics.engagement_score - prev_metrics.engagement_score

    load_over = max(0.0, curr_metrics.cognitive_load - 0.70)
    load_penalty = -load_over * 0.5

    repetition_penalty = 0.0
    if len(action_history) >= 2 and action_history[-1] == action_history[-2]:
        repetition_penalty = -0.06

    unique_actions = len(set(action_history)) if action_history else 0
    novelty_bonus = (unique_actions / max(1, len(action_history))) * 0.04

    target_flow = {
        "task_1_easy": "rising",
        "task_2_medium": "u_shaped",
        "task_3_hard": "rising",
    }.get(task_id, "flat")
    flow_bonus = 0.05 if curr_metrics.attention_flow == target_flow else -0.02

    total_reward = (
        attention_delta * 0.25
        + memory_delta * 0.25
        + engagement_delta * 0.20
        + load_penalty * 0.15
        + repetition_penalty * 0.10
        + novelty_bonus * 0.05
        + flow_bonus * 0.10
    )
    total_reward = _clamp(total_reward, -1.0, 1.0)

    return RewardInfo(
        total_reward=total_reward,
        attention_delta=attention_delta,
        memory_delta=memory_delta,
        engagement_delta=engagement_delta,
        load_penalty=load_penalty,
        repetition_penalty=repetition_penalty,
        novelty_bonus=novelty_bonus,
        flow_bonus=flow_bonus,
    )
