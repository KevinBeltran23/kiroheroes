"""
Tests for results.py — result document shaping and output structure.
"""
from __future__ import annotations

import pytest

from app.results import shape_result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_metrics(
    right_label: str = "wrist-break",
    left_label: str = "wrist-break",
    height_delta: float = 0.01,
    intervals: list[float] | None = None,
) -> dict:
    """Build a minimal metrics dict matching the output of compute_metrics."""
    if intervals is None:
        intervals = [0.1, 0.1, 0.1]

    hand_scores = {
        "finger_pct": 20.0,
        "wrist_pct": 60.0,
        "arm_pct": 20.0,
        "compactness": 0.6,
        "finger_raw": 0.05,
        "wrist_raw": 0.15,
        "arm_raw": 0.05,
    }

    return {
        "scores": {
            "timing": 80.0,
            "symmetry": 85.0,
            "strokeConsistency": 75.0,
            "postureStability": 90.0,
            "overall": 82.5,
        },
        "intervals": intervals,
        "leftRange": 0.12,
        "rightRange": 0.12 + height_delta,
        "heightDelta": height_delta,
        "leftMotion": [0.5, 0.6, 0.5, 0.6],
        "rightMotion": [0.5, 0.6, 0.5, 0.6],
        "rightHand": {
            "label": right_label,
            "scores": hand_scores,
            "explanation": f"Right hand explanation for {right_label}.",
            "ruleMatched": "test rule",
        },
        "leftHand": {
            "label": left_label,
            "scores": hand_scores,
            "explanation": f"Left hand explanation for {left_label}.",
            "ruleMatched": "test rule",
        },
        "overallSummary": "Overall summary text.",
    }


# ---------------------------------------------------------------------------
# Output structure
# ---------------------------------------------------------------------------

class TestShapeResultStructure:
    def test_returns_session_and_user_ids(self):
        result = shape_result(
            _make_metrics(), session_id="sess1", user_id="user1", thumbnail_path=None
        )
        assert result["sessionId"] == "sess1"
        assert result["userId"] == "user1"

    def test_returns_summary_scores(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert "summaryScores" in result
        assert "overall" in result["summaryScores"]

    def test_returns_right_and_left_hand_blocks(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert "rightHand" in result
        assert "leftHand" in result

    def test_hand_blocks_have_label(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert "label" in result["rightHand"]
        assert "label" in result["leftHand"]

    def test_hand_blocks_have_contribution_pcts(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        for side in ("rightHand", "leftHand"):
            for key in ("fingerPct", "wristPct", "armPct"):
                assert key in result[side], f"Missing {key} in {side}"

    def test_returns_overall_summary(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert "overallSummary" in result
        assert len(result["overallSummary"]) > 0

    def test_returns_metrics_list(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert isinstance(result["metrics"], list)
        assert len(result["metrics"]) > 0

    def test_metrics_have_required_fields(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        for metric in result["metrics"]:
            for field in ("id", "label", "value", "unit", "description"):
                assert field in metric, f"Metric missing field: {field}"

    def test_returns_flags(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert isinstance(result["flags"], list)
        assert len(result["flags"]) > 0

    def test_returns_feedback_items(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert isinstance(result["feedbackItems"], list)

    def test_returns_chart_series(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert "chartSeries" in result
        for key in ("leftHandMotion", "rightHandMotion", "timingDrift", "consistency"):
            assert key in result["chartSeries"]

    def test_thumbnail_path_in_artifact_paths(self):
        result = shape_result(
            _make_metrics(), session_id="s", user_id="u", thumbnail_path="path/to/thumb.jpg"
        )
        assert result["artifactPaths"]["thumbnailPath"] == "path/to/thumb.jpg"

    def test_null_thumbnail_path(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        assert result["artifactPaths"]["thumbnailPath"] is None


# ---------------------------------------------------------------------------
# Flags logic
# ---------------------------------------------------------------------------

class TestShapeResultFlags:
    def test_no_flags_when_motion_stable(self):
        metrics = _make_metrics(height_delta=0.01, intervals=[0.1, 0.1, 0.1])
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        flag_ids = [f["id"] for f in result["flags"]]
        assert "stable-motion" in flag_ids

    def test_height_asymmetry_flag_when_delta_large(self):
        metrics = _make_metrics(height_delta=0.06)
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        flag_ids = [f["id"] for f in result["flags"]]
        assert "height-asymmetry" in flag_ids

    def test_timing_variation_flag_when_intervals_uneven(self):
        # Large spread in intervals → timing variation > 0.12
        metrics = _make_metrics(intervals=[0.05, 0.5, 0.05, 0.5])
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        flag_ids = [f["id"] for f in result["flags"]]
        assert "timing-variation" in flag_ids

    def test_no_stable_flag_when_issues_present(self):
        metrics = _make_metrics(height_delta=0.06)
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        flag_ids = [f["id"] for f in result["flags"]]
        assert "stable-motion" not in flag_ids

    def test_timeline_events_match_flags(self):
        metrics = _make_metrics(height_delta=0.06)
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        flag_ids = {f["id"] for f in result["flags"]}
        event_ids = {e["id"] for e in result["timelineEvents"]}
        assert flag_ids == event_ids


# ---------------------------------------------------------------------------
# Feedback items
# ---------------------------------------------------------------------------

class TestShapeResultFeedback:
    def test_feedback_items_have_required_fields(self):
        result = shape_result(_make_metrics(), session_id="s", user_id="u", thumbnail_path=None)
        for item in result["feedbackItems"]:
            for field in ("id", "type", "severity", "title", "explanation", "suggestion"):
                assert field in item, f"Feedback item missing field: {field}"

    def test_asymmetry_feedback_when_hands_differ(self):
        metrics = _make_metrics(right_label="arm-heavy", left_label="wrist-break")
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        ids = [item["id"] for item in result["feedbackItems"]]
        assert "hand-asymmetry" in ids

    def test_no_asymmetry_feedback_when_hands_same(self):
        metrics = _make_metrics(right_label="wrist-break", left_label="wrist-break")
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        ids = [item["id"] for item in result["feedbackItems"]]
        assert "hand-asymmetry" not in ids

    def test_height_feedback_added_when_flagged(self):
        metrics = _make_metrics(height_delta=0.06)
        result = shape_result(metrics, session_id="s", user_id="u", thumbnail_path=None)
        ids = [item["id"] for item in result["feedbackItems"]]
        assert "match-height" in ids
