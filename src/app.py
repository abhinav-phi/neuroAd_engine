"""FastAPI application entrypoint for the hackathon project."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.env import CognitiveAdEnv, load_tribev2_model
from src.models import Action, AdScenario, AdSegment, BrainRegionActivation, BrainResponse, CognitiveMetrics
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
UPLOAD_CACHE_DIR = Path("./cache/video_uploads")
UPLOAD_CACHE_DIR.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def _get_tribe_space_module():
    from src import tribe_space as module

    return module


@lru_cache(maxsize=1)
def _get_tribe_space_client():
    module = _get_tribe_space_module()
    return module.TribeSpaceClient()


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


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _clamp11(value: float) -> float:
    return max(-1.0, min(1.0, float(value)))


def _segment_series(values: np.ndarray, segment_count: int = 4) -> list[float]:
    chunks = np.array_split(values.astype(float), segment_count)
    return [_clamp01(float(chunk.mean()) if chunk.size else 0.0) for chunk in chunks]


def _classify_attention_flow(attention_scores: list[float]) -> str:
    if len(attention_scores) < 3:
        return "flat"
    first = attention_scores[0]
    last = attention_scores[-1]
    middle = attention_scores[1:-1]
    if first < last - 0.05:
        return "rising"
    if last < first - 0.05:
        return "falling"
    if middle and min(first, last) > sum(middle) / len(middle) + 0.05:
        return "u_shaped"
    return "flat"


def _frontend_metrics_from_cognitive(metrics: CognitiveMetrics) -> dict:
    avg_attention = float(sum(metrics.attention_scores) / max(1, len(metrics.attention_scores)))
    avg_memory = float(sum(metrics.memory_retention) / max(1, len(metrics.memory_retention)))
    pattern_map = {
        "u_shaped": "U-Shaped",
        "rising": "Rising",
        "falling": "Declining",
        "flat": "Flat",
    }
    return {
        "engagement": _clamp01(metrics.engagement_score),
        "avgAttention": _clamp01(avg_attention),
        "avgMemory": _clamp01(avg_memory),
        "avgLoad": _clamp01(metrics.cognitive_load),
        "avgValence": _clamp11(metrics.emotional_valence),
        "attentionPattern": pattern_map.get(metrics.attention_flow, "Flat"),
    }


def _build_parametric_video_fallback(
    *,
    message: str,
    transcript: str | None = None,
    scoring_text: str | None = None,
    hosted_error: str | None = None,
    source: str = "parametric",
) -> dict:
    seed_text = scoring_text or transcript or "optimize engagement today"
    fallback_metrics = simulate_parametric(_build_text_scenario(seed_text))
    return {
        "available": True,
        "message": message,
        "simulation_source": source,
        "transcript": transcript,
        "scoring_text": scoring_text,
        "analysis": {
            "fallback": True,
            "hosted_error": hosted_error,
        },
        "summary": "Fallback analysis generated from available video context.",
        "score": _clamp01(fallback_metrics.engagement_score),
        "metrics": _frontend_metrics_from_cognitive(fallback_metrics),
    }


def _build_brain_response_from_series(
    attention_scores: list[float],
    memory_scores: list[float],
    emotion_scores: list[float],
    load_scores: list[float],
) -> BrainResponse:
    region_specs = [
        ("V1", attention_scores, "Visual salience"),
        ("PEF", attention_scores, "Attention orientation"),
        ("Hippocampus", memory_scores, "Memory encoding"),
        ("Amygdala", emotion_scores, "Emotional salience"),
        ("IFSa", [1.0 - score for score in load_scores], "Executive control"),
    ]
    activations = [
        BrainRegionActivation(
            region_name=name,
            activation_level=_clamp01(sum(values) / max(1, len(values))),
            hemisphere="bilateral",
            cognitive_function=function,
        )
        for name, values, function in region_specs
    ]
    return BrainResponse(
        source="tribev2",
        region_activations=activations,
        cortical_attention_map=attention_scores,
        cortical_memory_map=memory_scores,
        cortical_emotion_map=emotion_scores,
        cortical_load_map=load_scores,
    )


def _summarize_tribe_predictions(preds: object) -> CognitiveMetrics:
    arr = np.asarray(preds, dtype=float)
    if arr.ndim != 2 or arr.shape[0] < 1 or arr.shape[1] < 1:
        raise ValueError("TRIBE v2 returned predictions with an unexpected shape.")

    per_timestep_abs = np.abs(arr).mean(axis=1)
    max_abs = float(per_timestep_abs.max()) if per_timestep_abs.size else 1.0
    normalized_attention = per_timestep_abs / max(max_abs, 1e-6)

    cumulative = np.cumsum(normalized_attention)
    memory_curve = cumulative / np.arange(1, len(cumulative) + 1)
    centered = arr.mean(axis=1)
    emotion_curve = np.clip(np.tanh(centered * 4.0) * 0.5 + 0.5, 0.0, 1.0)
    load_curve = np.clip(arr.std(axis=1) / max(float(arr.std()) * 2.0, 1e-6), 0.0, 1.0)

    attention_scores = _segment_series(normalized_attention)
    memory_scores = _segment_series(memory_curve)
    emotion_scores = _segment_series(emotion_curve)
    load_scores = _segment_series(load_curve)

    cognitive_load = _clamp01(sum(load_scores) / max(1, len(load_scores)))
    emotional_valence = _clamp11((sum(emotion_scores) / max(1, len(emotion_scores)) - 0.5) * 2.0)
    engagement_score = _clamp01(
        0.45 * (sum(attention_scores) / max(1, len(attention_scores)))
        + 0.35 * (sum(memory_scores) / max(1, len(memory_scores)))
        + 0.20 * (1.0 - cognitive_load)
    )

    return CognitiveMetrics(
        attention_scores=attention_scores,
        memory_retention=memory_scores,
        cognitive_load=cognitive_load,
        emotional_valence=emotional_valence,
        engagement_score=engagement_score,
        attention_flow=_classify_attention_flow(attention_scores),
        simulation_source="tribev2",
        brain_response=_build_brain_response_from_series(
            attention_scores, memory_scores, emotion_scores, load_scores
        ),
    )


def _ensure_tribe_model(features_to_use: list[str] | None = None) -> object:
    if features_to_use == ["image"]:
        cached = getattr(env, "tribe_image_model", None)
        if cached is not None:
            return cached
    elif env.tribe_model is not None:
        return env.tribe_model
    try:
        model = load_tribev2_model(
            "./cache",
            config_update={"data.features_to_use": features_to_use} if features_to_use else None,
        )
        if features_to_use == ["image"]:
            setattr(env, "tribe_image_model", model)
            return model
        env.tribe_model = model
        env.use_tribev2 = True
        return env.tribe_model
    except Exception as exc:  # pragma: no cover - depends on local install
        raise RuntimeError(
            f"TRIBE v2 could not be loaded: {exc}"
        ) from exc


def _save_uploaded_video(file: UploadFile) -> Path:
    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    target = UPLOAD_CACHE_DIR / f"uploaded_{uuid4().hex}{suffix}"
    return target


def _validate_video_upload(file: UploadFile) -> None:
    suffix = Path(file.filename or "").suffix.lower()
    allowed_suffixes = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    if file.content_type and file.content_type.startswith("video/"):
        return
    if suffix in allowed_suffixes:
        return
    raise HTTPException(status_code=400, detail="Please upload a supported video file.")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "tribe-v2-api",
        "endpoints": ["/health", "/warmup", "/predict"],
    }


@app.post("/warmup")
@app.post("/tribe-space/warmup")
def warmup_tribe_space() -> dict:
    module = _get_tribe_space_module()
    tribe_space_client = _get_tribe_space_client()
    try:
        result = tribe_space_client.warmup()
    except module.TribeSpaceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok", "result": result}


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


@app.post("/tribe_predict_image")
async def tribe_predict_image(file: UploadFile = File(...)) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        model = _ensure_tribe_model(features_to_use=["image"])
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        upload_cache = Path("./cache/uploads")
        upload_cache.mkdir(parents=True, exist_ok=True)
        video_path = upload_cache / f"tribe_input_{uuid4().hex}.mp4"
        _write_image_as_video(raw_bytes, video_path)
        events = model.get_events_dataframe(video_path=str(video_path))
        preds, _segments = model.predict(events=events)
        metrics = _summarize_tribe_predictions(preds)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"TRIBE v2 image inference failed: {exc}",
        ) from exc
    finally:
        if "video_path" in locals():
            try:
                Path(video_path).unlink(missing_ok=True)
            except Exception:
                pass

    return {
        "available": True,
        "message": "Image analyzed with TRIBE v2 by converting it into a short repeated-frame video clip.",
        "simulation_source": metrics.simulation_source,
        "metrics": metrics.model_dump(),
        "brain_response": metrics.brain_response.model_dump() if metrics.brain_response else None,
    }


async def _predict_from_uploaded_video(file: UploadFile) -> dict:
    module = _get_tribe_space_module()
    tribe_space_client = _get_tribe_space_client()
    _validate_video_upload(file)
    video_path = _save_uploaded_video(file)
    audio_path = video_path.with_suffix(".mp3")
    transcript: str | None = None
    scoring_text: str | None = None
    hosted_error: str | None = None

    try:
        content = await file.read()
        if not content:
            return _build_parametric_video_fallback(
                message="Uploaded video was empty, so a local fallback analysis was returned.",
                hosted_error="Uploaded video is empty.",
            )
        video_path.write_bytes(content)
        try:
            module.extract_audio_from_video(video_path, audio_path)
            transcript = module.transcribe_audio(audio_path)
            scoring_text = module.condense_text_for_space(transcript)
        except RuntimeError as exc:
            return _build_parametric_video_fallback(
                message="Audio extraction or transcription failed, so a local fallback analysis was returned.",
                hosted_error=str(exc),
            )

        if len((scoring_text or "").strip()) < 5:
            return _build_parametric_video_fallback(
                message="Not enough spoken content was detected, so a local fallback analysis was returned.",
                transcript=transcript,
                scoring_text=scoring_text,
                hosted_error="Transcript too short for hosted TRIBE scoring.",
            )

        try:
            tribe_space_client.warmup()
            tribe_space_client.wait_until_ready()
        except module.TribeSpaceError:
            pass
        try:
            analysis = tribe_space_client.predict_text(scoring_text)
            normalized = module.normalize_space_analysis(analysis)
            return {
                "available": True,
                "message": "Video analyzed via local transcript extraction and condensed-text TRIBE scoring.",
                "simulation_source": "tribe_space",
                "transcript": transcript,
                "scoring_text": scoring_text,
                "analysis": analysis,
                "summary": normalized["summary"],
                "score": normalized["score"],
                "metrics": normalized["metrics"],
            }
        except module.TribeSpaceError as exc:
            hosted_error = str(exc)
            return _build_parametric_video_fallback(
                message="Hosted TRIBE Space failed or timed out, so a local fallback analysis was returned.",
                transcript=transcript,
                scoring_text=scoring_text,
                hosted_error=hosted_error,
            )
    except RuntimeError as exc:
        return _build_parametric_video_fallback(
            message="An unexpected runtime issue occurred, so a local fallback analysis was returned.",
            transcript=transcript,
            scoring_text=scoring_text,
            hosted_error=str(exc),
        )
    finally:
        for artifact in (video_path, audio_path):
            try:
                artifact.unlink(missing_ok=True)
            except Exception:
                pass


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    return await _predict_from_uploaded_video(file)


@app.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)) -> dict:
    return await _predict_from_uploaded_video(file)
