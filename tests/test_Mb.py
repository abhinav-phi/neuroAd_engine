"""Tests for Member B components: simulator, reward, and grader.

Run with:
    pytest tests/test_Mb.py -v
"""

from __future__ import annotations

import math
from statistics import mean

import pytest

# ---- Shared test infrastructure ---- #
# These imports will work once Member A's files are also present
try:
    from backend.src.env import CognitiveAdEnv
    from backend.src.grader import grade_episode, _normalize_delta
    from backend.src.models import Action, CognitiveMetrics
    from backend.src.reward import compute_reward, _compute_load_penalty, _compute_repetition_penalty, _compute_novelty_bonus
    from backend.src.simulator import (
        DEFAULT_COEFFICIENTS,
        _compute_attention_score,
        _compute_memory_score,
        load_parametric_coefficients,
        simulate_parametric,
        simulate_with_tribev2,
    )
    from backend.src.tasks import TASK_1_EASY, TASK_2_MEDIUM, TASK_3_HARD, build_scenario
    from backend.src.tribe_bridge import TribeRoiTimeseries
    IMPORTS_OK = True
except ImportError as e:
    IMPORTS_OK = False
    IMPORT_ERROR = str(e)

pytestmark = pytest.mark.skipif(not IMPORTS_OK, reason=f"Import failed: {IMPORT_ERROR if not IMPORTS_OK else ''}")


# ===========================================================================
# Helpers
# ===========================================================================

def _make_metrics(
    attention: float = 0.5,
    memory: float = 0.5,
    load: float = 0.5,
    valence: float = 0.0,
    engagement: float = 0.5,
    flow: str = "flat",
) -> CognitiveMetrics:
    return CognitiveMetrics(
        attention_scores=[attention, attention, attention],
        memory_retention=[memory, memory, memory],
        cognitive_load=load,
        emotional_valence=valence,
        engagement_score=engagement,
        attention_flow=flow,  # type: ignore[arg-type]
        simulation_source="parametric",
    )


# ===========================================================================
# simulator.py tests
# ===========================================================================

class TestSimulatorBounds:
    """All outputs must stay within declared bounds regardless of input."""

    def test_all_scores_bounded_task1(self):
        scenario = build_scenario(TASK_1_EASY)
        m = simulate_parametric(scenario)
        assert all(0.0 <= x <= 1.0 for x in m.attention_scores), "attention out of [0,1]"
        assert all(0.0 <= x <= 1.0 for x in m.memory_retention), "memory out of [0,1]"
        assert 0.0 <= m.cognitive_load <= 1.0
        assert -1.0 <= m.emotional_valence <= 1.0
        assert 0.0 <= m.engagement_score <= 1.0

    def test_all_scores_bounded_task2(self):
        scenario = build_scenario(TASK_2_MEDIUM)
        m = simulate_parametric(scenario)
        assert all(0.0 <= x <= 1.0 for x in m.attention_scores)
        assert all(0.0 <= x <= 1.0 for x in m.memory_retention)
        assert 0.0 <= m.cognitive_load <= 1.0
        assert -1.0 <= m.emotional_valence <= 1.0
        assert 0.0 <= m.engagement_score <= 1.0

    def test_all_scores_bounded_task3(self):
        scenario = build_scenario(TASK_3_HARD)
        m = simulate_parametric(scenario)
        assert all(0.0 <= x <= 1.0 for x in m.attention_scores)
        assert all(0.0 <= x <= 1.0 for x in m.memory_retention)
        assert 0.0 <= m.cognitive_load <= 1.0


