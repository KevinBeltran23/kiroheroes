from __future__ import annotations

import math
from statistics import mean, pstdev


Point = tuple[float, ...]


def _clamp_score(value: float) -> float:
    return max(0.0, min(100.0, value))


def _is_number(value: float) -> bool:
    return not math.isnan(value) and not math.isinf(value)


def _is_valid(point: Point) -> bool:
    return len(point) >= 2 and _is_number(point[0]) and _is_number(point[1])


def _visibility(point: Point) -> float:
    if len(point) < 4 or not _is_number(point[3]):
        return 1.0 if _is_valid(point) else 0.0
    return point[3]


def _xy(point: Point) -> tuple[float, float] | None:
    if not _is_valid(point):
        return None
    return point[0], point[1]


def _valid_y(points: list[Point]) -> list[float]:
    return [point[1] for point in points if _is_valid(point)]


def _y_series(points: list[Point]) -> list[float]:
    return [point[1] if _is_valid(point) else float("nan") for point in points]


def _valid_values(values: list[float]) -> list[float]:
    return [value for value in values if _is_number(value)]


def _score_from_variation(values: list[float], scale: float = 1.0) -> float:
    valid_values = _valid_values(values)
    if len(valid_values) < 2:
        return 50.0
    avg = abs(mean(valid_values)) or 1.0
    variation = pstdev(valid_values) / avg
    return _clamp_score(100.0 - variation * 100.0 * scale)


def _score_from_balance(left: float, right: float, scale: float = 1.0) -> float:
    total = abs(left) + abs(right)
    if total <= 0:
        return 50.0
    return _clamp_score(100.0 - (abs(left - right) / total) * 100.0 * scale)


def _range(values: list[float]) -> float:
    valid_values = _valid_values(values)
    return max(valid_values) - min(valid_values) if valid_values else 0.0


def _distance(a: Point, b: Point) -> float:
    a_xy = _xy(a)
    b_xy = _xy(b)
    if not a_xy or not b_xy:
        return float("nan")
    return math.dist(a_xy, b_xy)


def _motion_series(points: list[Point]) -> list[float]:
    if not points:
        return []

    motion = [0.0 if _is_valid(points[0]) else float("nan")]
    for index in range(1, len(points)):
        motion.append(_distance(points[index - 1], points[index]))
    return motion


