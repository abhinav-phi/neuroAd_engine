"""Hosted TRIBE Space client and video-analysis helpers."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
import time
from typing import Any

import imageio_ffmpeg
import requests


TRIBE_SPACE_URL = os.environ.get("TRIBE_SPACE_URL", "https://atharv-1447-meta-tribe-v2-api.hf.space").rstrip("/")
TRIBE_SPACE_TIMEOUT_SECONDS = float(os.environ.get("TRIBE_SPACE_TIMEOUT_SECONDS", "300"))
TRIBE_SPACE_READY_TIMEOUT_SECONDS = float(os.environ.get("TRIBE_SPACE_READY_TIMEOUT_SECONDS", "240"))
WHISPER_MODEL_ID = os.environ.get("WHISPER_MODEL_ID", "openai/whisper-small")
WHISPER_CACHE_DIR = os.environ.get("WHISPER_CACHE_DIR", str(Path("./cache/whisper_hf").resolve()))


class TribeSpaceError(RuntimeError):
    """Raised when the hosted TRIBE Space cannot process a request."""

    def __init__(self, message: str, *, status_code: int | None = None, payload: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


class TribeSpaceClient:
    """Thin wrapper around the hosted TRIBE Hugging Face Space."""

    def __init__(self, base_url: str | None = None, api_token: str | None = None) -> None:
        self.base_url = (base_url or os.environ.get("TRIBE_SPACE_URL", TRIBE_SPACE_URL)).rstrip("/")
        self.api_token = (
            api_token
            if api_token is not None
            else os.environ.get("TRIBE_SPACE_API_TOKEN", os.environ.get("HF_TOKEN", "")).strip()
        )

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        json_payload: dict[str, Any] | None = None,
        data_payload: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(
                method=method,
                url=url,
                json=json_payload,
                data=data_payload,
                files=files,
                headers=self._headers(),
                timeout=TRIBE_SPACE_TIMEOUT_SECONDS,
            )
        except requests.Timeout as exc:
            raise TribeSpaceError("Hosted TRIBE Space timed out.", payload={"path": path}) from exc
        except requests.RequestException as exc:
            raise TribeSpaceError(f"Hosted TRIBE Space request failed: {exc}", payload={"path": path}) from exc

        try:
            payload = response.json()
        except ValueError:
            payload = response.text

        if response.ok:
            return payload

        detail = payload if isinstance(payload, str) else json.dumps(payload)
        raise TribeSpaceError(
            f"Hosted TRIBE Space error {response.status_code}: {detail}",
            status_code=response.status_code,
            payload=payload,
        )

    def health(self) -> Any:
        return self._request("GET", "/health")

    def warmup(self) -> Any:
        payload = {"hf_token": self.api_token} if self.api_token else None
        return self._request("POST", "/warmup", json_payload=payload)

    def wait_until_ready(self, max_wait_s: float | None = None, poll_s: float = 5.0) -> Any:
        deadline = time.time() + (max_wait_s or TRIBE_SPACE_READY_TIMEOUT_SECONDS)
        last_payload: Any = None
        while time.time() < deadline:
            last_payload = self.health()
            if isinstance(last_payload, dict):
                if last_payload.get("model_loaded") is True:
                    return last_payload
                if last_payload.get("error"):
                    raise TribeSpaceError(
                        f"Hosted TRIBE Space reported load error: {last_payload['error']}",
                        payload=last_payload,
                    )
            time.sleep(poll_s)
        raise TribeSpaceError(
            "Hosted TRIBE Space is still not ready after waiting.",
            payload=last_payload,
        )

    def predict_text(self, text: str) -> Any:
        attempts = [
            {"text": text, **({"hf_token": self.api_token} if self.api_token else {})},
            {"input": text},
            {"data": [text]},
        ]
        last_error: TribeSpaceError | None = None
        for payload in attempts:
            warmed = False
            for _ in range(2):
                try:
                    return self._request("POST", "/predict/text", json_payload=payload)
                except TribeSpaceError as exc:
                    last_error = exc
                    if (exc.status_code in {502, 503, 504} or "timed out" in str(exc).lower()) and not warmed:
                        warmed = True
                        try:
                            self.warmup()
                            self.wait_until_ready()
                        except TribeSpaceError:
                            pass
                        time.sleep(3.0)
                        continue
                    if (payload.get("text") is not None or payload.get("input") is not None) and exc.status_code in {
                        400,
                        404,
                        422,
                    }:
                        break
                    raise
        raise last_error or TribeSpaceError("Hosted TRIBE Space predict call failed.")

    def predict_video(self, video_path: Path) -> Any:
        if not video_path.exists():
            raise TribeSpaceError(f"Uploaded video file does not exist: {video_path}")

        warmed = False
        for _ in range(2):
            with video_path.open("rb") as handle:
                files = {"file": (video_path.name, handle, "video/mp4")}
                data_payload = {"hf_token": self.api_token} if self.api_token else None
                try:
                    return self._request("POST", "/predict/video", data_payload=data_payload, files=files)
                except TribeSpaceError as exc:
                    if exc.status_code in {502, 503, 504} and not warmed:
                        warmed = True
                        try:
                            self.warmup()
                        except TribeSpaceError:
                            pass
                        time.sleep(1.5)
                        continue
                    raise

        raise TribeSpaceError("Hosted TRIBE Space video prediction failed after retry.")


def _find_first_numeric(payload: Any, candidate_keys: set[str]) -> float | None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            key_l = key.lower()
            if key_l in candidate_keys and isinstance(value, (int, float)):
                return float(value)
            nested = _find_first_numeric(value, candidate_keys)
            if nested is not None:
                return nested
    elif isinstance(payload, list):
        for item in payload:
            nested = _find_first_numeric(item, candidate_keys)
            if nested is not None:
                return nested
    return None


def _find_first_text(payload: Any, candidate_keys: set[str]) -> str | None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            key_l = key.lower()
            if key_l in candidate_keys and isinstance(value, str) and value.strip():
                return value.strip()
            nested = _find_first_text(value, candidate_keys)
            if nested:
                return nested
    elif isinstance(payload, list):
        for item in payload:
            nested = _find_first_text(item, candidate_keys)
            if nested:
                return nested
    elif isinstance(payload, str) and payload.strip():
        return payload.strip()
    return None


def _normalize_score(value: float | None) -> float | None:
    if value is None:
        return None
    if value > 1.0 and value <= 100.0:
        value = value / 100.0
    return max(0.0, min(1.0, float(value)))


def normalize_space_analysis(payload: Any) -> dict[str, Any]:
    """Map a hosted Space payload into a stable UI-facing summary."""
    scores_payload = payload.get("scores") if isinstance(payload, dict) and isinstance(payload.get("scores"), dict) else payload

    score = _normalize_score(
        _find_first_numeric(
            scores_payload,
            {
                "score",
                "engagement",
                "overall_score",
                "overall",
                "value",
                "overall_brain_engagement",
                "viral_potential",
            },
        )
    )
    attention = _normalize_score(
        _find_first_numeric(scores_payload, {"attention", "attention_score", "attention_capture"})
    )
    memory = _normalize_score(
        _find_first_numeric(
            scores_payload,
            {"memory", "memory_score", "retention", "language_processing", "visual_imagery"},
        )
    )
    load = _normalize_score(_find_first_numeric(scores_payload, {"load", "cognitive_load"}))
    valence = _find_first_numeric(scores_payload, {"valence", "emotion", "emotional_valence"})
    if valence is not None and -1.0 <= float(valence) <= 1.0:
        valence_value: float | None = round(float(valence), 4)
    else:
        normalized_valence = _normalize_score(valence)
        valence_value = None if normalized_valence is None else round(normalized_valence * 2.0 - 1.0, 4)

    if attention is None and score is not None:
        attention = score
    if memory is None and score is not None:
        memory = score

    summary = _find_first_text(
        payload,
        {"analysis", "summary", "message", "result", "explanation", "status"},
    )
    if summary is None:
        summary = "Hosted TRIBE Space returned a prediction payload."

    pattern_text = _find_first_text(scores_payload, {"attention_pattern", "attention_flow", "pattern"})
    attention_pattern = "Flat"
    if pattern_text:
        lower = pattern_text.lower()
        if "u" in lower:
            attention_pattern = "U-Shaped"
        elif "rise" in lower:
            attention_pattern = "Rising"
        elif "declin" in lower or "fall" in lower:
            attention_pattern = "Declining"
    elif isinstance(scores_payload, dict):
        timeline = scores_payload.get("activation_timeline")
        if isinstance(timeline, list) and len(timeline) >= 3:
            first = float(timeline[0])
            middle = float(timeline[len(timeline) // 2])
            last = float(timeline[-1])
            if first > middle and last > middle:
                attention_pattern = "U-Shaped"
            elif last > first:
                attention_pattern = "Rising"
            elif last < first:
                attention_pattern = "Declining"

    return {
        "summary": summary,
        "score": score,
        "metrics": {
            "engagement": score,
            "avgAttention": attention,
            "avgMemory": memory,
            "avgLoad": load,
            "avgValence": valence_value,
            "attentionPattern": attention_pattern,
        },
    }


def condense_text_for_space(text: str, max_words: int = 48, max_chars: int = 320) -> str:
    normalized = " ".join(text.split()).strip()
    if not normalized:
        raise RuntimeError("Transcript is empty after normalization.")

    words = normalized.split()
    if len(words) <= max_words and len(normalized) <= max_chars:
        return normalized

    head_words = words[: max_words // 2]
    tail_words = words[-(max_words - len(head_words)) :] if len(words) > max_words else []
    condensed = " ".join(head_words + (["..."] if tail_words else []) + tail_words).strip()

    if len(condensed) > max_chars:
        condensed = condensed[: max_chars - 3].rstrip() + "..."

    return condensed


def ensure_ffmpeg_available() -> str:
    candidates = [
        os.environ.get("FFMPEG_PATH"),
        shutil.which("ffmpeg"),
        shutil.which("ffmpeg.exe"),
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    try:
        bundled = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        bundled = None

    if bundled and Path(bundled).exists():
        return bundled

    raise RuntimeError(
        "ffmpeg is required for video analysis but was not found. "
        "Install ffmpeg or set FFMPEG_PATH to a working executable."
    )


def extract_audio_from_video(video_path: Path, audio_path: Path) -> None:
    ffmpeg_path = ensure_ffmpeg_available()
    result = subprocess.run(
        [
            ffmpeg_path,
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "mp3",
            str(audio_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() or "Unknown ffmpeg error"
        raise RuntimeError(f"ffmpeg failed while extracting audio: {stderr}")


@lru_cache(maxsize=1)
def _get_whisper_pipeline():
    import torch
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

    cache_dir = Path(WHISPER_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    try:
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            WHISPER_MODEL_ID,
            dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
            cache_dir=str(cache_dir),
        )
        model.to(device)
        processor = AutoProcessor.from_pretrained(
            WHISPER_MODEL_ID,
            cache_dir=str(cache_dir),
        )
    except Exception as exc:  # pragma: no cover - depends on runtime/model download
        raise RuntimeError(
            f"Hugging Face Whisper model '{WHISPER_MODEL_ID}' could not be loaded: {exc}"
        ) from exc

    return pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        chunk_length_s=30,
        dtype=torch_dtype,
        device=device,
        ignore_warning=True,
    )


def transcribe_audio(audio_path: Path) -> str:
    asr_pipeline = _get_whisper_pipeline()
    try:
        result = asr_pipeline(
            str(audio_path),
            generate_kwargs={
                "task": "transcribe",
            },
            return_timestamps=False,
        )
    except Exception as exc:  # pragma: no cover - depends on runtime/model download
        raise RuntimeError(f"Whisper transcription failed: {exc}") from exc

    text = str(result.get("text", "")).strip()
    if not text:
        raise RuntimeError("Whisper transcription returned empty text.")
    return text
