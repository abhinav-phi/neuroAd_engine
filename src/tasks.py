"""Task definitions for easy, medium, and hard ad optimization scenarios."""

from __future__ import annotations

from copy import deepcopy

from src.models import AdScenario, AdSegment


def _segment(
    seg_id: str,
    content: str,
    segment_type: str,
    position: int,
    complexity: float,
    emotion: float,
    has_question: bool = False,
    has_number: bool = False,
    pacing: str = "medium",
) -> AdSegment:
    return AdSegment(
        id=seg_id,
        content=content,
        segment_type=segment_type,  # type: ignore[arg-type]
        word_count=max(1, len(content.split())),
        complexity_score=complexity,
        emotional_intensity=emotion,
        has_question=has_question,
        has_number=has_number,
        position=position,
        pacing=pacing,  # type: ignore[arg-type]
    )


TASK_1_EASY = {
    "task_id": "task_1_easy",
    "description": "Improve attention and engagement for a simple product ad without overloading users.",
    "max_steps": 8,
    "constraints": {"max_cognitive_load": 0.75},
    "segments": [
        _segment("seg_feature_0", "Our app has a clean interface and easy setup.", "feature", 0, 0.45, 0.20),
        _segment("seg_data_1", "73 percent of users complete setup in under 5 minutes.", "data", 1, 0.35, 0.18, has_number=True),
        _segment("seg_hook_2", "Want to finish your workday earlier?", "hook", 2, 0.30, 0.45, has_question=True),
        _segment("seg_testimonial_3", "I finally stopped juggling five tools every day.", "testimonial", 3, 0.40, 0.55),
        _segment("seg_cta_4", "Start your free trial now.", "cta", 4, 0.20, 0.35),
    ],
}

TASK_2_MEDIUM = {
    "task_id": "task_2_medium",
    "description": "Balance memory retention and emotional response while preserving clarity.",
    "max_steps": 10,
    "constraints": {"max_cognitive_load": 0.72, "target_flow": "u_shaped"},
    "segments": [
        _segment("seg_feature_0", "Our wearable tracks sleep, stress, and hydration in one dashboard.", "feature", 0, 0.58, 0.25),
        _segment("seg_comparison_1", "Unlike generic trackers, it explains why your pattern changed.", "comparison", 1, 0.62, 0.30),
        _segment("seg_hook_2", "What if your body could warn you before burnout?", "hook", 2, 0.36, 0.58, has_question=True),
        _segment("seg_data_3", "In an 8-week pilot, retention improved by 31 percent.", "data", 3, 0.41, 0.22, has_number=True),
        _segment("seg_emotional_4", "Imagine ending each week with energy to spare.", "emotional", 4, 0.30, 0.70),
        _segment("seg_cta_5", "Join the early access program today.", "cta", 5, 0.22, 0.40),
    ],
}

TASK_3_HARD = {
    "task_id": "task_3_hard",
    "description": "Maximize engagement under strict policy and ordering constraints in a regulated ad.",
    "max_steps": 12,
    "constraints": {
        "max_cognitive_load": 0.70,
        "brand_segment_must_be_top_2": True,
        "cta_must_be_last": True,
        "max_emphasis_actions": 2,
        "target_flow": "rising",
    },
    "segments": [
        _segment("seg_feature_0", "Our compliance assistant flags risky wording before campaigns launch.", "feature", 0, 0.55, 0.20),
        _segment("seg_brand_1", "Trusted by regulated teams in finance and healthcare.", "brand_safety", 1, 0.35, 0.32),
        _segment("seg_data_2", "Median review cycle time dropped by 42 percent in Q1.", "data", 2, 0.45, 0.25, has_number=True),
        _segment("seg_comparison_3", "Manual review takes hours and still misses edge cases.", "comparison", 3, 0.60, 0.22),
        _segment("seg_emotional_4", "Ship with confidence, not late-night anxiety.", "emotional", 4, 0.30, 0.68),
        _segment("seg_cta_5", "Book a guided demo with our policy team.", "cta", 5, 0.26, 0.38),
    ],
    "brand_segment_id": "seg_brand_1",
    "cta_segment_id": "seg_cta_5",
}

TASKS = {
    TASK_1_EASY["task_id"]: TASK_1_EASY,
    TASK_2_MEDIUM["task_id"]: TASK_2_MEDIUM,
    TASK_3_HARD["task_id"]: TASK_3_HARD,
}


def get_task_config(task_id: str) -> dict:
    """Return a detached task config for safe mutation inside an episode."""
    if task_id not in TASKS:
        raise ValueError(f"Unknown task_id '{task_id}'. Expected one of: {', '.join(TASKS)}")
    return deepcopy(TASKS[task_id])


def build_scenario(task_config: dict) -> AdScenario:
    """Build the episode scenario from task config."""
    segments = [seg.model_copy(deep=True) for seg in task_config["segments"]]
    for idx, seg in enumerate(segments):
        seg.position = idx
    return AdScenario(
        segments=segments,
        product_category=task_config.get("product_category", "general"),
        target_audience=task_config.get("target_audience", "general"),
        brand_segment_id=task_config.get("brand_segment_id"),
        cta_segment_id=task_config.get("cta_segment_id"),
    )
