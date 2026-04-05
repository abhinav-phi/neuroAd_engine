"""Tests for hosted TRIBE Space integration."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

from src import app as app_module
from src.tribe_space import TribeSpaceClient, TribeSpaceError, normalize_space_analysis


class _FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload
        self.ok = 200 <= status_code < 300
        self.text = payload if isinstance(payload, str) else str(payload)

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def test_predict_text_uses_text_payload_first(monkeypatch) -> None:
    calls: list[dict] = []

    def fake_request(method: str, url: str, json=None, data=None, files=None, headers=None, timeout=None):  # noqa: ANN001
        _ = data, files, headers, timeout
        calls.append({"method": method, "url": url, "json": json})
        return _FakeResponse(200, {"scores": {"viral_potential": 74, "attention_capture": 69}})

    monkeypatch.setattr("requests.request", fake_request)

    client = TribeSpaceClient(base_url="https://example-space.test", api_token="")
    result = client.predict_text("test transcript")

    assert result["scores"]["viral_potential"] == 74
    assert calls == [
        {
            "method": "POST",
            "url": "https://example-space.test/predict/text",
            "json": {"text": "test transcript"},
        }
    ]


def test_predict_text_falls_back_to_input_and_data_payloads(monkeypatch) -> None:
    calls: list[dict] = []

    def fake_request(method: str, url: str, json=None, data=None, files=None, headers=None, timeout=None):  # noqa: ANN001
        _ = data, files, headers, timeout
        calls.append({"method": method, "url": url, "json": json})
        if len(calls) < 3:
            return _FakeResponse(422, {"detail": "wrong input format"})
        return _FakeResponse(200, {"score": 0.74, "analysis": "fallback path worked"})

    monkeypatch.setattr("requests.request", fake_request)

    client = TribeSpaceClient(base_url="https://example-space.test", api_token="")
    result = client.predict_text("test transcript")

    assert result["score"] == 0.74
    assert calls[0]["json"] == {"text": "test transcript"}
    assert calls[1]["json"] == {"input": "test transcript"}
    assert calls[2]["json"] == {"data": ["test transcript"]}


def test_predict_video_posts_file_payload(monkeypatch) -> None:
    calls: list[dict[str, object]] = []
    scratch_dir = Path("./cache/test_tribe_space_client")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    video_path = scratch_dir / "demo.mp4"
    video_path.write_bytes(b"video-bytes")

    def fake_request(method: str, url: str, json=None, data=None, files=None, headers=None, timeout=None):  # noqa: ANN001
        _ = headers, timeout
        calls.append({"method": method, "url": url, "json": json, "data": data, "files": files})
        return _FakeResponse(200, {"status": "ok", "scores": {"viral_potential": 77}})

    monkeypatch.setattr("requests.request", fake_request)

    client = TribeSpaceClient(base_url="https://example-space.test", api_token="hf_test")
    result = client.predict_video(video_path)

    assert result["scores"]["viral_potential"] == 77
    assert calls[0]["url"] == "https://example-space.test/predict/video"
    assert calls[0]["data"] == {"hf_token": "hf_test"}
    file_tuple = calls[0]["files"]["file"]  # type: ignore[index]
    assert file_tuple[0] == "demo.mp4"


def test_predict_text_warms_up_and_retries_on_503(monkeypatch) -> None:
    calls: list[dict] = []

    def fake_request(method: str, url: str, json=None, data=None, files=None, headers=None, timeout=None):  # noqa: ANN001
        _ = data, files, headers, timeout
        calls.append({"method": method, "url": url, "json": json})
        if url.endswith("/predict/text") and len([c for c in calls if c["url"].endswith("/predict/text")]) == 1:
            return _FakeResponse(503, {"detail": "space cold"})
        if url.endswith("/warmup"):
            return _FakeResponse(200, {"status": "warming"})
        if url.endswith("/health"):
            return _FakeResponse(200, {"model_loaded": True, "status": "ok"})
        return _FakeResponse(200, {"score": 0.61, "summary": "Recovered after warmup"})

    monkeypatch.setattr("requests.request", fake_request)

    client = TribeSpaceClient(base_url="https://example-space.test")
    result = client.predict_text("retry transcript")

    assert result["score"] == 0.61
    assert [call["url"] for call in calls] == [
        "https://example-space.test/predict/text",
        "https://example-space.test/warmup",
        "https://example-space.test/health",
        "https://example-space.test/predict/text",
    ]


def test_normalize_space_analysis_uses_score_and_summary() -> None:
    normalized = normalize_space_analysis({"score": 81, "message": "Strong engagement"})
    assert normalized["score"] == 0.81
    assert normalized["summary"] == "Strong engagement"
    assert normalized["metrics"]["engagement"] == 0.81


def test_normalize_space_analysis_understands_space_scores_payload() -> None:
    normalized = normalize_space_analysis(
        {
            "status": "ok",
            "scores": {
                "viral_potential": 82.0,
                "attention_capture": 71.0,
                "language_processing": 68.0,
                "emotional_valence": 57.0,
                "activation_timeline": [0.44, 0.31, 0.53],
            },
        }
    )
    assert normalized["score"] == 0.82
    assert normalized["metrics"]["avgAttention"] == 0.71
    assert normalized["metrics"]["avgMemory"] == 0.68
    assert normalized["metrics"]["avgValence"] == 0.14
    assert normalized["metrics"]["attentionPattern"] == "U-Shaped"


def test_warmup_route_proxies_space_result(monkeypatch) -> None:
    fake_client = SimpleNamespace(warmup=lambda: {"status": "ok"})
    monkeypatch.setattr(app_module, "_get_tribe_space_client", lambda: fake_client)
    monkeypatch.setattr(app_module, "_get_tribe_space_module", lambda: SimpleNamespace(TribeSpaceError=TribeSpaceError))
    client = TestClient(app_module.app)
    response = client.post("/warmup")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["result"] == {"status": "ok"}


def test_warmup_route_maps_space_errors(monkeypatch) -> None:
    def fail():
        raise TribeSpaceError("Space unavailable")

    fake_client = SimpleNamespace(warmup=fail)
    monkeypatch.setattr(app_module, "_get_tribe_space_client", lambda: fake_client)
    monkeypatch.setattr(app_module, "_get_tribe_space_module", lambda: SimpleNamespace(TribeSpaceError=TribeSpaceError))
    client = TestClient(app_module.app)
    response = client.post("/warmup")
    assert response.status_code == 503
    assert "Space unavailable" in response.text


def test_predict_route_returns_summary_and_cleans_up(monkeypatch) -> None:
    scratch_dir = Path("./cache/test_tribe_space")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    upload_path = scratch_dir / "upload.mp4"

    monkeypatch.setattr(app_module, "_save_uploaded_video", lambda file: upload_path)
    fake_module = SimpleNamespace(
        TribeSpaceError=TribeSpaceError,
        extract_audio_from_video=lambda video, audio: audio.write_bytes(b"audio"),
        transcribe_audio=lambda audio: "This is a strong product pitch with useful details.",
        condense_text_for_space=lambda text: text,
        normalize_space_analysis=lambda payload: {
            "summary": payload["summary"],
            "score": payload["score"],
            "metrics": {
                "engagement": payload["score"],
                "avgAttention": payload["score"],
                "avgMemory": payload["score"],
                "avgLoad": None,
                "avgValence": None,
                "attentionPattern": "Flat",
            },
        },
    )
    fake_client = SimpleNamespace(
        warmup=lambda: {"status": "warming"},
        wait_until_ready=lambda: {"model_loaded": True},
        predict_text=lambda text: {"score": 0.82, "summary": f"Processed {text}"},
    )
    monkeypatch.setattr(app_module, "_get_tribe_space_module", lambda: fake_module)
    monkeypatch.setattr(app_module, "_get_tribe_space_client", lambda: fake_client)

    client = TestClient(app_module.app)
    response = client.post(
        "/predict",
        files={"file": ("demo.mp4", b"video-bytes", "video/mp4")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["simulation_source"] == "tribe_space"
    assert payload["transcript"] == "This is a strong product pitch with useful details."
    assert payload["score"] == 0.82
    assert payload["metrics"]["engagement"] == 0.82
    assert not upload_path.exists()


def test_predict_route_falls_back_when_audio_processing_fails(monkeypatch) -> None:
    scratch_dir = Path("./cache/test_tribe_space")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    upload_path = scratch_dir / "upload-fail.mp4"

    monkeypatch.setattr(app_module, "_save_uploaded_video", lambda file: upload_path)
    fake_module = SimpleNamespace(
        TribeSpaceError=TribeSpaceError,
        extract_audio_from_video=lambda video, audio: (_ for _ in ()).throw(RuntimeError("ffmpeg failed")),
    )
    fake_client = SimpleNamespace()
    monkeypatch.setattr(app_module, "_get_tribe_space_module", lambda: fake_module)
    monkeypatch.setattr(app_module, "_get_tribe_space_client", lambda: fake_client)

    client = TestClient(app_module.app)
    response = client.post(
        "/predict",
        files={"file": ("demo.mp4", b"video-bytes", "video/mp4")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["simulation_source"] == "parametric"
    assert payload["analysis"]["fallback"] is True
    assert "ffmpeg failed" in payload["analysis"]["hosted_error"]
    assert not upload_path.exists()


def test_predict_route_falls_back_when_transcript_too_short(monkeypatch) -> None:
    scratch_dir = Path("./cache/test_tribe_space")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    upload_path = scratch_dir / "upload-short.mp4"

    monkeypatch.setattr(app_module, "_save_uploaded_video", lambda file: upload_path)
    fake_module = SimpleNamespace(
        TribeSpaceError=TribeSpaceError,
        extract_audio_from_video=lambda video, audio: audio.write_bytes(b"audio"),
        transcribe_audio=lambda audio: "ok",
        condense_text_for_space=lambda text: text,
    )
    fake_client = SimpleNamespace(
        warmup=lambda: {"status": "warming"},
        wait_until_ready=lambda: {"model_loaded": True},
        predict_text=lambda text: {"score": 0.99, "summary": "Should not be called"},
    )
    monkeypatch.setattr(app_module, "_get_tribe_space_module", lambda: fake_module)
    monkeypatch.setattr(app_module, "_get_tribe_space_client", lambda: fake_client)

    client = TestClient(app_module.app)
    response = client.post(
        "/predict",
        files={"file": ("demo.mp4", b"video-bytes", "video/mp4")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["simulation_source"] == "parametric"
    assert payload["transcript"] == "ok"
    assert payload["analysis"]["fallback"] is True
    assert payload["analysis"]["hosted_error"] == "Transcript too short for hosted TRIBE scoring."
