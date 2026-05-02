"""
Tests for metrics.py — stroke peak detection, timing/symmetry scores,
and per-hand contribution + approach label output.
"""
from __future__ import annotations

import pytest

from app.metrics import compute_metrics, detect_stroke_peaks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_full_trajectories(n: int = 10) -> dict:
    """
    Build a minimal but complete trajectory dict that covers all keys
    used by compute_metrics, feature_extraction, and the classifier.
    """
    def osc(base_y: float, amp: float = 0.1) -> list[tuple[float, float]]:
        """Oscillating y trajectory to produce detectable stroke peaks."""
        return [(0.5, base_y + amp * (1 if i % 2 == 0 else -1)) for i in range(n)]

    def linear(x: float, y: float, dy: float = 0.005) -> list[tuple[float, float]]:
        return [(x, y + i * dy) for i in range(n)]

    traj: dict = {}

    # Pose landmarks
    traj["left_wrist"] = osc(0.6, amp=0.08)
    traj["right_wrist"] = osc(0.6, amp=0.09)
    traj["left_elbow"] = linear(0.4, 0.45)
    traj["right_elbow"] = linear(0.6, 0.45)
    traj["left_shoulder"] = linear(0.35, 0.25)
    traj["right_shoulder"] = linear(0.65, 0.25)

    # Hand landmarks — fingertips
    for side in ("left", "right"):
        for joint in ("index_tip", "middle_tip", "ring_tip", "pinky_tip", "thumb_tip"):
            traj[f"{side}_hand_{joint}"] = osc(0.55, amp=0.03)

    return traj


# ---------------------------------------------------------------------------
# detect_stroke_peaks
# ---------------------------------------------------------------------------

class TestDetectStrokePeaks:
    def test_finds_local_maxima(self):
        assert detect_stroke_peaks([0.1, 0.5, 0.2, 0.6, 0.1]) == [1, 3]

    def test_empty_list(self):
        assert detect_stroke_peaks([]) == []

    def test_too_short(self):
        assert detect_stroke_peaks([0.5, 0.6]) == []

    def test_monotone_increasing_no_peaks(self):
        assert detect_stroke_peaks([0.1, 0.2, 0.3, 0.4]) == []

    def test_monotone_decreasing_no_peaks(self):
        assert detect_stroke_peaks([0.4, 0.3, 0.2, 0.1]) == []

    def test_plateau_not_a_peak(self):
        # Equal neighbours → not strictly greater
        assert detect_stroke_peaks([0.1, 0.5, 0.5, 0.1]) == []

    def test_nan_frames_skipped(self):
        import math
        values = [0.1, 0.5, float("nan"), 0.6, 0.1]
        peaks = detect_stroke_peaks(values)
        # Index 1 has nan neighbour at 2, index 3 has nan neighbour at 2 — both skipped
        assert 1 not in peaks
        assert 3 not in peaks

    def test_single_peak(self):
        assert detect_stroke_peaks([0.1, 0.9, 0.1]) == [1]


# ---------------------------------------------------------------------------
# compute_metrics — output structure
# ---------------------------------------------------------------------------

class TestComputeMetricsStructure:
    def test_returns_scores_block(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert "scores" in result
        for key in ("timing", "symmetry", "strokeConsistency", "postureStability", "overall"):
            assert key in result["scores"]

    def test_scores_are_bounded_0_to_100(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        for key, val in result["scores"].items():
            assert 0.0 <= val <= 100.0, f"Score '{key}' out of range: {val}"

    def test_returns_per_hand_blocks(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert "rightHand" in result
        assert "leftHand" in result

    def test_per_hand_has_label(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        valid_labels = {"arm-heavy", "fulcrum-lift", "lead-by-the-bead", "wrist-break"}
        assert result["rightHand"]["label"] in valid_labels
        assert result["leftHand"]["label"] in valid_labels

    def test_per_hand_has_scores(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        for side in ("rightHand", "leftHand"):
            scores = result[side]["scores"]
            for key in ("finger_pct", "wrist_pct", "arm_pct", "compactness"):
                assert key in scores

    def test_per_hand_contribution_sums_to_100(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        for side in ("rightHand", "leftHand"):
            scores = result[side]["scores"]
            total = scores["finger_pct"] + scores["wrist_pct"] + scores["arm_pct"]
            assert total == pytest.approx(100.0, abs=0.5), f"{side} contributions don't sum to 100"

    def test_returns_overall_summary(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert "overallSummary" in result
        assert len(result["overallSummary"]) > 0

    def test_returns_motion_series(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert "leftMotion" in result
        assert "rightMotion" in result

    def test_returns_range_values(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert result["leftRange"] >= 0.0
        assert result["rightRange"] >= 0.0
        assert result["heightDelta"] >= 0.0

    def test_per_hand_has_explanation(self):
        traj = _make_full_trajectories()
        result = compute_metrics(traj, sample_fps=10)
        assert len(result["rightHand"]["explanation"]) > 0
        assert len(result["leftHand"]["explanation"]) > 0


# ---------------------------------------------------------------------------
# compute_metrics — edge cases
# ---------------------------------------------------------------------------

class TestComputeMetricsEdgeCases:
    def test_empty_trajectories_dont_crash(self):
        result = compute_metrics({}, sample_fps=10)
        assert "scores" in result
        assert "rightHand" in result
        assert "leftHand" in result

    def test_single_frame_doesnt_crash(self):
        traj = {k: [(0.5, 0.5)] for k in [
            "left_wrist", "right_wrist", "left_shoulder", "right_shoulder",
            "left_elbow", "right_elbow",
        ]}
        result = compute_metrics(traj, sample_fps=10)
        assert "scores" in result

    def test_all_nan_trajectories_dont_crash(self):
        nan = float("nan")
        traj = {k: [(nan, nan)] * 5 for k in [
            "left_wrist", "right_wrist", "left_shoulder", "right_shoulder",
            "left_elbow", "right_elbow",
        ]}
        result = compute_metrics(traj, sample_fps=10)
        assert "scores" in result