class TestSimulatorDeterminism:
    """Same input must always produce identical output."""

    def test_same_scenario_same_output_10x(self):
        scenario = build_scenario(TASK_1_EASY)
        first = simulate_parametric(scenario)
        for _ in range(9):
            result = simulate_parametric(scenario)
            assert result.attention_scores == first.attention_scores
            assert result.memory_retention == first.memory_retention
            assert result.cognitive_load == first.cognitive_load
            assert result.emotional_valence == first.emotional_valence
            assert result.engagement_score == first.engagement_score

    def test_all_three_tasks_deterministic(self):
        for task_config in [TASK_1_EASY, TASK_2_MEDIUM, TASK_3_HARD]:
            s = build_scenario(task_config)
            a = simulate_parametric(s)
            b = simulate_parametric(s)
            assert a.attention_scores == b.attention_scores
            assert a.engagement_score == b.engagement_score


class TestSimulatorSensitivity:
    """Different inputs must produce meaningfully different outputs."""

    def test_hook_position_matters(self):
        """Moving hook to position 0 should raise attention."""
        scenario_default = build_scenario(TASK_1_EASY)
        default_metrics = simulate_parametric(scenario_default)

        scenario_hook_first = build_scenario(TASK_1_EASY)
        # Swap: move hook (pos 2) to position 0
        segs = scenario_hook_first.segments
        segs[0], segs[2] = segs[2], segs[0]
        for i, seg in enumerate(segs):
            seg.position = i
        hook_first_metrics = simulate_parametric(scenario_hook_first)

        # Hook gets a primacy AND hook_bonus — overall attention should improve
        assert mean(hook_first_metrics.attention_scores) != mean(default_metrics.attention_scores), \
            "Moving hook to position 0 should change attention"

    def test_emphasis_raises_memory(self):
        scenario = build_scenario(TASK_1_EASY)
        before = simulate_parametric(scenario)

        # Emphasise a mid-segment
        scenario.segments[1].emphasis_level = 3
        after = simulate_parametric(scenario)

        assert mean(after.memory_retention) > mean(before.memory_retention), \
            "Emphasising a segment should raise memory retention"

    def test_high_complexity_lowers_attention(self):
        scenario = build_scenario(TASK_1_EASY)
        before = simulate_parametric(scenario)

        # Max out all complexity scores
        for seg in scenario.segments:
            seg.complexity_score = 1.0
        after = simulate_parametric(scenario)

        assert mean(after.attention_scores) < mean(before.attention_scores), \
            "Maximum complexity should lower attention scores"

    def test_cognitive_load_increases_with_more_segments(self):
        from backend.src.models import AdSegment, AdScenario

        def make_scenario_with_n_segments(n: int) -> AdScenario:
            segs = []
            for i in range(n):
                segs.append(AdSegment(
                    id=f"seg_{i}",
                    content=f"Ad content segment {i}.",
                    segment_type="feature",
                    word_count=4,
                    complexity_score=0.5,
                    emotional_intensity=0.3,
                    position=i,
                ))
            return AdScenario(segments=segs)

        short = simulate_parametric(make_scenario_with_n_segments(3))
        long_ = simulate_parametric(make_scenario_with_n_segments(10))
        assert long_.cognitive_load > short.cognitive_load, \
            "More segments should increase cognitive load"


class TestSimulatorBrainResponse:
    """Brain response should always be populated in parametric mode."""

    def test_brain_response_present(self):
        scenario = build_scenario(TASK_1_EASY)
        m = simulate_parametric(scenario)
        assert m.brain_response is not None
        assert m.brain_response.source == "parametric"
        assert len(m.brain_response.region_activations) > 0

    def test_brain_response_activations_bounded(self):
        scenario = build_scenario(TASK_2_MEDIUM)
        m = simulate_parametric(scenario)
        assert m.brain_response is not None
        for r in m.brain_response.region_activations:
            assert 0.0 <= r.activation_level <= 1.0


