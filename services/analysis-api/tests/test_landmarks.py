from __future__ import annotations

import math
import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


# ---------------------------------------------------------------------------
# Stub out mediapipe before any app code is imported.
# This lets the tests run without mediapipe installed.
# ---------------------------------------------------------------------------

def _build_mediapipe_stub() -> ModuleType:
    """Return a minimal mediapipe stub that satisfies landmarks.py imports."""
    mp_stub = ModuleType("mediapipe")

    # mp.solutions
    solutions = ModuleType("mediapipe.solutions")
    mp_stub.solutions = solutions

    # mp.solutions.holistic  — the only thing landmarks.py uses at module level
    holistic_mod = ModuleType("mediapipe.solutions.holistic")

    class _FakeHandLandmark:
        WRIST = 0
        THUMB_CMC = 1
        THUMB_MCP = 2
        THUMB_IP = 3
        THUMB_TIP = 4
        INDEX_FINGER_MCP = 5
        INDEX_FINGER_PIP = 6
        INDEX_FINGER_DIP = 7
        INDEX_FINGER_TIP = 8
        MIDDLE_FINGER_MCP = 9
        MIDDLE_FINGER_PIP = 10
        MIDDLE_FINGER_DIP = 11
        MIDDLE_FINGER_TIP = 12
        RING_FINGER_MCP = 13
        RING_FINGER_PIP = 14
        RING_FINGER_DIP = 15
        RING_FINGER_TIP = 16
        PINKY_MCP = 17
        PINKY_PIP = 18
        PINKY_DIP = 19
        PINKY_TIP = 20

    class _FakePoseLandmark:
        LEFT_WRIST = 15
        RIGHT_WRIST = 16
        LEFT_ELBOW = 13
        RIGHT_ELBOW = 14
        LEFT_SHOULDER = 11
        RIGHT_SHOULDER = 12
        NOSE = 0

    holistic_mod.HandLandmark = _FakeHandLandmark
    holistic_mod.PoseLandmark = _FakePoseLandmark
    holistic_mod.Holistic = MagicMock  # placeholder; tests override per-call

    solutions.holistic = holistic_mod

    # Register sub-modules so Python's import machinery finds them
    sys.modules.setdefault("mediapipe", mp_stub)
    sys.modules.setdefault("mediapipe.solutions", solutions)
    sys.modules.setdefault("mediapipe.solutions.holistic", holistic_mod)

    return mp_stub


_build_mediapipe_stub()

# Now it's safe to import the module under test
from app.landmarks import extract_pose_trajectories  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers to build fake MediaPipe landmark objects
# ---------------------------------------------------------------------------

def _make_landmark(x: float, y: float, z: float = 0.0, visibility: float = 1.0) -> SimpleNamespace:
    return SimpleNamespace(x=x, y=y, z=z, visibility=visibility)


def _make_landmark_list(coords: list[tuple[float, float]]) -> SimpleNamespace:
    landmarks = [_make_landmark(x, y) for x, y in coords]
    return SimpleNamespace(landmark=landmarks)


def _pose_landmark_list() -> SimpleNamespace:
    """33 pose landmarks — all at distinct positions with full visibility."""
    return _make_landmark_list([(i * 0.01, i * 0.01) for i in range(33)])


def _hand_landmark_list(offset: float = 0.0) -> SimpleNamespace:
    """21 hand landmarks offset so left/right differ."""
    return _make_landmark_list([(i * 0.01 + offset, i * 0.01 + offset) for i in range(21)])


