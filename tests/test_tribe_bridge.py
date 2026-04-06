"""Tests for strict TRIBE bridge validation and mapping."""

from backend.src.tribe_bridge import (
    TribeAdapterError,
    TribeRoiTimeseries,
    map_tribe_roi_timeseries_to_metrics,
    validate_roi_timeseries,
)


def test_validate_roi_timeseries_normalizes_to_bounds() -> None:
    payload = TribeRoiTimeseries(
        attention=[-1.0, 0.5, 2.0],
        memory=[0.1, 0.2, 0.3],
        emotion=[0.4, 0.5, 0.6],
        load=[0.7, 0.8, 0.9],
    )
    validated = validate_roi_timeseries(payload)
    assert validated.attention == [0.0, 0.5, 1.0]


def test_validate_roi_timeseries_rejects_empty_series() -> None:
    payload = TribeRoiTimeseries(attention=[], memory=[0.1], emotion=[0.2], load=[0.3])
    try:
        validate_roi_timeseries(payload)
        assert False, "Expected TribeAdapterError for empty attention series."
    except TribeAdapterError:
        assert True


def test_map_roi_timeseries_to_metrics_has_valid_ranges() -> None:
    metrics = map_tribe_roi_timeseries_to_metrics(
        attention_timeseries=[0.9, 0.8, 0.7, 0.8, 0.9],
        memory_timeseries=[0.5, 0.6, 0.5, 0.6, 0.5],
        emotion_timeseries=[0.7, 0.7, 0.6, 0.6, 0.7],
        load_timeseries=[0.3, 0.4, 0.3, 0.4, 0.3],
        segment_count=5,
        source="tribev2",
    )
    assert metrics.simulation_source == "tribev2"
    assert all(0.0 <= x <= 1.0 for x in metrics.attention_scores)
    assert all(0.0 <= x <= 1.0 for x in metrics.memory_retention)
    assert 0.0 <= metrics.cognitive_load <= 1.0
    assert -1.0 <= metrics.emotional_valence <= 1.0