class TestTribev2Fallback:
    """simulate_with_tribev2 must fall back to parametric when adapter absent."""

    def test_no_adapter_returns_parametric(self):
        scenario = build_scenario(TASK_1_EASY)
        m = simulate_with_tribev2(scenario)
        assert m.simulation_source == "parametric"

    def test_good_adapter_returns_tribev2(self):
        class _GoodAdapter:
            def predict_roi_timeseries(self, text, segment_count):
                size = max(3, segment_count * 2)
                return TribeRoiTimeseries(
                    attention=[0.8] * size,
                    memory=[0.6] * size,
                    emotion=[0.7] * size,
                    load=[0.4] * size,
                )

        scenario = build_scenario(TASK_1_EASY)
        m = simulate_with_tribev2(scenario, tribe_model=object(), adapter=_GoodAdapter())
        assert m.simulation_source == "tribev2"

    def test_bad_adapter_falls_back(self):
        class _BadAdapter:
            def predict_roi_timeseries(self, text, segment_count):
                return TribeRoiTimeseries(attention=[], memory=[], emotion=[], load=[])

        scenario = build_scenario(TASK_1_EASY)
        m = simulate_with_tribev2(scenario, tribe_model=object(), adapter=_BadAdapter())
        assert m.simulation_source == "parametric"


class TestCoefficientLoading:
    """Coefficient loading must fall back gracefully."""

    def test_default_coefficients_have_all_keys(self):
        for key in ("attention", "memory", "load", "emotional_valence", "engagement"):
            assert key in DEFAULT_COEFFICIENTS

    def test_missing_file_falls_back_to_defaults(self, tmp_path):
        missing = tmp_path / "does_not_exist.json"
        loaded = load_parametric_coefficients(missing)
        assert loaded == DEFAULT_COEFFICIENTS

    def test_custom_coefficients_loaded(self, tmp_path):
        import json
        custom = {**DEFAULT_COEFFICIENTS}
        custom["attention"] = {**DEFAULT_COEFFICIENTS["attention"], "base": 0.99}
        payload = {"coefficients": custom}
        path = tmp_path / "custom.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        loaded = load_parametric_coefficients(path)
        assert loaded["attention"]["base"] == 0.99


# ===========================================================================
# reward.py tests
# ===========================================================================

class TestRewardBounds:
    """Total reward must always be in [-1.0, 1.0]."""

    def test_reward_bounded_neutral(self):
        prev = _make_metrics(attention=0.5, memory=0.5, load=0.5, engagement=0.5)
        curr = _make_metrics(attention=0.5, memory=0.5, load=0.5, engagement=0.5)
        r = compute_reward(prev, curr, ["swap"], "task_1_easy")
        assert -1.0 <= r.total_reward <= 1.0

    def test_reward_bounded_extreme_improvement(self):
        prev = _make_metrics(attention=0.1, memory=0.1, load=0.9, engagement=0.1)
        curr = _make_metrics(attention=0.9, memory=0.9, load=0.1, engagement=0.9)
        r = compute_reward(prev, curr, ["reorder"], "task_1_easy")
        assert -1.0 <= r.total_reward <= 1.0

    def test_reward_bounded_extreme_regression(self):
        prev = _make_metrics(attention=0.9, memory=0.9, load=0.1, engagement=0.9)
        curr = _make_metrics(attention=0.1, memory=0.1, load=0.9, engagement=0.1)
        r = compute_reward(prev, curr, ["swap"], "task_1_easy")
        assert -1.0 <= r.total_reward <= 1.0

    def test_reward_is_non_zero(self):
        """Dense reward: every step should produce a non-zero signal."""
        prev = _make_metrics()
        curr = _make_metrics(attention=0.55, memory=0.55)
        r = compute_reward(prev, curr, ["reorder"], "task_1_easy")
        assert r.total_reward != 0.0, "Reward should be non-zero for any change"