def _fake_holistic_result(
    *,
    include_pose: bool = True,
    include_left_hand: bool = True,
    include_right_hand: bool = True,
) -> SimpleNamespace:
    return SimpleNamespace(
        pose_landmarks=_pose_landmark_list() if include_pose else None,
        left_hand_landmarks=_hand_landmark_list(offset=0.0) if include_left_hand else None,
        right_hand_landmarks=_hand_landmark_list(offset=0.5) if include_right_hand else None,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def blank_frames() -> list[np.ndarray]:
    """Three small blank BGR frames."""
    return [np.zeros((64, 64, 3), dtype=np.uint8) for _ in range(3)]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExtractPoseTrajectories:

    def _run(self, frames: list[np.ndarray], results_per_frame: list) -> dict:
        """
        Patch Holistic and cv2.cvtColor, then call extract_pose_trajectories.
        """
        call_count = {"n": 0}

        def fake_process(_rgb):
            idx = call_count["n"]
            call_count["n"] += 1
            return results_per_frame[idx]

        mock_instance = MagicMock()
        mock_instance.__enter__ = lambda s: s
        mock_instance.__exit__ = MagicMock(return_value=False)
        mock_instance.process = fake_process

        mock_holistic_cls = MagicMock(return_value=mock_instance)

        with (
            patch("app.landmarks.mp_holistic.Holistic", mock_holistic_cls),
            patch("app.landmarks.cv2.cvtColor", return_value=np.zeros((64, 64, 3), dtype=np.uint8)),
        ):
            return extract_pose_trajectories(frames)

    # --- output shape ---

    def test_returns_pose_keys(self, blank_frames):
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for key in ("left_wrist", "right_wrist", "left_elbow", "right_elbow",
                    "left_shoulder", "right_shoulder", "nose"):
            assert key in trajectories, f"Missing pose key: {key}"

    def test_returns_hand_keys_for_all_21_joints(self, blank_frames):
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        expected_joints = [
            "wrist", "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip",
            "index_mcp", "index_pip", "index_dip", "index_tip",
            "middle_mcp", "middle_pip", "middle_dip", "middle_tip",
            "ring_mcp", "ring_pip", "ring_dip", "ring_tip",
            "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip",
        ]
        for joint in expected_joints:
            assert f"left_hand_{joint}" in trajectories
            assert f"right_hand_{joint}" in trajectories

    def test_trajectory_length_matches_frame_count(self, blank_frames):
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for key, traj in trajectories.items():
            assert len(traj) == len(blank_frames), (
                f"Trajectory '{key}' has length {len(traj)}, expected {len(blank_frames)}"
            )

    # --- valid detections ---

    def test_pose_landmarks_are_finite_when_detected(self, blank_frames):
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["left_wrist"][frame_idx]
            assert not math.isnan(x) and not math.isnan(y)

    def test_hand_landmarks_are_finite_when_detected(self, blank_frames):
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["left_hand_index_tip"][frame_idx]
            assert not math.isnan(x) and not math.isnan(y)

    def test_left_and_right_hand_landmarks_differ(self, blank_frames):
        """Left and right hands have different offsets so their coords should differ."""
        results = [_fake_holistic_result() for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        lx, _ = trajectories["left_hand_index_tip"][0]
        rx, _ = trajectories["right_hand_index_tip"][0]
        assert lx != rx

    # --- missing detections produce NaN ---

    def test_nan_when_pose_not_detected(self, blank_frames):
        results = [_fake_holistic_result(include_pose=False) for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["left_wrist"][frame_idx]
            assert math.isnan(x) and math.isnan(y)

    def test_nan_when_left_hand_not_detected(self, blank_frames):
        results = [_fake_holistic_result(include_left_hand=False) for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["left_hand_index_tip"][frame_idx]
            assert math.isnan(x) and math.isnan(y)

    def test_nan_when_right_hand_not_detected(self, blank_frames):
        results = [_fake_holistic_result(include_right_hand=False) for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["right_hand_wrist"][frame_idx]
            assert math.isnan(x) and math.isnan(y)

    def test_right_hand_present_when_only_left_missing(self, blank_frames):
        """Right hand should still have valid coords even when left is absent."""
        results = [_fake_holistic_result(include_left_hand=False) for _ in blank_frames]
        trajectories = self._run(blank_frames, results)

        for frame_idx in range(len(blank_frames)):
            x, y = trajectories["right_hand_index_tip"][frame_idx]
            assert not math.isnan(x) and not math.isnan(y)

    # --- mixed frames ---

    def test_mixed_detection_across_frames(self, blank_frames):
        """Some frames detect hands, some don't — lengths must still match."""
        results = [
            _fake_holistic_result(include_left_hand=True),
            _fake_holistic_result(include_left_hand=False),
            _fake_holistic_result(include_left_hand=True),
        ]
        trajectories = self._run(blank_frames, results)

        traj = trajectories["left_hand_index_tip"]
        assert len(traj) == 3
        assert not math.isnan(traj[0][0])
        assert math.isnan(traj[1][0])
        assert not math.isnan(traj[2][0])

    # --- low visibility pose landmark ---

    def test_low_visibility_pose_landmark_becomes_nan(self, blank_frames):
        """A pose landmark with visibility < 0.35 should be stored as NaN."""
        low_vis_pose = _pose_landmark_list()
        # LEFT_WRIST is index 15 in our fake PoseLandmark
        low_vis_pose.landmark[15] = _make_landmark(0.5, 0.5, visibility=0.1)

        result = SimpleNamespace(
            pose_landmarks=low_vis_pose,
            left_hand_landmarks=_hand_landmark_list(),
            right_hand_landmarks=_hand_landmark_list(offset=0.5),
        )
        trajectories = self._run(blank_frames[:1], [result])

        x, y = trajectories["left_wrist"][0]
        assert math.isnan(x) and math.isnan(y)
