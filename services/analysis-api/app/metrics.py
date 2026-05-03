from __future__ import annotations

import math
from statistics import mean, pstdev


Point = tuple[float, ...]
FrameMetric = dict[str, float]

LEFT_BICEP_RANGE: tuple[float, float] = (10.5, 150.8)
LEFT_FOREARM_RANGE: tuple[float, float] = (164.5, 23.9)
LEFT_WRIST_RANGE: tuple[float, float] = (62.9, 90.5)
RIGHT_BICEP_RANGE: tuple[float, float] = (25.4, 158.6)
RIGHT_FOREARM_RANGE: tuple[float, float] = (142.2, 20.8)
RIGHT_WRIST_RANGE: tuple[float, float] = (96.8, 37.1)


def _clamp_score(value: float) -> float:
    return max(0.0, min(100.0, value))


def _is_number(value: float) -> bool:
    return not math.isnan(value) and not math.isinf(value)


def _is_valid(point: Point | None) -> bool:
    return (
        bool(point)
        and len(point) >= 2
        and _is_number(point[0])
        and _is_number(point[1])
    )


def _visibility(point: Point | None) -> float:
    if not _is_valid(point):
        return 0.0
    if point is None or len(point) < 4 or not _is_number(point[3]):
        return 1.0
    return point[3]


def _xy(point: Point | None) -> tuple[float, float] | None:
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


