from __future__ import annotations

import argparse
from math import acos, degrees, hypot, atan2, pi
from pathlib import Path

import cv2
import mediapipe as mp


# ---------------------------------------------------------------------------
# Angle calibration — sourced from resources/ reference images.
# Each tuple is (lo, hi) in degrees: lo = 0%, hi = 100%.
# lo > hi inverts the scale (angle decreases as the joint activates).
# Reference images: set_position.png (0%), bicep_100.png, forearm_100.png,
#                   wrist_break_100.png (100% per group).
# Wrist ranges use MediaPipe Hands middle-MCP (landmark 9); others use Pose only.
# ---------------------------------------------------------------------------
LEFT_BICEP_RANGE: tuple[float, float] = (
    10.5,
    150.8,
)  # upper-arm elevation:  set_position → bicep_100
LEFT_FOREARM_RANGE: tuple[float, float] = (
    164.5,
    23.9,
)  # elbow flexion:        set_position → forearm_100
LEFT_WRIST_RANGE: tuple[float, float] = (
    62.9,
    90.5,
)  # wrist supination:     set_position → wrist_break_100 (Hands wrist→middle-MCP from vertical)

RIGHT_BICEP_RANGE: tuple[float, float] = (
    25.4,
    158.6,
)  # upper-arm elevation:  set_position → bicep_100
RIGHT_FOREARM_RANGE: tuple[float, float] = (
    142.2,
    20.8,
)  # elbow flexion:        set_position → forearm_100
RIGHT_WRIST_RANGE: tuple[float, float] = (
    96.8,
    37.1,
)  # wrist break (flexion up): set_position → wrist_break_100 (Pose elbow/wrist + Hands middle-MCP)
# ---------------------------------------------------------------------------


def _angle_3pt(a, b, c) -> float:
    """Angle at vertex b between rays to a and c (degrees, 2-D)."""
    bax = a[0] - b[0]
    bay = a[1] - b[1]
    bcx = c[0] - b[0]
    bcy = c[1] - b[1]
    mag_ba = hypot(bax, bay)
    mag_bc = hypot(bcx, bcy)
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cosine = max(-1.0, min(1.0, (bax * bcx + bay * bcy) / (mag_ba * mag_bc)))
    return degrees(acos(cosine))


def _forearm_orientation(elbow, wrist) -> float:
    """Angle of elbow→wrist vector from straight-down vertical (0–180°)."""
    dx = wrist[0] - elbow[0]
    dy = wrist[1] - elbow[1]  # positive = downward in image coords
    return abs(degrees(atan2(dx, dy)))


def _to_pct(angle: float, lo: float, hi: float) -> float:
    """Clamp and linearly map angle to 0–100%. lo > hi inverts the scale."""
    clamped = max(min(lo, hi), min(max(lo, hi), angle))
    return max(0.0, min(100.0, (clamped - lo) / (hi - lo) * 100.0))


def _draw_angle_marker(frame, point, label: str, pct: float, color) -> None:
    """Filled circle at joint + dark-backed text 'LABEL: XX%'."""
    x, y = int(point[0]), int(point[1])
    cv2.circle(frame, (x, y), 10, color, -1)

    text = f"{label}: {pct:.0f}%"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.75
    thickness = 2
    tx, ty = x + 14, y + 5

    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    pad = 4
    cv2.rectangle(
        frame,
        (tx - pad, ty - th - pad),
        (tx + tw + pad, ty + baseline + pad),
        (0, 0, 0),
        -1,
    )
    cv2.putText(frame, text, (tx, ty), font, font_scale, color, thickness, cv2.LINE_AA)


WINDOW_NAME = "MediaPipe Pose Preview"


def _video_path_from_args() -> tuple[Path, int, Path | None]:
    parser = argparse.ArgumentParser(
        description="Preview MediaPipe Pose landmarks over a local video file."
    )
    parser.add_argument(
        "video",
        nargs="?",
        help="Path to the video file. If omitted, you will be prompted.",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=1280,
        help="Resize preview frames wider than this value. Use 0 to disable.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Write annotated video to this path (e.g. out.mp4) instead of previewing live.",
    )
    args = parser.parse_args()

    raw_path = args.video or input("Video path: ")
    video_path = Path(raw_path.strip().strip('"')).expanduser()
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not video_path.is_file():
        raise ValueError(f"Path is not a file: {video_path}")

    output_path = Path(args.output) if args.output else None
    return video_path, args.max_width, output_path


def _resize_for_preview(frame, max_width: int):
    if max_width <= 0 or frame.shape[1] <= max_width:
        return frame

    scale = max_width / frame.shape[1]
    height = round(frame.shape[0] * scale)
    return cv2.resize(frame, (max_width, height), interpolation=cv2.INTER_AREA)


def _open_preview_window() -> None:
    try:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    except cv2.error as exc:
        raise RuntimeError(
            "OpenCV cannot open a display window. For local preview, install "
            "a GUI-enabled OpenCV build such as opencv-python instead of "
            "opencv-python-headless."
        ) from exc