def _angle(a: Point, b: Point, c: Point) -> float:
    a_xy = _xy(a)
    b_xy = _xy(b)
    c_xy = _xy(c)
    if not a_xy or not b_xy or not c_xy:
        return float("nan")

    bax = a_xy[0] - b_xy[0]
    bay = a_xy[1] - b_xy[1]
    bcx = c_xy[0] - b_xy[0]
    bcy = c_xy[1] - b_xy[1]
    mag_ba = math.hypot(bax, bay)
    mag_bc = math.hypot(bcx, bcy)
    if mag_ba == 0 or mag_bc == 0:
        return float("nan")

    cosine = max(-1.0, min(1.0, (bax * bcx + bay * bcy) / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _elbow_angle_series(trajectories: dict[str, list[Point]], side: str) -> list[float]:
    shoulder = trajectories.get(f"{side}_shoulder", [])
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
    frame_count = min(len(shoulder), len(elbow), len(wrist))
    return [
        _angle(shoulder[index], elbow[index], wrist[index])
        for index in range(frame_count)
    ]


def _wrist_angle_series(trajectories: dict[str, list[Point]], side: str) -> list[float]:
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
    index = trajectories.get(f"{side}_index", [])
    frame_count = min(len(elbow), len(wrist), len(index))
    return [_angle(elbow[i], wrist[i], index[i]) for i in range(frame_count)]


def _arm_motion_series(trajectories: dict[str, list[Point]], side: str) -> list[float]:
    shoulder = trajectories.get(f"{side}_shoulder", [])
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
    elbow_angles = _elbow_angle_series(trajectories, side)
    frame_count = min(len(shoulder), len(elbow), len(wrist), len(elbow_angles))
    if frame_count == 0:
        return []

    motion = [0.0]
    for index in range(1, frame_count):
        elbow_delta = _distance(elbow[index - 1], elbow[index])
        shoulder_delta = _distance(shoulder[index - 1], shoulder[index])
        wrist_delta = _distance(wrist[index - 1], wrist[index])
        angle_delta = (
            abs(elbow_angles[index] - elbow_angles[index - 1]) / 180.0
            if _is_number(elbow_angles[index]) and _is_number(elbow_angles[index - 1])
            else float("nan")
        )

        parts = [
            value
            for value in (
                elbow_delta * 100.0 if _is_number(elbow_delta) else float("nan"),
                shoulder_delta * 60.0 if _is_number(shoulder_delta) else float("nan"),
                wrist_delta * 25.0 if _is_number(wrist_delta) else float("nan"),
                angle_delta * 100.0 if _is_number(angle_delta) else float("nan"),
            )
            if _is_number(value)
        ]
        motion.append(sum(parts) if parts else float("nan"))
    return motion


def _tracking_confidence(trajectories: dict[str, list[Point]]) -> float:
    arm_keys = (
        "left_shoulder",
        "left_elbow",
        "left_wrist",
        "right_shoulder",
        "right_elbow",
        "right_wrist",
    )
    points = [point for key in arm_keys for point in trajectories.get(key, [])]
    if not points:
        return 0.0

    valid_points = [point for point in points if _is_valid(point)]
    if not valid_points:
        return 0.0

    visibility = mean(_visibility(point) for point in valid_points)
    coverage = len(valid_points) / len(points)
    return _clamp_score(visibility * coverage * 100.0)


def _sample_series(values: list[float], max_points: int = 32) -> list[float]:
    if not values:
        return []
    if len(values) <= max_points:
        return [0.0 if not _is_number(value) else value for value in values]

    step = (len(values) - 1) / (max_points - 1)
    return [
        (
            0.0
            if not _is_number(values[round(index * step)])
            else values[round(index * step)]
        )
        for index in range(max_points)
    ]


def _normalize_series(
    values: list[float],
    max_points: int = 32,
    bounds: tuple[float, float] | None = None,
) -> list[float]:
    sampled = _sample_series(values, max_points)
    valid_values = _valid_values(sampled)
    if not valid_values:
        return sampled

    minimum, maximum = bounds if bounds else (min(valid_values), max(valid_values))
    spread = maximum - minimum
    if spread <= 0:
        return [0.0 for _ in sampled]

    return [
        _clamp_score(((value - minimum) / spread) * 100.0) if _is_number(value) else 0.0
        for value in sampled
    ]


def detect_stroke_peaks(y_values: list[float]) -> list[int]:
    peaks: list[int] = []
    if len(y_values) < 3:
        return peaks
    for index in range(1, len(y_values) - 1):
        prev_y, current_y, next_y = (
            y_values[index - 1],
            y_values[index],
            y_values[index + 1],
        )
        if any(math.isnan(value) for value in (prev_y, current_y, next_y)):
            continue
        if current_y > prev_y and current_y > next_y:
            peaks.append(index)
    return peaks


def compute_metrics(trajectories: dict[str, list[Point]], sample_fps: float) -> dict:
    effective_fps = sample_fps if sample_fps > 0 else 30.0
    left_y_series = _y_series(trajectories.get("left_wrist", []))
    right_y_series = _y_series(trajectories.get("right_wrist", []))
    left_y = _valid_y(trajectories.get("left_wrist", []))
    right_y = _valid_y(trajectories.get("right_wrist", []))
    left_elbow_angles = _elbow_angle_series(trajectories, "left")
    right_elbow_angles = _elbow_angle_series(trajectories, "right")
    left_wrist_angles = _wrist_angle_series(trajectories, "left")
    right_wrist_angles = _wrist_angle_series(trajectories, "right")
    left_arm_motion = _arm_motion_series(trajectories, "left")
    right_arm_motion = _arm_motion_series(trajectories, "right")

    left_peaks = detect_stroke_peaks(left_y_series)
    right_peaks = detect_stroke_peaks(right_y_series)
    all_peaks = sorted(left_peaks + right_peaks)
    intervals = [
        (all_peaks[index] - all_peaks[index - 1]) / effective_fps
        for index in range(1, len(all_peaks))
        if all_peaks[index] > all_peaks[index - 1]
    ]

    left_range = _range(left_y)
    right_range = _range(right_y)
    height_delta = abs(left_range - right_range)
    symmetry_score = _clamp_score(100.0 - height_delta * 250.0)

    timing_score = _score_from_variation(intervals, scale=1.3)
    left_peak_heights = [
        left_y_series[index]
        for index in left_peaks
        if index < len(left_y_series) and _is_number(left_y_series[index])
    ]
    right_peak_heights = [
        right_y_series[index]
        for index in right_peaks
        if index < len(right_y_series) and _is_number(right_y_series[index])
    ]
    left_consistency = _score_from_variation(left_peak_heights or left_y, scale=0.7)
    right_consistency = _score_from_variation(right_peak_heights or right_y, scale=0.7)
    stroke_consistency = (left_consistency + right_consistency) / 2.0

    shoulder_motion = _valid_values(
        _motion_series(trajectories.get("left_shoulder", []))
        + _motion_series(trajectories.get("right_shoulder", []))
    )
    posture_stability = (
        _clamp_score(100.0 - mean(shoulder_motion) * 650.0) if shoulder_motion else 50.0
    )

    left_arm_motion_avg = (
        mean(_valid_values(left_arm_motion)) if _valid_values(left_arm_motion) else 0.0
    )
    right_arm_motion_avg = (
        mean(_valid_values(right_arm_motion))
        if _valid_values(right_arm_motion)
        else 0.0
    )
    arm_balance = _score_from_balance(
        left_arm_motion_avg, right_arm_motion_avg, scale=1.2
    )
    angle_consistency = mean(
        [
            _score_from_variation(left_elbow_angles, scale=0.35),
            _score_from_variation(right_elbow_angles, scale=0.35),
        ]
    )
    arm_control = mean([arm_balance, angle_consistency])
    tracking_confidence = _tracking_confidence(trajectories)
    overall = mean(
        [
            timing_score,
            symmetry_score,
            stroke_consistency,
            posture_stability,
            arm_control,
        ]
    )
    total_arm_motion = left_arm_motion_avg + right_arm_motion_avg
    arm_motion_asymmetry = (
        abs(left_arm_motion_avg - right_arm_motion_avg) / total_arm_motion
        if total_arm_motion
        else 0.0
    )
    sampled_arm_motion = _sample_series(left_arm_motion) + _sample_series(
        right_arm_motion
    )
    valid_sampled_arm_motion = _valid_values(sampled_arm_motion)
    arm_motion_bounds = (
        (min(valid_sampled_arm_motion), max(valid_sampled_arm_motion))
        if valid_sampled_arm_motion
        else None
    )

    return {
        "scores": {
            "timing": timing_score,
            "symmetry": symmetry_score,
            "strokeConsistency": stroke_consistency,
            "postureStability": posture_stability,
            "armControl": arm_control,
            "overall": overall,
        },
        "intervals": intervals,
        "leftRange": left_range,
        "rightRange": right_range,
        "heightDelta": height_delta,
        "leftMotion": _sample_series(left_y_series),
        "rightMotion": _sample_series(right_y_series),
        "leftArmMotion": _normalize_series(left_arm_motion, bounds=arm_motion_bounds),
        "rightArmMotion": _normalize_series(right_arm_motion, bounds=arm_motion_bounds),
        "leftElbowAngle": _sample_series(left_elbow_angles),
        "rightElbowAngle": _sample_series(right_elbow_angles),
        "leftWristAngle": _sample_series(left_wrist_angles),
        "rightWristAngle": _sample_series(right_wrist_angles),
        "arm": {
            "leftArmMotionAverage": left_arm_motion_avg,
            "rightArmMotionAverage": right_arm_motion_avg,
            "armMotionAsymmetry": arm_motion_asymmetry,
            "leftElbowAngleRange": _range(left_elbow_angles),
            "rightElbowAngleRange": _range(right_elbow_angles),
            "trackingConfidence": tracking_confidence,
        },
    }