class TestRewardComponents:
    """Individual components should behave as documented."""

    def test_load_penalty_activates_above_threshold(self):
        penalty_low = _compute_load_penalty(0.69)  # just under threshold
        penalty_high = _compute_load_penalty(0.80)  # over threshold
        assert penalty_low == 0.0
        assert penalty_high < 0.0

    def test_load_penalty_zero_under_threshold(self):
        assert _compute_load_penalty(0.0) == 0.0
        assert _compute_load_penalty(0.70) == 0.0

    def test_repetition_penalty_on_duplicate_action(self):
        penalty = _compute_repetition_penalty(["swap", "swap"])
        assert penalty < 0.0

    def test_no_repetition_penalty_on_different_actions(self):
        penalty = _compute_repetition_penalty(["swap", "reorder"])
        assert penalty == 0.0

    def test_novelty_bonus_increases_with_variety(self):
        low_variety = _compute_novelty_bonus(["swap", "swap", "swap"])
        high_variety = _compute_novelty_bonus(["swap", "reorder", "emphasize"])
        assert high_variety > low_variety

    def test_flow_bonus_positive_when_matching(self):
        curr = _make_metrics(flow="rising")
        r = compute_reward(_make_metrics(), curr, ["swap"], "task_1_easy")
        assert r.flow_bonus > 0.0

    def test_flow_penalty_when_mismatching(self):
        curr = _make_metrics(flow="falling")
        r = compute_reward(_make_metrics(), curr, ["swap"], "task_1_easy")
        assert r.flow_bonus < 0.0

    def test_improvement_gives_positive_reward(self):
        prev = _make_metrics(attention=0.4, memory=0.4, engagement=0.4)
        curr = _make_metrics(attention=0.7, memory=0.7, engagement=0.7)
        r = compute_reward(prev, curr, ["reorder"], "task_1_easy")
        assert r.total_reward > 0.0

    def test_regression_gives_negative_reward(self):
        prev = _make_metrics(attention=0.7, memory=0.7, engagement=0.7)
        curr = _make_metrics(attention=0.4, memory=0.4, engagement=0.4)
        r = compute_reward(prev, curr, ["swap"], "task_1_easy")
        assert r.total_reward < 0.0


class TestRewardDeterminism:
    """Same inputs → same reward, always."""

    def test_deterministic_10x(self):
        prev = _make_metrics(attention=0.4, memory=0.45, load=0.6, engagement=0.5)
        curr = _make_metrics(attention=0.55, memory=0.6, load=0.55, engagement=0.62)
        history = ["swap", "reorder", "emphasize"]
        first = compute_reward(prev, curr, history, "task_2_medium")
        for _ in range(9):
            result = compute_reward(prev, curr, history, "task_2_medium")
            assert result.total_reward == first.total_reward


# ===========================================================================
# grader.py tests
# ===========================================================================

class TestGraderBounds:
    """Episode score must always be in [0.0, 1.0]."""

    def _run_grade(self, task_id, attn_delta=0.1, mem_delta=0.05, constraints_ok=True, steps=5):
        task_map = {"task_1_easy": TASK_1_EASY, "task_2_medium": TASK_2_MEDIUM, "task_3_hard": TASK_3_HARD}
        scenario = build_scenario(task_map[task_id])
        initial = simulate_parametric(scenario)
        # Manually shift final metrics to simulate improvement
        final = CognitiveMetrics(
            attention_scores=[_clamp(x + attn_delta, 0.0, 1.0) for x in initial.attention_scores],
            memory_retention=[_clamp(x + mem_delta, 0.0, 1.0) for x in initial.memory_retention],
            cognitive_load=initial.cognitive_load,
            emotional_valence=initial.emotional_valence,
            engagement_score=_clamp(initial.engagement_score + 0.05, 0.0, 1.0),
            attention_flow="rising",
            simulation_source="parametric",
        )
        task_max = task_map[task_id]["max_steps"]
        actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})] * steps
        return grade_episode(task_id, initial, final, actions, constraints_ok, steps, task_max)

    def _clamp(self, v, lo, hi):
        return max(lo, min(hi, v))

    def test_score_in_range_task1(self):
        r = self._run_grade("task_1_easy")
        assert 0.0 <= r.score <= 1.0

    def test_score_in_range_task2(self):
        r = self._run_grade("task_2_medium")
        assert 0.0 <= r.score <= 1.0

    def test_score_in_range_task3(self):
        r = self._run_grade("task_3_hard")
        assert 0.0 <= r.score <= 1.0

    def test_constraint_violation_lowers_score(self):
        ok = self._run_grade("task_3_hard", constraints_ok=True)
        violated = self._run_grade("task_3_hard", constraints_ok=False)
        assert violated.score < ok.score, "Constraint violation must lower score"

    def test_no_improvement_scores_below_random_improvement(self):
        scenario = build_scenario(TASK_1_EASY)
        initial = simulate_parametric(scenario)
        # Final = same as initial (no improvement)
        actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})] * 3
        no_change = grade_episode(
            "task_1_easy", initial, initial, actions, True, 3, TASK_1_EASY["max_steps"]
        )
        # Now with improvement
        final_improved = CognitiveMetrics(
            attention_scores=[min(x + 0.2, 1.0) for x in initial.attention_scores],
            memory_retention=[min(x + 0.1, 1.0) for x in initial.memory_retention],
            cognitive_load=initial.cognitive_load,
            emotional_valence=initial.emotional_valence,
            engagement_score=min(initial.engagement_score + 0.15, 1.0),
            attention_flow="rising",
            simulation_source="parametric",
        )
        improved = grade_episode(
            "task_1_easy", initial, final_improved, actions, True, 3, TASK_1_EASY["max_steps"]
        )
        assert improved.score > no_change.score, "Improvement should score higher than no-change"


