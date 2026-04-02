"""Tests for calibration artifact generation and coefficient loading."""

import json
from pathlib import Path

from calibration.calibrate import _build_payload
from src.simulator import DEFAULT_COEFFICIENTS, load_parametric_coefficients


def test_build_payload_has_required_sections() -> None:
    payload = _build_payload(source_dataset="unit_test", method="test_method")
    assert payload["schema_version"] == "1.0"
    assert payload["artifact_version"] == "coefficients.v1"
    assert "coefficients" in payload
    assert "metric_correlations" in payload


def test_coefficients_round_trip_from_json(tmp_path: Path) -> None:
    payload = _build_payload(source_dataset="unit_test", method="test_method")
    target = tmp_path / "coefficients.v1.json"
    target.write_text(json.dumps(payload), encoding="utf-8")
    loaded = load_parametric_coefficients(target)
    assert loaded == payload["coefficients"]


def test_coefficients_loader_falls_back_to_defaults_for_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "missing.json"
    loaded = load_parametric_coefficients(missing)
    assert loaded == DEFAULT_COEFFICIENTS
