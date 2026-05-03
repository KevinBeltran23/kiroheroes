from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

import cv2
import mediapipe as mp

from .metrics import (
    LEFT_BICEP_RANGE,
    LEFT_FOREARM_RANGE,
    LEFT_WRIST_RANGE,
    RIGHT_BICEP_RANGE,
    RIGHT_FOREARM_RANGE,
    RIGHT_WRIST_RANGE,
)


def _angle_3pt(
    a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]
) -> float:
    bax = a[0] - b[0]
    bay = a[1] - b[1]
    bcx = c[0] - b[0]
    bcy = c[1] - b[1]
    mag_ba = math.hypot(bax, bay)
    mag_bc = math.hypot(bcx, bcy)
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cosine = max(-1.0, min(1.0, (bax * bcx + bay * bcy) / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _orientation_from_vertical(a: tuple[float, float], b: tuple[float, float]) -> float:
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    return abs(math.degrees(math.atan2(dx, dy)))


def _to_percent(angle: float, lo: float, hi: float) -> float:
    clamped = max(min(lo, hi), min(max(lo, hi), angle))
    return max(0.0, min(100.0, (clamped - lo) / (hi - lo) * 100.0))


def _draw_label(
    frame, point: tuple[float, float], label: str, value: float, color
) -> None:
    x, y = int(point[0]), int(point[1])
    cv2.circle(frame, (x, y), 8, color, -1)

    text = f"{label}: {value:.0f}%"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.48
    thickness = 1
    tx, ty = x + 10, y + 4
    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    pad = 3
    cv2.rectangle(
        frame,
        (tx - pad, ty - th - pad),
        (tx + tw + pad, ty + baseline + pad),
        (0, 0, 0),
        -1,
    )
    cv2.putText(frame, text, (tx, ty), font, font_scale, color, thickness, cv2.LINE_AA)


def _writer_for_path(
    output_path: Path, fps: float, width: int, height: int
) -> cv2.VideoWriter:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
    if not writer.isOpened():
        raise ValueError("Unable to create overlay video writer.")
    return writer


def _mux_original_audio(
    *, original_video_path: Path, silent_overlay_path: Path, output_path: Path
) -> Path:
    """Combine the silent overlay video with the original audio track.

    Uses ``-c:v copy`` to avoid re-encoding the video stream and ``-c:a aac``
    to ensure the audio codec is compatible with the mp4 container.  The
    ``-movflags +faststart`` flag moves the moov atom to the beginning of the
    file so the video can start playing before it is fully downloaded.

    If ffmpeg is unavailable or the mux fails for any reason the silent
    overlay is returned as-is so the pipeline never hard-fails on audio.
    """
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(silent_overlay_path),
        "-i",
        str(original_video_path),
        "-map",
        "0:v:0",
        "-map",
        "1:a?",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-fflags",
        "+genpts",
        str(output_path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, timeout=120)
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        # Log the failure so it's visible in Cloud Run logs
        stderr = getattr(exc, "stderr", b"") or b""
        print(f"[overlay] ffmpeg audio mux failed: {stderr.decode(errors='replace')}")
        shutil.copyfile(silent_overlay_path, output_path)
    return output_path


def write_pose_overlay_video(video_path: Path, output_path: Path) -> Path:
    capture = cv2.VideoCapture(str(video_path))
    capture.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
    if not capture.isOpened():
        raise ValueError("Unable to open uploaded video for overlay.")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    ok, first_frame = capture.read()
    if not ok:
        capture.release()
        raise ValueError("Unable to read uploaded video for overlay.")

    height, width = first_frame.shape[:2]

    silent_overlay_path = output_path.with_name(f"{output_path.stem}-silent.mp4")
    writer = _writer_for_path(silent_overlay_path, fps, width, height)
    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    drawing = mp.solutions.drawing_utils
    styles = mp.solutions.drawing_styles

    try:
        pending_frame = first_frame
        while True:
            frame = pending_frame
            pending_frame = None

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            hands_result = hands.process(rgb)
            if result.pose_landmarks:
                drawing.draw_landmarks(
                    frame,
                    result.pose_landmarks,
                    mp.solutions.pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=styles.get_default_pose_landmarks_style(),
                )
                landmarks = result.pose_landmarks.landmark
                frame_h, frame_w = frame.shape[:2]

                def px(index: int) -> tuple[float, float]:
                    point = landmarks[index]
                    return point.x * frame_w, point.y * frame_h

                def visible(*indices: int) -> bool:
                    return all(landmarks[index].visibility >= 0.35 for index in indices)

                hand_map: dict[str, object | None] = {"L": None, "R": None}
                if hands_result.multi_hand_landmarks:
                    left_wrist = px(15)
                    right_wrist = px(16)
                    for hand_landmarks in hands_result.multi_hand_landmarks:
                        drawing.draw_landmarks(
                            frame,
                            hand_landmarks,
                            mp.solutions.hands.HAND_CONNECTIONS,
                        )
                        hand_wrist = hand_landmarks.landmark[0]
                        hand_wrist_px = (
                            hand_wrist.x * frame_w,
                            hand_wrist.y * frame_h,
                        )
                        left_distance = math.hypot(
                            hand_wrist_px[0] - left_wrist[0],
                            hand_wrist_px[1] - left_wrist[1],
                        )
                        right_distance = math.hypot(
                            hand_wrist_px[0] - right_wrist[0],
                            hand_wrist_px[1] - right_wrist[1],
                        )
                        side = "L" if left_distance < right_distance else "R"
                        if hand_map[side] is None:
                            hand_map[side] = hand_landmarks.landmark

                sides = [
                    (
                        "L",
                        11,
                        13,
                        15,
                        19,
                        (46, 139, 255),
                        LEFT_BICEP_RANGE,
                        LEFT_FOREARM_RANGE,
                        LEFT_WRIST_RANGE,
                        True,
                    ),
                    (
                        "R",
                        12,
                        14,
                        16,
                        20,
                        (56, 197, 93),
                        RIGHT_BICEP_RANGE,
                        RIGHT_FOREARM_RANGE,
                        RIGHT_WRIST_RANGE,
                        False,
                    ),
                ]
                for (
                    prefix,
                    shoulder_i,
                    elbow_i,
                    wrist_i,
                    index_i,
                    color,
                    b_range,
                    f_range,
                    w_range,
                    wrist_supination,
                ) in sides:
                    shoulder = px(shoulder_i)
                    elbow = px(elbow_i)
                    wrist = px(wrist_i)
                    index_tip = px(index_i)
                    forearm_midpoint = (
                        (elbow[0] + wrist[0]) / 2,
                        (elbow[1] + wrist[1]) / 2,
                    )

                    if visible(shoulder_i, elbow_i):
                        bicep = _to_percent(
                            _orientation_from_vertical(shoulder, elbow), *b_range
                        )
                        _draw_label(frame, elbow, f"{prefix} Bicep", bicep, color)
                    if visible(shoulder_i, elbow_i, wrist_i):
                        forearm = _to_percent(
                            _angle_3pt(shoulder, elbow, wrist), *f_range
                        )
                        _draw_label(
                            frame, forearm_midpoint, f"{prefix} Forearm", forearm, color
                        )
                    hand_landmarks = hand_map[prefix]
                    if hand_landmarks is not None:
                        middle_mcp = (
                            hand_landmarks[9].x * frame_w,
                            hand_landmarks[9].y * frame_h,
                        )
                        if wrist_supination:
                            hand_wrist = (
                                hand_landmarks[0].x * frame_w,
                                hand_landmarks[0].y * frame_h,
                            )
                            wrist_angle = _orientation_from_vertical(
                                hand_wrist, middle_mcp
                            )
                        else:
                            wrist_angle = _angle_3pt(elbow, wrist, middle_mcp)
                        wrist_break = _to_percent(wrist_angle, *w_range)
                        _draw_label(frame, wrist, f"{prefix} Wrist", wrist_break, color)
                    elif visible(elbow_i, wrist_i, index_i):
                        wrist_angle = (
                            _orientation_from_vertical(wrist, index_tip)
                            if wrist_supination
                            else _angle_3pt(elbow, wrist, index_tip)
                        )
                        wrist_break = _to_percent(wrist_angle, *w_range)
                        _draw_label(frame, wrist, f"{prefix} Wrist", wrist_break, color)

            writer.write(frame)
            ok, pending_frame = capture.read()
            if not ok:
                break
    finally:
        pose.close()
        hands.close()
        capture.release()
        writer.release()

    return _mux_original_audio(
        original_video_path=video_path,
        silent_overlay_path=silent_overlay_path,
        output_path=output_path,
    )
