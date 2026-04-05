"""Tests for grading and task-score expectations."""

from backend.src.grader import grade_episode
from backend.src.models import Action
from backend.src.simulator import simulate_parametric
from backend.src.tasks import TASK_1_EASY, build_scenario


def test_grader_score_is_normalized() -> None:
    scenario = build_scenario(TASK_1_EASY)
    initial = simulate_parametric(scenario)
    improved_scenario = build_scenario(TASK_1_EASY)
    improved_scenario.segments[2].position = 0
    improved_scenario.segments[2].emphasis_level = 1
    final = simulate_parametric(improved_scenario)

    result = grade_episode(
        task_id="task_1_easy",
        initial_metrics=initial,
        final_metrics=final,
        action_history=[Action(operation="swap", params={"pos_a": 0, "pos_b": 2})],
        constraints_ok=True,
        steps_taken=3,
        max_steps=8,
    )
    assert 0.0 <= result.score <= 1.0
    assert result.task_id == "task_1_easy"


def test_grader_is_deterministic() -> None:
    scenario = build_scenario(TASK_1_EASY)
    initial = simulate_parametric(scenario)
    final = simulate_parametric(scenario)
    actions = [Action(operation="reorder", params={"new_order": [0, 1, 2, 3, 4]})]
    first = grade_episode("task_1_easy", initial, final, actions, True, 2, 8)
    second = grade_episode("task_1_easy", initial, final, actions, True, 2, 8)
    assert first.score == second.score
    assert first.breakdown == second.breakdown