def preview_pose(video_path: Path, max_width: int, output_path: Path | None) -> None:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    delay_ms = max(1, round(1000 / fps))
    src_w = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))

    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    drawing = mp.solutions.drawing_utils
    styles = mp.solutions.drawing_styles

    hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # Determine output frame size (after optional resize)
    if max_width > 0 and src_w > max_width:
        out_w = max_width
        out_h = round(src_h * (max_width / src_w))
    else:
        out_w, out_h = src_w, src_h

    writer: cv2.VideoWriter | None = None
    if output_path is not None:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(output_path), fourcc, fps, (out_w, out_h))
        print(f"Recording to {output_path}  ({out_w}x{out_h} @ {fps:.1f} fps)")
    else:
        _open_preview_window()

    frame_num = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frame_num += 1

            frame = cv2.flip(frame, -1)  # correct upside-down + mirrored source video
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

                lm = result.pose_landmarks.landmark
                h, w = frame.shape[:2]

                def _px(idx):
                    pt = lm[idx]
                    return (pt.x * w, pt.y * h)

                # Match detected hands to left/right by proximity to Pose wrist landmarks
                hand_lm_map: dict[str, object] = {"L": None, "R": None}
                if hands_result.multi_hand_landmarks:
                    lw, rw = _px(15), _px(16)
                    for hnd_lm in hands_result.multi_hand_landmarks:
                        hw = hnd_lm.landmark[0]
                        hw_px = (hw.x * w, hw.y * h)
                        dl = hypot(hw_px[0] - lw[0], hw_px[1] - lw[1])
                        dr = hypot(hw_px[0] - rw[0], hw_px[1] - rw[1])
                        key = "L" if dl < dr else "R"
                        if hand_lm_map[key] is None:
                            hand_lm_map[key] = hnd_lm.landmark

                # (label_prefix, shoulder, elbow, wrist, index, color, b_range, f_range, w_range, wrist_supination)
                # wrist_supination=True  → left:  direction of wrist→index from vertical (captures rotation)
                # wrist_supination=False → right: angle at wrist joint elbow→wrist→index (captures flex)
                sides = [
                    (
                        "L",
                        11,
                        13,
                        15,
                        19,
                        (0, 255, 0),
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
                        (0, 255, 255),
                        RIGHT_BICEP_RANGE,
                        RIGHT_FOREARM_RANGE,
                        RIGHT_WRIST_RANGE,
                        False,
                    ),
                ]
                for (
                    prefix,
                    si,
                    ei,
                    wi,
                    ii,
                    color,
                    b_range,
                    f_range,
                    w_range,
                    wrist_supination,
                ) in sides:
                    shoulder = _px(si)
                    elbow = _px(ei)
                    wrist = _px(wi)
                    index = _px(ii)
                    midpt = ((elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2)

                    def vis(*idxs):
                        return all(lm[i].visibility >= 0.35 for i in idxs)

                    # Each metric checked independently — one occluded joint won't hide the others
                    if vis(si, ei):
                        bicep_pct = _to_pct(
                            _forearm_orientation(shoulder, elbow), *b_range
                        )
                        _draw_angle_marker(
                            frame, elbow, f"{prefix}Bicep", bicep_pct, color
                        )

                    if vis(si, ei, wi):
                        forearm_pct = _to_pct(
                            _angle_3pt(shoulder, elbow, wrist), *f_range
                        )
                        _draw_angle_marker(
                            frame, midpt, f"{prefix}Forearm", forearm_pct, color
                        )

                    hlm = hand_lm_map[prefix]
                    if hlm is not None:
                        hmid9 = (hlm[9].x * w, hlm[9].y * h)
                        if wrist_supination:
                            # Left: supination — Hands wrist(0)→middle-MCP(9) axis direction from vertical
                            hwrist0 = (hlm[0].x * w, hlm[0].y * h)
                            wrist_angle = _forearm_orientation(hwrist0, hmid9)
                            wrist_pct = _to_pct(wrist_angle, *w_range)
                            _draw_angle_marker(
                                frame, wrist, f"{prefix}Wrist", wrist_pct, color
                            )
                        elif vis(ei, wi):
                            # Right: wrist break — Pose elbow/wrist + Hands middle-MCP(9) for cleaner angle
                            wrist_angle = _angle_3pt(elbow, wrist, hmid9)
                            wrist_pct = _to_pct(wrist_angle, *w_range)
                            _draw_angle_marker(
                                frame, wrist, f"{prefix}Wrist", wrist_pct, color
                            )
                    elif vis(ei, wi, ii):
                        # Fallback: Pose-only (no Hands detection this frame)
                        wrist_angle = (
                            _forearm_orientation(wrist, index)
                            if wrist_supination
                            else _angle_3pt(elbow, wrist, index)
                        )
                        wrist_pct = _to_pct(wrist_angle, *w_range)
                        _draw_angle_marker(
                            frame, wrist, f"{prefix}Wrist", wrist_pct, color
                        )

            frame = _resize_for_preview(frame, max_width)

            if writer is not None:
                writer.write(frame)
                if total_frames > 0 and frame_num % 30 == 0:
                    pct = frame_num / total_frames * 100
                    print(f"  {frame_num}/{total_frames}  ({pct:.0f}%)", end="\r")
            else:
                cv2.imshow(WINDOW_NAME, frame)
                key = cv2.waitKey(delay_ms) & 0xFF
                if key in (27, ord("q")):
                    break
    finally:
        pose.close()
        hands.close()
        capture.release()
        if writer is not None:
            writer.release()
            print(f"\nSaved: {output_path}")
        else:
            cv2.destroyAllWindows()


def main() -> None:
    video_path, max_width, output_path = _video_path_from_args()
    preview_pose(video_path, max_width, output_path)


if __name__ == "__main__":
    main()