def _angle(a: Point | None, b: Point | None, c: Point | None) -> float:
    a_xy = _xy(a)
    b_xy = _xy(b)
    c_xy = _xy(c)
    if not a_xy or not b_xy or not c_xy:
        return float("nan")

    ba = (a_xy[0] - b_xy[0], a_xy[1] - b_xy[1])
    bc = (c_xy[0] - b_xy[0], c_xy[1] - b_xy[1])
    mag_ba = math.hypot(*ba)
    mag_bc = math.hypot(*bc)
    if mag_ba == 0 or mag_bc == 0:
        return float("nan")

    cosine = max(-1.0, min(1.0, (ba[0] * bc[0] + ba[1] * bc[1]) / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _orientation_from_vertical(a: Point | None, b: Point | None) -> float:
    a_xy = _xy(a)
    b_xy = _xy(b)
    if not a_xy or not b_xy:
        return float("nan")
    dx = b_xy[0] - a_xy[0]
    dy = b_xy[1] - a_xy[1]
    return abs(math.degrees(math.atan2(dx, dy)))


def _to_percent(angle: float, lo: float, hi: float) -> float:
    if math.isnan(angle):
        return float("nan")
    clamped = max(min(lo, hi), min(max(lo, hi), angle))
    return max(0.0, min(100.0, (clamped - lo) / (hi - lo) * 100.0))


def _series_delta(values: list[float]) -> list[float]:
    deltas: list[float] = [0.0]
    for index in range(1, len(values)):
        prev_value = values[index - 1]
        value = values[index]
        if math.isnan(prev_value) or math.isnan(value):
            deltas.append(0.0)
        else:
            deltas.append(abs(value - prev_value))
    return deltas


def _normalize(values: list[float], multiplier: float = 1.0) -> list[float]:
    clean = _valid_values(values)
    max_value = max(clean) if clean else 0.0
    if max_value <= 0:
        return [0.0 for _ in values]
    return [
        round(
            max(
                0.0,
                min(
                    100.0,
                    (0.0 if not _is_number(value) else value)
                    / max_value
                    * 100
                    * multiplier,
                ),
            ),
            1,
        )
        for value in values
    ]


def _range(values: list[float]) -> float:
    clean = _valid_values(values)
    return max(clean) - min(clean) if clean else 0.0


def _average(values: list[float]) -> float:
    clean = _valid_values(values)
    return mean(clean) if clean else 0.0


def _distance(a: Point | None, b: Point | None) -> float:
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

    coverage = len(valid_points) / len(points)
    visibility = mean(_visibility(point) for point in valid_points)
    return _clamp_score(visibility * coverage * 100.0)


def _normalize_with_bounds(
    values: list[float], bounds: tuple[float, float] | None = None
) -> list[float]:
    clean = _valid_values(values)
    if not clean:
        return [0.0 for _ in values]
    minimum, maximum = bounds if bounds else (min(clean), max(clean))
    spread = maximum - minimum
    if spread <= 0:
        return [0.0 for _ in values]
    return [
        (
            round(_clamp_score(((value - minimum) / spread) * 100.0), 1)
            if _is_number(value)
            else 0.0
        )
        for value in values
    ]


def _resample(values: list[float], target_count: int = 48) -> list[float]:
    if len(values) <= target_count:
        return [round(value, 1) if _is_number(value) else 0.0 for value in values]
    step = len(values) / target_count
    output: list[float] = []
    for index in range(target_count):
        start = int(index * step)
        end = max(start + 1, int((index + 1) * step))
        output.append(round(_average(values[start:end]), 1))
    return output


def _independent_contribution_series(
    finger: list[float], wrist: list[float], arm: list[float], target_count: int = 48
) -> dict[str, list[float]]:
    return {
        "finger": _resample(_normalize(finger, multiplier=0.9), target_count),
        "wrist": _resample(_normalize(wrist, multiplier=1.15), target_count),
        "arm": _resample(_normalize(arm), target_count),
    }


def _hand_angles(
    trajectories: dict[str, list[Point]], side: str
) -> dict[str, list[float]]:
    shoulder = trajectories.get(f"{side}_shoulder", [])
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
    index_tip = trajectories.get(f"{side}_index", [])
    pinky = trajectories.get(f"{side}_pinky", [])
    thumb = trajectories.get(f"{side}_thumb", [])
    frame_count = max(
        len(shoulder), len(elbow), len(wrist), len(index_tip), len(pinky), len(thumb)
    )

    elbow_angles: list[float] = []
    shoulder_angles: list[float] = []
    wrist_break_angles: list[float] = []
    hand_spread: list[float] = []

    for index in range(frame_count):
        shoulder_point = shoulder[index] if index < len(shoulder) else None
        elbow_point = elbow[index] if index < len(elbow) else None
        wrist_point = wrist[index] if index < len(wrist) else None
        index_point = index_tip[index] if index < len(index_tip) else None
        pinky_point = pinky[index] if index < len(pinky) else None
        thumb_point = thumb[index] if index < len(thumb) else None

        elbow_angles.append(_angle(shoulder_point, elbow_point, wrist_point))
        shoulder_angles.append(
            _angle(
                elbow_point,
                shoulder_point,
                (
                    (shoulder_point[0], shoulder_point[1] - 0.2)
                    if _is_valid(shoulder_point)
                    else None
                ),
            )
        )
        wrist_break_angles.append(
            abs(180.0 - _angle(elbow_point, wrist_point, index_point))
        )

        if _is_valid(index_point) and _is_valid(pinky_point) and _is_valid(thumb_point):
            hand_spread.append(
                _distance(index_point, thumb_point)
                + _distance(pinky_point, thumb_point)
            )
        else:
            hand_spread.append(float("nan"))

    return {
        "elbow": elbow_angles,
        "shoulder": shoulder_angles,
        "wristBreak": wrist_break_angles,
        "handSpread": hand_spread,
    }


def _hand_activation_percentages(
    trajectories: dict[str, list[Point]], side: str
) -> dict[str, list[float]]:
    shoulder = trajectories.get(f"{side}_shoulder", [])
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
    index_tip = trajectories.get(f"{side}_index", [])
    hand_wrist = trajectories.get(f"{side}_hand_wrist", [])
    middle_mcp = trajectories.get(f"{side}_middle_mcp", [])
    frame_count = max(
        len(shoulder),
        len(elbow),
        len(wrist),
        len(index_tip),
        len(hand_wrist),
        len(middle_mcp),
    )
    if side == "left":
        bicep_range = LEFT_BICEP_RANGE
        forearm_range = LEFT_FOREARM_RANGE
        wrist_range = LEFT_WRIST_RANGE
    else:
        bicep_range = RIGHT_BICEP_RANGE
        forearm_range = RIGHT_FOREARM_RANGE
        wrist_range = RIGHT_WRIST_RANGE

    bicep: list[float] = []
    forearm: list[float] = []
    wrist_break: list[float] = []

    for index in range(frame_count):
        shoulder_point = shoulder[index] if index < len(shoulder) else None
        elbow_point = elbow[index] if index < len(elbow) else None
        wrist_point = wrist[index] if index < len(wrist) else None
        index_point = index_tip[index] if index < len(index_tip) else None
        hand_wrist_point = hand_wrist[index] if index < len(hand_wrist) else None
        middle_mcp_point = middle_mcp[index] if index < len(middle_mcp) else None

        bicep.append(
            _to_percent(
                _orientation_from_vertical(shoulder_point, elbow_point),
                *bicep_range,
            )
        )
        forearm.append(
            _to_percent(
                _angle(shoulder_point, elbow_point, wrist_point),
                *forearm_range,
            )
        )
        if side == "left":
            wrist_angle = (
                _orientation_from_vertical(hand_wrist_point, middle_mcp_point)
                if _is_valid(hand_wrist_point) and _is_valid(middle_mcp_point)
                else _orientation_from_vertical(wrist_point, index_point)
            )
        else:
            wrist_angle = (
                _angle(elbow_point, wrist_point, middle_mcp_point)
                if _is_valid(middle_mcp_point)
                else _angle(elbow_point, wrist_point, index_point)
            )
        wrist_break.append(_to_percent(wrist_angle, *wrist_range))

    return {"bicep": bicep, "forearm": forearm, "wristBreak": wrist_break}


def _arm_motion_series(
    trajectories: dict[str, list[Point]], side: str, elbow_angles: list[float]
) -> list[float]:
    shoulder = trajectories.get(f"{side}_shoulder", [])
    elbow = trajectories.get(f"{side}_elbow", [])
    wrist = trajectories.get(f"{side}_wrist", [])
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


def _approach_category(
    arm: float, wrist: float, finger: float, wrist_break: float
) -> dict[str, object]:
    scores = {
        "Arm-Heavy": arm * 1.1,
        "Fulcrum Lift": max(finger, 100.0 - wrist) * 0.9,
        "Lead by the Bead": finger * 0.75 + wrist * 0.25,
        "Wrist Break": wrist_break * 2.4 + wrist * 0.35,
    }
    category = max(scores, key=scores.get)
    confidence = max(35.0, min(95.0, scores[category]))
    summaries = {
        "Arm-Heavy": "You're using a lot of arm. Try focusing on smaller motions from the wrist to improve efficiency and control.",
        "Fulcrum Lift": "The motion is lifting from the fulcrum more than rotating through a relaxed wrist path.",
        "Lead by the Bead": "The bead appears to initiate the stroke path, which can help clarity when the pathway stays consistent.",
        "Wrist Break": "The wrist angle changes sharply through the stroke. Keep the hand connected to the forearm and reduce late wrist collapse.",
    }
    return {
        "category": category,
        "confidence": round(confidence, 1),
        "summary": summaries[category],
        "scores": {key: round(value, 1) for key, value in scores.items()},
    }


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
    left_consistency = _score_from_variation(left_y, scale=0.45)
    right_consistency = _score_from_variation(right_y, scale=0.45)
    stroke_consistency = (left_consistency + right_consistency) / 2.0

    shoulder_motion = _valid_values(
        _motion_series(trajectories.get("left_shoulder", []))
        + _motion_series(trajectories.get("right_shoulder", []))
    )
    posture_stability = (
        _clamp_score(100.0 - mean(shoulder_motion) * 650.0) if shoulder_motion else 50.0
    )

    left_angles = _hand_angles(trajectories, "left")
    right_angles = _hand_angles(trajectories, "right")
    left_arm_motion = _arm_motion_series(trajectories, "left", left_angles["elbow"])
    right_arm_motion = _arm_motion_series(trajectories, "right", right_angles["elbow"])
    left_arm_motion_avg = _average(left_arm_motion)
    right_arm_motion_avg = _average(right_arm_motion)
    arm_balance = _score_from_balance(
        left_arm_motion_avg, right_arm_motion_avg, scale=1.2
    )
    angle_consistency = mean(
        [
            _score_from_variation(left_angles["elbow"], scale=0.35),
            _score_from_variation(right_angles["elbow"], scale=0.35),
        ]
    )
    arm_control = mean([arm_balance, angle_consistency])
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
    tracking_confidence = _tracking_confidence(trajectories)
    sampled_arm_motion = _resample(left_arm_motion) + _resample(right_arm_motion)
    valid_sampled_arm_motion = _valid_values(sampled_arm_motion)
    arm_motion_bounds = (
        (min(valid_sampled_arm_motion), max(valid_sampled_arm_motion))
        if valid_sampled_arm_motion
        else None
    )
    left_activation = _hand_activation_percentages(trajectories, "left")
    right_activation = _hand_activation_percentages(trajectories, "right")
    elbow_motion = _series_delta(left_angles["elbow"]) + _series_delta(
        right_angles["elbow"]
    )
    shoulder_motion = _series_delta(left_angles["shoulder"]) + _series_delta(
        right_angles["shoulder"]
    )
    wrist_motion = _series_delta(left_angles["wristBreak"]) + _series_delta(
        right_angles["wristBreak"]
    )
    finger_motion = _series_delta(left_angles["handSpread"]) + _series_delta(
        right_angles["handSpread"]
    )

    bicep_activation = left_activation["bicep"] + right_activation["bicep"]
    forearm_activation = left_activation["forearm"] + right_activation["forearm"]
    wrist_activation = left_activation["wristBreak"] + right_activation["wristBreak"]
    contribution_series = _independent_contribution_series(
        finger_motion,
        wrist_activation,
        bicep_activation + forearm_activation,
    )
    section_series = {
        "bicep": _resample(_normalize(bicep_activation)),
        "forearm": _resample(_normalize(forearm_activation)),
        "wristBreak": contribution_series["wrist"],
    }
    muscle_usage = {
        "bicep": round(_average(section_series["bicep"]), 1),
        "forearm": round(_average(section_series["forearm"]), 1),
        "wristBreak": round(_average(section_series["wristBreak"]), 1),
        "finger": round(_average(contribution_series["finger"]), 1),
        "wrist": round(_average(contribution_series["wrist"]), 1),
        "arm": round(_average(contribution_series["arm"]), 1),
    }
    wrist_break_mean = (
        _average(left_angles["wristBreak"]) + _average(right_angles["wristBreak"])
    ) / 2.0
    approach = _approach_category(
        muscle_usage["arm"],
        muscle_usage["wrist"],
        muscle_usage["finger"],
        wrist_break_mean,
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
        "leftMotion": _resample(left_y_series),
        "rightMotion": _resample(right_y_series),
        "muscleUsage": muscle_usage,
        "approach": approach,
        "angles": {
            "left": {
                "bicep": round(_average(left_activation["bicep"]), 1),
                "forearm": round(_average(left_activation["forearm"]), 1),
                "wristBreak": round(_average(left_activation["wristBreak"]), 1),
            },
            "right": {
                "bicep": round(_average(right_activation["bicep"]), 1),
                "forearm": round(_average(right_activation["forearm"]), 1),
                "wristBreak": round(_average(right_activation["wristBreak"]), 1),
            },
        },
        "arm": {
            "leftArmMotionAverage": left_arm_motion_avg,
            "rightArmMotionAverage": right_arm_motion_avg,
            "armMotionAsymmetry": arm_motion_asymmetry,
            "leftElbowAngleRange": _range(left_angles["elbow"]),
            "rightElbowAngleRange": _range(right_angles["elbow"]),
            "trackingConfidence": tracking_confidence,
        },
        "frameMetrics": {
            "finger": contribution_series["finger"],
            "wrist": contribution_series["wrist"],
            "arm": contribution_series["arm"],
            "leftArmMotion": _resample(
                _normalize_with_bounds(left_arm_motion, arm_motion_bounds)
            ),
            "rightArmMotion": _resample(
                _normalize_with_bounds(right_arm_motion, arm_motion_bounds)
            ),
            "leftElbowAngle": _resample(left_angles["elbow"]),
            "rightElbowAngle": _resample(right_angles["elbow"]),
            "leftWristAngle": _resample(left_angles["wristBreak"]),
            "rightWristAngle": _resample(right_angles["wristBreak"]),
            "leftBicep": _resample(left_activation["bicep"]),
            "rightBicep": _resample(right_activation["bicep"]),
            "leftForearm": _resample(left_activation["forearm"]),
            "rightForearm": _resample(right_activation["forearm"]),
            "leftWristBreak": _resample(left_activation["wristBreak"]),
            "rightWristBreak": _resample(right_activation["wristBreak"]),
        },
    }
