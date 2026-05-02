from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def sample_frames(video_path: Path, max_frames: int = 180) -> tuple[list[np.ndarray], float]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError("Unable to open uploaded video.")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, total_frames // max_frames) if total_frames else 1

    frames: list[np.ndarray] = []
    index = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if index % step == 0:
            frames.append(frame)
        index += 1
        if len(frames) >= max_frames:
            break

    capture.release()
    if not frames:
        raise ValueError("No readable frames were found in the uploaded video.")
    return frames, fps / step


def write_thumbnail(frame: np.ndarray, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), frame)
    return output_path
