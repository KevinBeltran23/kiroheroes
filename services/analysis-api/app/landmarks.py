from __future__ import annotations

import cv2
import mediapipe as mp
import numpy as np


def extract_pose_trajectories(frames: list[np.ndarray]) -> dict[str, list[tuple[float, float]]]:
    pose = mp.solutions.pose.Pose(static_image_mode=False, model_complexity=1)
    keys = {
        "left_wrist": mp.solutions.pose.PoseLandmark.LEFT_WRIST,
        "right_wrist": mp.solutions.pose.PoseLandmark.RIGHT_WRIST,
        "left_elbow": mp.solutions.pose.PoseLandmark.LEFT_ELBOW,
        "right_elbow": mp.solutions.pose.PoseLandmark.RIGHT_ELBOW,
        "left_shoulder": mp.solutions.pose.PoseLandmark.LEFT_SHOULDER,
        "right_shoulder": mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER,
        "nose": mp.solutions.pose.PoseLandmark.NOSE,
    }
    trajectories: dict[str, list[tuple[float, float]]] = {key: [] for key in keys}

    for frame in frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)
        if not result.pose_landmarks:
            for key in trajectories:
                trajectories[key].append((float("nan"), float("nan")))
            continue

        landmarks = result.pose_landmarks.landmark
        for key, landmark_id in keys.items():
            landmark = landmarks[landmark_id]
            if landmark.visibility < 0.35:
                trajectories[key].append((float("nan"), float("nan")))
            else:
                trajectories[key].append((landmark.x, landmark.y))

    pose.close()
    return trajectories
