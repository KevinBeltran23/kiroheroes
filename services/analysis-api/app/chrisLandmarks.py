from __future__ import annotations

import cv2
import mediapipe as mp
import numpy as np

TrackedPoint = tuple[float, float, float, float]


def extract_pose_trajectories(
    frames: list[np.ndarray],
) -> dict[str, list[TrackedPoint]]:
    keys = {
        "left_wrist": mp.solutions.pose.PoseLandmark.LEFT_WRIST,
        "right_wrist": mp.solutions.pose.PoseLandmark.RIGHT_WRIST,
        "left_index": mp.solutions.pose.PoseLandmark.LEFT_INDEX,
        "right_index": mp.solutions.pose.PoseLandmark.RIGHT_INDEX,
        "left_elbow": mp.solutions.pose.PoseLandmark.LEFT_ELBOW,
        "right_elbow": mp.solutions.pose.PoseLandmark.RIGHT_ELBOW,
        "left_shoulder": mp.solutions.pose.PoseLandmark.LEFT_SHOULDER,
        "right_shoulder": mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER,
        "left_hip": mp.solutions.pose.PoseLandmark.LEFT_HIP,
        "right_hip": mp.solutions.pose.PoseLandmark.RIGHT_HIP,
        "nose": mp.solutions.pose.PoseLandmark.NOSE,
    }
    trajectories: dict[str, list[TrackedPoint]] = {key: [] for key in keys}

    with mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        for frame in frames:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if not result.pose_landmarks:
                for key in trajectories:
                    trajectories[key].append(
                        (float("nan"), float("nan"), float("nan"), 0.0)
                    )
                continue

            landmarks = result.pose_landmarks.landmark
            for key, landmark_id in keys.items():
                landmark = landmarks[landmark_id]
                if landmark.visibility < 0.35:
                    trajectories[key].append(
                        (float("nan"), float("nan"), float("nan"), landmark.visibility)
                    )
                else:
                    trajectories[key].append(
                        (landmark.x, landmark.y, landmark.z, landmark.visibility)
                    )

    return trajectories