class TestGraderDeterminism:
    """Grader must be a pure function."""

    def test_deterministic_10x(self):
        scenario = build_scenario(TASK_1_EASY)
        initial = simulate_parametric(scenario)
        actions = [Action(operation="reorder", params={"new_order": [0, 1, 2, 3, 4]})]
        first = grade_episode("task_1_easy", initial, initial, actions, True, 1, 8)
        for _ in range(9):
            result = grade_episode("task_1_easy", initial, initial, actions, True, 1, 8)
            assert result.score == first.score
            assert result.breakdown == first.breakdown


class TestGraderSensitivity:
    """Grader must produce different scores for meaningfully different inputs."""

    def test_good_vs_bad_episode_distinct_scores(self):
        scenario = build_scenario(TASK_1_EASY)
        initial = simulate_parametric(scenario)

        # Good episode: big improvement
        good_final = CognitiveMetrics(
            attention_scores=[min(x + 0.3, 1.0) for x in initial.attention_scores],
            memory_retention=[min(x + 0.2, 1.0) for x in initial.memory_retention],
            cognitive_load=max(initial.cognitive_load - 0.1, 0.0),
            emotional_valence=initial.emotional_valence,
            engagement_score=min(initial.engagement_score + 0.2, 1.0),
            attention_flow="rising",
            simulation_source="parametric",
        )
        good_actions = [
            Action(operation="swap", params={"pos_a": 0, "pos_b": 2}),
            Action(operation="emphasize", params={"segment_id": "seg_hook_2"}),
            Action(operation="reorder", params={"new_order": [2, 1, 0, 3, 4]}),
        ]
        good = grade_episode("task_1_easy", initial, good_final, good_actions, True, 3, 8)

        # Bad episode: no improvement, repeated actions
        bad_actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})] * 5
        bad = grade_episode("task_1_easy", initial, initial, bad_actions, True, 5, 8)

        assert good.score > bad.score, "Good episode must score higher than bad episode"
        assert not math.isclose(good.score, bad.score, rel_tol=0.01)

    def test_constraint_violation_distinct_score(self):
        scenario = build_scenario(TASK_3_HARD)
        initial = simulate_parametric(scenario)
        actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})]
        ok = grade_episode("task_3_hard", initial, initial, actions, True, 1, 12)
        violated = grade_episode("task_3_hard", initial, initial, actions, False, 1, 12)
        assert ok.score != violated.score

    def test_all_tasks_produce_different_scores(self):
        """A fixed identical episode run against each task should differ."""
        actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})]
        scores = []
        for task_id, task_cfg in [
            ("task_1_easy", TASK_1_EASY),
            ("task_2_medium", TASK_2_MEDIUM),
            ("task_3_hard", TASK_3_HARD),
        ]:
            scenario = build_scenario(task_cfg)
            initial = simulate_parametric(scenario)
            result = grade_episode(task_id, initial, initial, actions, True, 1, task_cfg["max_steps"])
            scores.append(result.score)
        # At least two tasks should have different efficiency (different max_steps)
        assert len(set(scores)) > 1, "Different tasks should yield at least some score variation"


