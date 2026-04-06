"""Environment lifecycle and action execution for the cognitive ad simulator."""

from __future__ import annotations

from copy import deepcopy
from statistics import mean
from typing import Literal

from backend.src.grader import grade_episode
from backend.src.models import Action, AdScenario, CognitiveMetrics, EnvState, GradeResult, Observation
from backend.src.reward import compute_reward
from backend.src.simulator import simulate_parametric
from backend.src.tasks import build_scenario, get_task_config


class CognitiveAdEnv:
    """OpenEnv-compatible RL environment for cognitive ad optimization.

    NOTE: All model inference goes through the hosted TRIBE Space API.
    No local tribev2 model is loaded. The RL env uses parametric simulation
    for the step/reset/grade loop (which is deterministic and fast).
    """

    def __init__(self) -> None:
        self.scenario: AdScenario | None = None
        self.cognitive_metrics: CognitiveMetrics | None = None
        self.initial_metrics: CognitiveMetrics | None = None
        self.task_id: str = ""
        self.task_config: dict = {}
        self.step_count: int = 0
        self.max_steps: int = 0
        self.done: bool = False
        self.reward_trajectory: list[float] = []
        self.action_history: list[Action] = []
        self.emphasis_action_count: int = 0
        self.last_reward_info: dict = {}

    def _simulate(self) -> CognitiveMetrics:
        assert self.scenario is not None
        return simulate_parametric(self.scenario)

    def _build_observation(self) -> Observation:
        assert self.scenario is not None
        assert self.cognitive_metrics is not None
        return Observation(
            task_id=self.task_id,
            task_description=self.task_config["description"],
            segments=[seg.model_copy(deep=True) for seg in self.scenario.segments],
            cognitive_metrics=self.cognitive_metrics.model_copy(deep=True),
            step=self.step_count,
            max_steps=self.max_steps,
            actions_taken=[a.operation for a in self.action_history],
            constraints=deepcopy(self.task_config.get("constraints", {})),
        )

    def reset(self, task_id: str) -> Observation:
        """Start a fresh task episode and return initial observation."""
        self.task_config = get_task_config(task_id)
        self.task_id = task_id
        self.max_steps = int(self.task_config["max_steps"])
        self.scenario = build_scenario(self.task_config)
        self.cognitive_metrics = self._simulate()
        self.initial_metrics = self.cognitive_metrics.model_copy(deep=True)
        self.step_count = 0
        self.done = False
        self.reward_trajectory = []
        self.action_history = []
        self.emphasis_action_count = 0
        self.last_reward_info = {}
        return self._build_observation()

    def state(self) -> EnvState:
        """Return full current state for debugging and replay."""
        if self.scenario is None or self.cognitive_metrics is None:
            raise RuntimeError("Environment is not initialized. Call reset(task_id) first.")
        heatmap: list[list[float]] = []
        for idx, _seg in enumerate(self.scenario.segments):
            heatmap.append(
                [
                    self.cognitive_metrics.attention_scores[idx],
                    self.cognitive_metrics.memory_retention[idx],
                ]
            )
        return EnvState(
            scenario=self.scenario.model_copy(deep=True),
            cognitive_metrics=self.cognitive_metrics.model_copy(deep=True),
            simulation_mode="parametric",
            step=self.step_count,
            max_steps=self.max_steps,
            task_id=self.task_id,
            done=self.done,
            reward_trajectory=self.reward_trajectory[:],
            action_history=[action.model_copy(deep=True) for action in self.action_history],
            cognitive_heatmap=heatmap,
            initial_metrics=self.initial_metrics.model_copy(deep=True) if self.initial_metrics else None,
        )

    def grade(self) -> GradeResult:
        """Grade the current episode state at any time."""
        if self.scenario is None or self.cognitive_metrics is None or self.initial_metrics is None:
            raise RuntimeError("Environment is not initialized. Call reset(task_id) first.")
        return grade_episode(
            task_id=self.task_id,
            initial_metrics=self.initial_metrics,
            final_metrics=self.cognitive_metrics,
            action_history=self.action_history,
            constraints_ok=self._task_constraints_ok(),
            steps_taken=self.step_count,
            max_steps=self.max_steps,
        )

    def _find_segment_idx(self, segment_id: str) -> int:
        assert self.scenario is not None
        for idx, seg in enumerate(self.scenario.segments):
            if seg.id == segment_id:
                return idx
        raise ValueError(f"Unknown segment_id '{segment_id}'")

    def _sync_positions(self) -> None:
        assert self.scenario is not None
        for idx, seg in enumerate(self.scenario.segments):
            seg.position = idx
            seg.word_count = max(1, len(seg.content.split()))

    def _apply_action(self, action: Action) -> None:
        assert self.scenario is not None
        segments = self.scenario.segments
        params = action.params

        if action.operation == "reorder":
            new_order = params.get("new_order")
            if not isinstance(new_order, list) or sorted(new_order) != list(range(len(segments))):
                raise ValueError("reorder requires params.new_order as a full index permutation.")
            self.scenario.segments = [segments[i] for i in new_order]

        elif action.operation == "swap":
            pos_a = params.get("pos_a")
            pos_b = params.get("pos_b")
            if not isinstance(pos_a, int) or not isinstance(pos_b, int):
                raise ValueError("swap requires integer params.pos_a and params.pos_b.")
            if pos_a < 0 or pos_b < 0 or pos_a >= len(segments) or pos_b >= len(segments):
                raise ValueError("swap indices out of range.")
            segments[pos_a], segments[pos_b] = segments[pos_b], segments[pos_a]

        elif action.operation == "emphasize":
            segment_id = params.get("segment_id")
            if not isinstance(segment_id, str):
                raise ValueError("emphasize requires params.segment_id.")
            idx = self._find_segment_idx(segment_id)
            segments[idx].emphasis_level = min(3, segments[idx].emphasis_level + 1)
            self.emphasis_action_count += 1

        elif action.operation == "de_emphasize":
            segment_id = params.get("segment_id")
            if not isinstance(segment_id, str):
                raise ValueError("de_emphasize requires params.segment_id.")
            idx = self._find_segment_idx(segment_id)
            segments[idx].emphasis_level = max(0, segments[idx].emphasis_level - 1)

        elif action.operation == "modify_hook":
            strategy = params.get("strategy")
            if strategy not in {"question", "statistic", "story", "bold_claim"}:
                raise ValueError("modify_hook strategy must be one of question|statistic|story|bold_claim.")
            hook_idx = next((i for i, seg in enumerate(segments) if seg.segment_type == "hook"), None)
            if hook_idx is None:
                raise ValueError("No hook segment exists for modify_hook.")
            hook = segments[hook_idx]
            if strategy == "question":
                hook.content = "What if this one decision could save your team hours each week?"
                hook.has_question = True
            elif strategy == "statistic":
                hook.content = "Teams report up to 32 percent faster launch cycles after adoption."
                hook.has_number = True
            elif strategy == "story":
                hook.content = "Last quarter, one team replaced chaos with a predictable weekly rhythm."
                hook.emotional_intensity = min(1.0, hook.emotional_intensity + 0.2)
            else:
                hook.content = "This is the fastest path from draft to trusted campaign release."
                hook.emphasis_level = min(3, hook.emphasis_level + 1)

        elif action.operation == "split_segment":
            segment_id = params.get("segment_id")
            if not isinstance(segment_id, str):
                raise ValueError("split_segment requires params.segment_id.")
            idx = self._find_segment_idx(segment_id)
            source = segments[idx]
            words = source.content.split()
            if len(words) < 6:
                raise ValueError("split_segment requires at least 6 words.")
            midpoint = len(words) // 2
            source.content = " ".join(words[:midpoint])
            clone = source.model_copy(deep=True)
            clone.id = f"{source.id}_b"
            clone.content = " ".join(words[midpoint:])
            clone.complexity_score = min(1.0, clone.complexity_score + 0.05)
            segments.insert(idx + 1, clone)

        elif action.operation == "merge_segments":
            segment_ids = params.get("segment_ids")
            if not isinstance(segment_ids, list) or len(segment_ids) != 2:
                raise ValueError("merge_segments requires params.segment_ids with two ids.")
            idx_a = self._find_segment_idx(segment_ids[0])
            idx_b = self._find_segment_idx(segment_ids[1])
            if abs(idx_a - idx_b) != 1:
                raise ValueError("merge_segments only supports adjacent segments.")
            left = min(idx_a, idx_b)
            right = max(idx_a, idx_b)
            seg_left = segments[left]
            seg_right = segments[right]
            seg_left.content = f"{seg_left.content} {seg_right.content}".strip()
            seg_left.complexity_score = min(1.0, (seg_left.complexity_score + seg_right.complexity_score) / 2 + 0.05)
            seg_left.emotional_intensity = min(
                1.0, (seg_left.emotional_intensity + seg_right.emotional_intensity) / 2
            )
            del segments[right]

        elif action.operation == "set_pacing":
            segment_id = params.get("segment_id")
            pacing = params.get("pacing")
            if not isinstance(segment_id, str) or pacing not in {"fast", "medium", "slow"}:
                raise ValueError("set_pacing requires params.segment_id and params.pacing in fast|medium|slow.")
            idx = self._find_segment_idx(segment_id)
            segments[idx].pacing = pacing
        else:
            raise ValueError(f"Unsupported operation '{action.operation}'")

        self._sync_positions()

    def _task_constraints_ok(self) -> bool:
        assert self.scenario is not None
        assert self.cognitive_metrics is not None
        constraints = self.task_config.get("constraints", {})
        load_limit = constraints.get("max_cognitive_load")
        if isinstance(load_limit, float) and self.cognitive_metrics.cognitive_load > load_limit:
            return False
        brand_id = self.scenario.brand_segment_id
        if constraints.get("brand_segment_must_be_top_2") and brand_id:
            brand_idx = self._find_segment_idx(brand_id)
            if brand_idx > 1:
                return False
        cta_id = self.scenario.cta_segment_id
        if constraints.get("cta_must_be_last") and cta_id:
            cta_idx = self._find_segment_idx(cta_id)
            if cta_idx != len(self.scenario.segments) - 1:
                return False
        max_emphasis_actions = constraints.get("max_emphasis_actions")
        if isinstance(max_emphasis_actions, int) and self.emphasis_action_count > max_emphasis_actions:
            return False
        return True

    def step(self, action: Action) -> tuple[Observation, float, bool, dict]:
        """Apply one action and return observation, reward, done, info."""
        if self.scenario is None or self.cognitive_metrics is None:
            raise RuntimeError("Environment is not initialized. Call reset(task_id) first.")
        if self.done:
            return self._build_observation(), 0.0, True, {"message": "Episode already finished."}

        previous_scenario = self.scenario.model_copy(deep=True)
        previous_metrics = self.cognitive_metrics.model_copy(deep=True)
        previous_emphasis_count = self.emphasis_action_count

        invalid_action_error = None
        try:
            self._apply_action(action)
            self.cognitive_metrics = self._simulate()
            if not self._task_constraints_ok():
                raise ValueError("Action violates task constraints.")
        except Exception as exc:
            self.scenario = previous_scenario
            self.cognitive_metrics = previous_metrics
            self.emphasis_action_count = previous_emphasis_count
            invalid_action_error = str(exc)

        self.action_history.append(action)
        action_names = [a.operation for a in self.action_history]
        if invalid_action_error is not None:
            reward_value = -0.20
            reward_info = {
                "total_reward": reward_value,
                "error": invalid_action_error,
                "reason": "invalid_action",
            }
        else:
            reward_info_model = compute_reward(previous_metrics, self.cognitive_metrics, action_names, self.task_id)
            reward_value = reward_info_model.total_reward
            reward_info = reward_info_model.model_dump()

        self.step_count += 1
        self.reward_trajectory.append(reward_value)
        self.last_reward_info = reward_info

        self.done = self.step_count >= self.max_steps
        info: dict = {"reward_info": reward_info}

        if self.done and self.initial_metrics is not None:
            final_grade = self.grade()
            info["grade"] = final_grade.model_dump()

        return self._build_observation(), reward_value, self.done, info
