"""Shared data models used across the environment, simulator, grader, and API."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AdSegment(BaseModel):
    """A single ad segment in the ordered ad narrative."""

    id: str = Field(..., description="Unique segment id.", examples=["seg_0", "seg_cta"])
    content: str = Field(..., description="Segment text shown to users.")
    segment_type: Literal[
        "hook",
        "feature",
        "testimonial",
        "data",
        "cta",
        "brand_safety",
        "emotional",
        "comparison",
    ] = Field(..., description="Semantic class of the segment.")
    word_count: int = Field(..., ge=1, le=250, description="Number of words in this segment.")
    complexity_score: float = Field(..., ge=0.0, le=1.0, description="Cognitive complexity score.")
    emotional_intensity: float = Field(..., ge=0.0, le=1.0, description="Emotion intensity score.")
    has_question: bool = Field(default=False, description="Whether content contains a question.")
    has_number: bool = Field(default=False, description="Whether content contains numeric evidence.")
    position: int = Field(..., ge=0, description="Current index in ordered scenario.")
    emphasis_level: int = Field(default=0, ge=0, le=3, description="Stylistic emphasis level.")
    pacing: Literal["fast", "medium", "slow"] = Field(
        default="medium", description="Delivery pace estimate for the segment."
    )


class AdScenario(BaseModel):
    """Whole ad scenario containing all ordered segments and metadata."""

    segments: list[AdSegment] = Field(..., min_length=3, max_length=20)
    product_category: str = Field(default="general")
    target_audience: str = Field(default="general")
    brand_segment_id: Optional[str] = Field(default=None)
    cta_segment_id: Optional[str] = Field(default=None)


class BrainRegionActivation(BaseModel):
    """Predicted activation for a specific brain region."""

    region_name: str = Field(...)
    activation_level: float = Field(..., ge=0.0, le=1.0)
    hemisphere: Literal["left", "right", "bilateral"] = Field(default="bilateral")
    cognitive_function: str = Field(...)


class BrainResponse(BaseModel):
    """Raw regional response either from TRIBE v2 or parametric approximation."""

    source: Literal["tribev2", "parametric"] = Field(...)
    region_activations: list[BrainRegionActivation] = Field(default_factory=list)
    cortical_attention_map: list[float] = Field(default_factory=list)
    cortical_memory_map: list[float] = Field(default_factory=list)
    cortical_emotion_map: list[float] = Field(default_factory=list)
    cortical_load_map: list[float] = Field(default_factory=list)


class CognitiveMetrics(BaseModel):
    """Computed cognitive response metrics for the current ad ordering."""

    attention_scores: list[float] = Field(...)
    memory_retention: list[float] = Field(...)
    cognitive_load: float = Field(..., ge=0.0, le=1.0)
    emotional_valence: float = Field(..., ge=-1.0, le=1.0)
    engagement_score: float = Field(..., ge=0.0, le=1.0)
    attention_flow: Literal["rising", "falling", "u_shaped", "flat"] = Field(...)
    simulation_source: Literal["tribev2", "parametric"] = Field(default="parametric")
    brain_response: Optional[BrainResponse] = Field(default=None)


class Observation(BaseModel):
    """Agent-facing observation returned from reset and step."""

    task_id: str = Field(...)
    task_description: str = Field(...)
    segments: list[AdSegment] = Field(...)
    cognitive_metrics: CognitiveMetrics = Field(...)
    step: int = Field(..., ge=0)
    max_steps: int = Field(..., ge=1)
    actions_taken: list[str] = Field(default_factory=list)
    constraints: dict = Field(default_factory=dict)


class Action(BaseModel):
    """Action selected by the agent."""

    operation: Literal[
        "reorder",
        "swap",
        "emphasize",
        "de_emphasize",
        "modify_hook",
        "split_segment",
        "merge_segments",
        "set_pacing",
    ] = Field(...)
    params: dict = Field(default_factory=dict)


class RewardInfo(BaseModel):
    """Dense reward component breakdown."""

    total_reward: float = Field(..., ge=-1.0, le=1.0)
    attention_delta: float = Field(...)
    memory_delta: float = Field(...)
    engagement_delta: float = Field(...)
    load_penalty: float = Field(...)
    repetition_penalty: float = Field(...)
    novelty_bonus: float = Field(...)
    flow_bonus: float = Field(...)


class EnvState(BaseModel):
    """Serializable full environment state for debugging and replay."""

    scenario: AdScenario = Field(...)
    cognitive_metrics: CognitiveMetrics = Field(...)
    step: int = Field(...)
    max_steps: int = Field(...)
    task_id: str = Field(...)
    done: bool = Field(...)
    reward_trajectory: list[float] = Field(default_factory=list)
    action_history: list[Action] = Field(default_factory=list)
    cognitive_heatmap: list[list[float]] = Field(default_factory=list)
    initial_metrics: Optional[CognitiveMetrics] = Field(default=None)


class GradeResult(BaseModel):
    """Task grading result with numeric score and rubric details."""

    score: float = Field(..., ge=0.0, le=1.0)
    breakdown: dict = Field(default_factory=dict)
    task_id: str = Field(...)
    steps_taken: int = Field(..., ge=0)
    feedback: str = Field(default="")
