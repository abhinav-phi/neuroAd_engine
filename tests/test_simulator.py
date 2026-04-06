"""Tests for simulator behavior and TRIBE v2 fallback alignment."""

from backend.src.env import CognitiveAdEnv
from backend.src.models import Action
from backend.src.simulator import predict_brain_response, simulate_parametric, simulate_with_tribev2
from backend.src.tasks import TASK_1_EASY, build_scenario
from backend.src.tribe_bridge import TribeRoiTimeseries


class _GoodAdapter:
    def predict_roi_timeseries(self, text: str, segment_count: int) -> TribeRoiTimeseries:
        _ = text
        size = max(3, segment_count * 2)
        return TribeRoiTimeseries(
            attention=[0.8] * size,
            memory=[0.6] * size,
            emotion=[0.7] * size,
            load=[0.4] * size,
        )


class _BadAdapter:
    def predict_roi_timeseries(self, text: str, segment_count: int) -> TribeRoiTimeseries:
        _ = text
        _ = segment_count
        return TribeRoiTimeseries(attention=[], memory=[], emotion=[], load=[])


def test_parametric_metrics_are_bounded() -> None:
    scenario = build_scenario(TASK_1_EASY)
    metrics = simulate_parametric(scenario)
    assert all(0.0 <= x <= 1.0 for x in metrics.attention_scores)
    assert all(0.0 <= x <= 1.0 for x in metrics.memory_retention)
    assert 0.0 <= metrics.cognitive_load <= 1.0
    assert -1.0 <= metrics.emotional_valence <= 1.0
    assert 0.0 <= metrics.engagement_score <= 1.0
    assert metrics.attention_flow in {"rising", "falling", "u_shaped", "flat"}


def test_env_reset_and_step_returns_expected_shapes() -> None:
    env = CognitiveAdEnv()
    obs = env.reset("task_1_easy")
    assert obs.task_id == "task_1_easy"
    action = Action(operation="swap", params={"pos_a": 0, "pos_b": 2})
    next_obs, reward, done, info = env.step(action)
    assert isinstance(reward, float)
    assert isinstance(done, bool)
    assert "reward_info" in info
    assert len(next_obs.segments) >= 3


def test_simulate_with_tribe_adapter_success_path() -> None:
    scenario = build_scenario(TASK_1_EASY)
    metrics = simulate_with_tribev2(scenario, tribe_model=object(), adapter=_GoodAdapter())
    assert metrics.simulation_source == "tribev2"
    assert metrics.brain_response is not None
    assert metrics.brain_response.source == "tribev2"


def test_simulate_with_tribe_adapter_failure_falls_back() -> None:
    scenario = build_scenario(TASK_1_EASY)
    fallback = simulate_with_tribev2(scenario, tribe_model=object(), adapter=_BadAdapter())
    assert fallback.simulation_source == "parametric"
    assert fallback.brain_response is not None
    assert fallback.brain_response.source == "parametric"


def test_predict_brain_response_returns_output_in_both_modes() -> None:
    direct = predict_brain_response(
        tribe_model=object(),
        text="Would you save 20 percent time if setup took only 5 minutes?",
        adapter=_GoodAdapter(),
    )
    assert direct.source == "tribev2"

    fallback = predict_brain_response(
        tribe_model=object(),
        text="Simple ad text fallback path",
        adapter=_BadAdapter(),
    )
    assert fallback.source == "parametric"
