"""
Tests for feature_extraction.py — geometry helpers and per-hand raw signal extraction.
"""
from __future__ import annotations

import math

import pytest

from app.feature_extraction import (
    _angle_deg,
    _cumulative_displacement,
    _dist,
    _finger_motion_relative_to_palm,
    extract_left_hand_features,
    extract_right_hand_features,
)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

class TestDist:
    def test_zero_distance(self):
        assert _dist((0.0, 0.0), (0.0, 0.0)) == 0.0

    def test_horizontal(self):
        assert _dist((0.0, 0.0), (3.0, 0.0)) == pytest.approx(3.0)

    def test_diagonal(self):
        assert _dist((0.0, 0.0), (3.0, 4.0)) == pytest.approx(5.0)


class TestAngleDeg:
    def test_right_angle(self):
        # vertex at origin, a along x-axis, b along y-axis → 90°
        angle = _angle_deg((1.0, 0.0), (0.0, 0.0), (0.0, 1.0))
        assert angle == pytest.approx(90.0, abs=0.1)

    def test_straight_line(self):
        # a-vertex-b collinear → 180°
        angle = _angle_deg((-1.0, 0.0), (0.0, 0.0), (1.0, 0.0))
        assert angle == pytest.approx(180.0, abs=0.1)

    def test_nan_returns_none(self):
        assert _angle_deg((float("nan"), 0.0), (0.0, 0.0), (1.0, 0.0)) is None

    def test_zero_length_vector_returns_none(self):
        # vertex == a → zero-length vector
        assert _angle_deg((0.0, 0.0), (0.0, 0.0), (1.0, 0.0)) is None


class TestCumulativeDisplacement:
    def test_stationary(self):
        traj = [(0.1, 0.2)] * 5
        assert _cumulative_displacement(traj) == pytest.approx(0.0)

    def test_linear_motion(self):
        # 4 steps of 0.1 each → total 0.4
        traj = [(i * 0.1, 0.0) for i in range(5)]
        assert _cumulative_displacement(traj) == pytest.approx(0.4, abs=1e-6)

    def test_nan_frames_skipped(self):
        traj = [(0.0, 0.0), (float("nan"), float("nan")), (0.1, 0.0)]
        # Only the (nan→0.1) pair is skipped; (0.0→nan) also skipped
        assert _cumulative_displacement(traj) == pytest.approx(0.0)


class TestFingerMotionRelativeToPalm:
    def test_no_motion(self):
        palm = [(0.5, 0.5)] * 3
        tips = [[(0.6, 0.6)] * 3]
        assert _finger_motion_relative_to_palm(tips, palm) == pytest.approx(0.0)

    def test_finger_moves_palm_stationary(self):
        palm = [(0.5, 0.5)] * 3
        # tip moves 0.1 in x each frame relative to palm
        tips = [[(0.5 + i * 0.1, 0.5) for i in range(3)]]
        result = _finger_motion_relative_to_palm(tips, palm)
        assert result == pytest.approx(0.2, abs=1e-6)

    def test_palm_moves_tip_stationary(self):
        # If palm and tip move together, relative motion is zero
        tips = [[(0.5 + i * 0.1, 0.5) for i in range(3)]]
        palm = [(0.5 + i * 0.1, 0.5) for i in range(3)]
        assert _finger_motion_relative_to_palm(tips, palm) == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Per-hand feature extraction
# ---------------------------------------------------------------------------

def _make_trajectories(n: int = 5) -> dict:
    """Build minimal trajectories with simple linear motion for testing."""
    def linear(start_x, start_y, dx=0.01, dy=0.01):
        return [(start_x + i * dx, start_y + i * dy) for i in range(n)]

    traj = {}
    # Pose landmarks
    for key, sx, sy in [
        ("right_shoulder", 0.3, 0.2), ("right_elbow", 0.4, 0.4), ("right_wrist", 0.5, 0.6),
        ("left_shoulder", 0.7, 0.2), ("left_elbow", 0.6, 0.4), ("left_wrist", 0.5, 0.6),
    ]:
        traj[key] = linear(sx, sy)

    # Hand landmarks — fingertips and palm proxy
    for side in ("right", "left"):
        for joint in ("index_tip", "middle_tip", "ring_tip", "pinky_tip", "thumb_tip"):
            traj[f"{side}_hand_{joint}"] = linear(0.5, 0.5, dx=0.02, dy=0.01)

    return traj


class TestExtractRightHandFeatures:
    def test_returns_required_keys(self):
        traj = _make_trajectories()
        result = extract_right_hand_features(traj)
        assert set(result.keys()) == {"finger_raw", "wrist_raw", "arm_raw", "compactness"}

    def test_all_values_non_negative(self):
        traj = _make_trajectories()
        result = extract_right_hand_features(traj)
        for key, val in result.items():
            assert val >= 0.0, f"{key} should be non-negative, got {val}"

    def test_compactness_bounded(self):
        traj = _make_trajectories()
        result = extract_right_hand_features(traj)
        assert 0.0 <= result["compactness"] <= 1.0

    def test_stationary_gives_zero_motion(self):
        n = 5
        traj = {k: [(0.5, 0.5)] * n for k in [
            "right_shoulder", "right_elbow", "right_wrist",
            "right_hand_index_tip", "right_hand_middle_tip",
            "right_hand_ring_tip", "right_hand_pinky_tip", "right_hand_thumb_tip",
        ]}
        result = extract_right_hand_features(traj)
        assert result["finger_raw"] == pytest.approx(0.0)
        assert result["wrist_raw"] == pytest.approx(0.0)

    def test_missing_landmarks_dont_crash(self):
        # Completely empty trajectories should not raise
        result = extract_right_hand_features({})
        assert "finger_raw" in result


class TestExtractLeftHandFeatures:
    def test_returns_required_keys(self):
        traj = _make_trajectories()
        result = extract_left_hand_features(traj)
        assert set(result.keys()) == {"finger_raw", "wrist_raw", "arm_raw", "compactness"}

    def test_all_values_non_negative(self):
        traj = _make_trajectories()
        result = extract_left_hand_features(traj)
        for key, val in result.items():
            assert val >= 0.0, f"{key} should be non-negative, got {val}"

    def test_compactness_bounded(self):
        traj = _make_trajectories()
        result = extract_left_hand_features(traj)
        assert 0.0 <= result["compactness"] <= 1.0

    def test_stationary_gives_zero_motion(self):
        n = 5
        traj = {k: [(0.5, 0.5)] * n for k in [
            "left_shoulder", "left_elbow", "left_wrist",
            "left_hand_index_tip", "left_hand_middle_tip",
            "left_hand_ring_tip", "left_hand_pinky_tip", "left_hand_thumb_tip",
        ]}
        result = extract_left_hand_features(traj)
        assert result["finger_raw"] == pytest.approx(0.0)
        assert result["wrist_raw"] == pytest.approx(0.0)