class TestGraderBreakdown:
    """Breakdown dict must contain all expected keys."""

    def test_breakdown_keys_present(self):
        scenario = build_scenario(TASK_1_EASY)
        initial = simulate_parametric(scenario)
        actions = [Action(operation="swap", params={"pos_a": 0, "pos_b": 1})]
        result = grade_episode("task_1_easy", initial, initial, actions, True, 1, 8)
        required = {
            "quality_score", "constraints_score", "flow_score",
            "diversity_score", "efficiency_score",
        }
        assert required.issubset(result.breakdown.keys())

    def test_breakdown_values_bounded(self):
        scenario = build_scenario(TASK_2_MEDIUM)
        initial = simulate_parametric(scenario)
        actions = [Action(operation="reorder", params={"new_order": [0, 1, 2, 3, 4, 5]})]
        result = grade_episode("task_2_medium", initial, initial, actions, True, 1, 10)
        for k, v in result.breakdown.items():
            if k in {"quality_score", "constraints_score", "flow_score",
                     "diversity_score", "efficiency_score"}:
                assert 0.0 <= v <= 1.0, f"Breakdown key '{k}' value {v} out of [0,1]"


# ===========================================================================
# End-to-end integration: env loop with Member B components active
# ===========================================================================

class TestEndToEndIntegration:
    """Sanity checks that the full env loop works with Member B code."""

    def test_full_episode_task1(self):
        env = CognitiveAdEnv()
        obs = env.reset("task_1_easy")
        assert obs.task_id == "task_1_easy"

        total_reward = 0.0
        done = False
        step = 0
        while not done and step < obs.max_steps:
            action = Action(operation="swap", params={"pos_a": 0, "pos_b": step % 4})
            obs, reward, done, info = env.step(action)
            assert isinstance(reward, float)
            assert -1.0 <= reward <= 1.0
            total_reward += reward
            step += 1

        assert done is True
        assert "reward_info" in info
        # Grade should be present at end of episode
        assert "grade" in info
        assert 0.0 <= info["grade"]["score"] <= 1.0

    def test_invalid_action_gives_negative_reward(self):
        env = CognitiveAdEnv()
        env.reset("task_1_easy")
        # Swap with out-of-range indices
        bad = Action(operation="swap", params={"pos_a": 0, "pos_b": 999})
        _, reward, _, info = env.step(bad)
        assert reward < 0.0, "Invalid action must return negative reward"
        assert "error" in info["reward_info"]

    def test_episode_resets_cleanly(self):
        env = CognitiveAdEnv()
        env.reset("task_1_easy")
        env.step(Action(operation="swap", params={"pos_a": 0, "pos_b": 1}))
        # Reset to a different task
        obs2 = env.reset("task_3_hard")
        assert obs2.task_id == "task_3_hard"
        assert obs2.step == 0

    def test_reward_info_has_all_components(self):
        env = CognitiveAdEnv()
        env.reset("task_1_easy")
        _, _, _, info = env.step(Action(operation="swap", params={"pos_a": 0, "pos_b": 2}))
        ri = info["reward_info"]
        for key in ("total_reward", "attention_delta", "memory_delta",
                    "engagement_delta", "load_penalty", "repetition_penalty",
                    "novelty_bonus", "flow_bonus"):
            assert key in ri, f"Missing reward component: {key}"


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))