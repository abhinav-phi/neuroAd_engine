"""FastAPI application entrypoint for the hackathon project."""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.env import CognitiveAdEnv
from src.models import Action


class ResetRequest(BaseModel):
    task_id: str = Field(..., description="One of task_1_easy, task_2_medium, task_3_hard")


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


@app.get("/state")
def state() -> dict:
    try:
        current = env.state()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"state": current.model_dump()}
