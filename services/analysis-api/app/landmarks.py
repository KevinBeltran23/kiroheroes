from __future__ import annotations

import cv2
import mediapipe as mp
import numpy as np

TrackedPoint = tuple[float, float, float, float]
MISSING_POINT: TrackedPoint = (float("nan"), float("nan"), float("nan"), 0.0)


def _tracked_pose_point(landmark: object) -> TrackedPoint:
    visibility = getattr(landmark, "visibility", 1.0)
    if visibility < 0.35:
        return MISSING_POINT
    return (
        float(getattr(landmark, "x", float("nan"))),
        float(getattr(landmark, "y", float("nan"))),
        float(getattr(landmark, "z", 0.0)),
        float(visibility),
    )


def _tracked_hand_point(landmark: object | None) -> TrackedPoint:
    if landmark is None:
        return MISSING_POINT
    return (
        float(getattr(landmark, "x", float("nan"))),
        float(getattr(landmark, "y", float("nan"))),
        float(getattr(landmark, "z", 0.0)),
        1.0,
    )


def extract_pose_trajectories(
    frames: list[np.ndarray],
) -> dict[str, list[TrackedPoint]]:
    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    keys = {
        "left_wrist": mp.solutions.pose.PoseLandmark.LEFT_WRIST,
        "right_wrist": mp.solutions.pose.PoseLandmark.RIGHT_WRIST,
        "left_index": mp.solutions.pose.PoseLandmark.LEFT_INDEX,
        "right_index": mp.solutions.pose.PoseLandmark.RIGHT_INDEX,
        "left_pinky": mp.solutions.pose.PoseLandmark.LEFT_PINKY,
        "right_pinky": mp.solutions.pose.PoseLandmark.RIGHT_PINKY,
        "left_thumb": mp.solutions.pose.PoseLandmark.LEFT_THUMB,
        "right_thumb": mp.solutions.pose.PoseLandmark.RIGHT_THUMB,
        "left_elbow": mp.solutions.pose.PoseLandmark.LEFT_ELBOW,
        "right_elbow": mp.solutions.pose.PoseLandmark.RIGHT_ELBOW,
        "left_shoulder": mp.solutions.pose.PoseLandmark.LEFT_SHOULDER,
        "right_shoulder": mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER,
        "left_hip": mp.solutions.pose.PoseLandmark.LEFT_HIP,
        "right_hip": mp.solutions.pose.PoseLandmark.RIGHT_HIP,
        "nose": mp.solutions.pose.PoseLandmark.NOSE,
    }
    trajectories: dict[str, list[TrackedPoint]] = {key: [] for key in keys}
    hand_keys = [
        "left_hand_wrist",
        "right_hand_wrist",
        "left_middle_mcp",
        "right_middle_mcp",
    ]
    for key in hand_keys:
        trajectories[key] = []

    hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    for frame in frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)
        hands_result = hands.process(rgb)
        if not result.pose_landmarks:
            for key in trajectories:
                trajectories[key].append(MISSING_POINT)
            continue

        landmarks = result.pose_landmarks.landmark
        for key, landmark_id in keys.items():
            landmark = landmarks[landmark_id]
            trajectories[key].append(_tracked_pose_point(landmark))

        hand_map: dict[str, object | None] = {"left": None, "right": None}
        if hands_result.multi_hand_landmarks:
            left_wrist = landmarks[mp.solutions.pose.PoseLandmark.LEFT_WRIST]
            right_wrist = landmarks[mp.solutions.pose.PoseLandmark.RIGHT_WRIST]
            left_point = (left_wrist.x, left_wrist.y)
            right_point = (right_wrist.x, right_wrist.y)
            for hand_landmarks in hands_result.multi_hand_landmarks:
                hand_wrist = hand_landmarks.landmark[0]
                hand_point = (hand_wrist.x, hand_wrist.y)
                left_distance = (hand_point[0] - left_point[0]) ** 2 + (
                    hand_point[1] - left_point[1]
                ) ** 2
                right_distance = (hand_point[0] - right_point[0]) ** 2 + (
                    hand_point[1] - right_point[1]
                ) ** 2
                side = "left" if left_distance < right_distance else "right"
                if hand_map[side] is None:
                    hand_map[side] = hand_landmarks.landmark

        for side in ("left", "right"):
            hand_landmarks = hand_map[side]
            if hand_landmarks is None:
                trajectories[f"{side}_hand_wrist"].append(MISSING_POINT)
                trajectories[f"{side}_middle_mcp"].append(MISSING_POINT)
                continue
            hand_wrist = hand_landmarks[0]
            middle_mcp = hand_landmarks[9]
            trajectories[f"{side}_hand_wrist"].append(_tracked_hand_point(hand_wrist))
            trajectories[f"{side}_middle_mcp"].append(_tracked_hand_point(middle_mcp))

    pose.close()
    hands.close()
    return trajectories
