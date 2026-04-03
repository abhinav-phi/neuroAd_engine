"""FastAPI application entrypoint for the hackathon project."""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.env import CognitiveAdEnv
from src.models import Action, AdScenario, AdSegment
from src.simulator import simulate_parametric, simulate_with_tribev2


class ResetRequest(BaseModel):
    task_id: str = Field(..., description="One of task_1_easy, task_2_medium, task_3_hard")


class TribePredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Ad copy text to simulate")


app = FastAPI(title="NeuroAd OpenEnv API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
USE_TRIBEV2 = os.environ.get("USE_TRIBEV2", "false").lower() == "true"
env = CognitiveAdEnv(use_tribev2=USE_TRIBEV2)


def _build_text_scenario(text: str) -> AdScenario:
    tokens = [t for t in text.split() if t.strip()]
    if len(tokens) < 3:
        tokens = (tokens + ["optimize", "engagement", "today"])[:3]

    n = len(tokens)
    first = max(1, n // 3)
    second = max(first + 1, (2 * n) // 3)

    chunks = [
        " ".join(tokens[:first]),
        " ".join(tokens[first:second]) or "Learn why this message matters.",
        " ".join(tokens[second:]) or "Start your free trial today.",
    ]

    segments = [
        AdSegment(
            id="seg_hook_0",
            content=chunks[0],
            segment_type="hook",
            word_count=max(1, len(chunks[0].split())),
            complexity_score=0.35,
            emotional_intensity=0.55,
            has_question="?" in chunks[0],
            has_number=any(ch.isdigit() for ch in chunks[0]),
            position=0,
            emphasis_level=0,
            pacing="medium",
        ),
        AdSegment(
            id="seg_feature_1",
            content=chunks[1],
            segment_type="feature",
            word_count=max(1, len(chunks[1].split())),
            complexity_score=0.50,
            emotional_intensity=0.30,
            has_question="?" in chunks[1],
            has_number=any(ch.isdigit() for ch in chunks[1]),
            position=1,
            emphasis_level=0,
            pacing="medium",
        ),
        AdSegment(
            id="seg_cta_2",
            content=chunks[2],
            segment_type="cta",
            word_count=max(1, len(chunks[2].split())),
            complexity_score=0.25,
            emotional_intensity=0.45,
            has_question="?" in chunks[2],
            has_number=any(ch.isdigit() for ch in chunks[2]),
            position=2,
            emphasis_level=0,
            pacing="medium",
        ),
    ]

    return AdScenario(segments=segments, cta_segment_id="seg_cta_2")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "neuroad-openenv"}


@app.post("/reset")
def reset(payload: ResetRequest) -> dict:
    try:
        obs = env.reset(payload.task_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"observation": obs.model_dump()}


@app.post("/step")
def step(action: Action) -> dict:
    try:
        observation, reward, done, info = env.step(action)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "observation": observation.model_dump(),
        "reward": reward,
        "done": done,
        "info": info,
    }


@app.post("/grade")
def grade() -> dict:
    try:
        result = env.grade()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"grade": result.model_dump()}


@app.get("/state")
def state() -> dict:
    try:
        current = env.state()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"state": current.model_dump()}


@app.post("/tribe_predict")
def tribe_predict(payload: TribePredictRequest) -> dict:
    scenario = _build_text_scenario(payload.text)

    if env.use_tribev2 and env.tribe_model is not None:
        metrics = simulate_with_tribev2(
            scenario,
            tribe_model=env.tribe_model,
            adapter=getattr(env, "tribe_adapter", None),
        )
        available = True
        message = "TRIBE v2 mode requested. Response may still fallback if adapter/model output is unavailable."
    else:
        metrics = simulate_parametric(scenario)
        available = False
        message = "TRIBE v2 model not active; returning calibrated parametric simulation."

    return {
        "available": available,
        "message": message,
        "simulation_source": metrics.simulation_source,
        "metrics": metrics.model_dump(),
        "brain_response": metrics.brain_response.model_dump() if metrics.brain_response else None,
    }
