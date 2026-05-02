from __future__ import annotations

import cv2
import mediapipe as mp
import numpy as np

mp_holistic = mp.solutions.holistic

# Pose landmark keys we care about
_POSE_KEYS: dict[str, mp_holistic.PoseLandmark] = {
    "left_wrist": mp_holistic.PoseLandmark.LEFT_WRIST,
    "right_wrist": mp_holistic.PoseLandmark.RIGHT_WRIST,
    "left_elbow": mp_holistic.PoseLandmark.LEFT_ELBOW,
    "right_elbow": mp_holistic.PoseLandmark.RIGHT_ELBOW,
    "left_shoulder": mp_holistic.PoseLandmark.LEFT_SHOULDER,
    "right_shoulder": mp_holistic.PoseLandmark.RIGHT_SHOULDER,
    "nose": mp_holistic.PoseLandmark.NOSE,
}

# Hand landmark keys — 21 joints per hand
# Prefixed with "left_hand_" / "right_hand_" in the output dict
_HAND_LANDMARK_NAMES: dict[str, mp_holistic.HandLandmark] = {
    "wrist": mp_holistic.HandLandmark.WRIST,
    "thumb_cmc": mp_holistic.HandLandmark.THUMB_CMC,
    "thumb_mcp": mp_holistic.HandLandmark.THUMB_MCP,
    "thumb_ip": mp_holistic.HandLandmark.THUMB_IP,
    "thumb_tip": mp_holistic.HandLandmark.THUMB_TIP,
    "index_mcp": mp_holistic.HandLandmark.INDEX_FINGER_MCP,
    "index_pip": mp_holistic.HandLandmark.INDEX_FINGER_PIP,
    "index_dip": mp_holistic.HandLandmark.INDEX_FINGER_DIP,
    "index_tip": mp_holistic.HandLandmark.INDEX_FINGER_TIP,
    "middle_mcp": mp_holistic.HandLandmark.MIDDLE_FINGER_MCP,
    "middle_pip": mp_holistic.HandLandmark.MIDDLE_FINGER_PIP,
    "middle_dip": mp_holistic.HandLandmark.MIDDLE_FINGER_DIP,
    "middle_tip": mp_holistic.HandLandmark.MIDDLE_FINGER_TIP,
    "ring_mcp": mp_holistic.HandLandmark.RING_FINGER_MCP,
    "ring_pip": mp_holistic.HandLandmark.RING_FINGER_PIP,
    "ring_dip": mp_holistic.HandLandmark.RING_FINGER_DIP,
    "ring_tip": mp_holistic.HandLandmark.RING_FINGER_TIP,
    "pinky_mcp": mp_holistic.HandLandmark.PINKY_MCP,
    "pinky_pip": mp_holistic.HandLandmark.PINKY_PIP,
    "pinky_dip": mp_holistic.HandLandmark.PINKY_DIP,
    "pinky_tip": mp_holistic.HandLandmark.PINKY_TIP,
}

_NAN_POINT: tuple[float, float] = (float("nan"), float("nan"))


def _extract_hand_points(
    hand_landmarks: mp.framework.formats.landmark_pb2.NormalizedLandmarkList | None,
) -> dict[str, tuple[float, float]]:
    """Return a dict of landmark_name -> (x, y) for one hand, or NaN points if not detected."""
    if hand_landmarks is None:
        return {name: _NAN_POINT for name in _HAND_LANDMARK_NAMES}
    return {
        name: (hand_landmarks.landmark[lm_id].x, hand_landmarks.landmark[lm_id].y)
        for name, lm_id in _HAND_LANDMARK_NAMES.items()
    }


def extract_pose_trajectories(frames: list[np.ndarray]) -> dict[str, list[tuple[float, float]]]:
    """
    Run MediaPipe Holistic on each frame and return per-landmark (x, y) trajectories.

    Output keys:
      - Pose: left_wrist, right_wrist, left_elbow, right_elbow,
              left_shoulder, right_shoulder, nose
      - Left hand: left_hand_<landmark_name>  (21 joints)
      - Right hand: right_hand_<landmark_name> (21 joints)
    """
    # Initialise trajectory lists
    trajectories: dict[str, list[tuple[float, float]]] = {
        key: [] for key in _POSE_KEYS
    }
    for name in _HAND_LANDMARK_NAMES:
        trajectories[f"left_hand_{name}"] = []
        trajectories[f"right_hand_{name}"] = []

    with mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as holistic:
        for frame in frames:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = holistic.process(rgb)

            # --- Pose landmarks ---
            if result.pose_landmarks:
                landmarks = result.pose_landmarks.landmark
                for key, lm_id in _POSE_KEYS.items():
                    lm = landmarks[lm_id]
                    if lm.visibility < 0.35:
                        trajectories[key].append(_NAN_POINT)
                    else:
                        trajectories[key].append((lm.x, lm.y))
            else:
                for key in _POSE_KEYS:
                    trajectories[key].append(_NAN_POINT)

            # --- Hand landmarks ---
            left_points = _extract_hand_points(result.left_hand_landmarks)
            right_points = _extract_hand_points(result.right_hand_landmarks)

            for name in _HAND_LANDMARK_NAMES:
                trajectories[f"left_hand_{name}"].append(left_points[name])
                trajectories[f"right_hand_{name}"].append(right_points[name])

    return trajectories
