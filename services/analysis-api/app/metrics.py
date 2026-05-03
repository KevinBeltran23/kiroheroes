from __future__ import annotations

import math
from statistics import mean, pstdev


Point = tuple[float, float]
FrameMetric = dict[str, float]


def _valid_y(points: list[Point]) -> list[float]:
    return [point[1] for point in points if not math.isnan(point[1])]


def _score_from_variation(values: list[float], scale: float = 1.0) -> float:
    if len(values) < 2:
        return 50.0
    avg = abs(mean(values)) or 1.0
    variation = pstdev(values) / avg
    return max(0.0, min(100.0, 100.0 - variation * 100.0 * scale))


def _is_valid(point: Point | None) -> bool:
    return bool(point) and not math.isnan(point[0]) and not math.isnan(point[1])


def _angle(a: Point | None, b: Point | None, c: Point | None) -> float:
    if not (_is_valid(a) and _is_valid(b) and _is_valid(c)):
        return float("nan")

    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    mag_ba = math.hypot(*ba)
    mag_bc = math.hypot(*bc)
    if mag_ba == 0 or mag_bc == 0:
        return float("nan")

    cosine = max(-1.0, min(1.0, (ba[0] * bc[0] + ba[1] * bc[1]) / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


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
    clean = [value for value in values if not math.isnan(value)]
    max_value = max(clean) if clean else 0.0
    if max_value <= 0:
        return [0.0 for _ in values]
    return [
        round(
            max(
                0.0,
                min(
                    100.0,
                    (0.0 if math.isnan(value) else value)
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
    clean = [value for value in values if not math.isnan(value)]
    return max(clean) - min(clean) if clean else 0.0


def _average(values: list[float]) -> float:
    clean = [value for value in values if not math.isnan(value)]
    return mean(clean) if clean else 0.0


def _resample(values: list[float], target_count: int = 48) -> list[float]:
    if len(values) <= target_count:
        return [round(value, 1) for value in values]
    step = len(values) / target_count
    output: list[float] = []
    for index in range(target_count):
        start = int(index * step)
        end = max(start + 1, int((index + 1) * step))
        output.append(round(_average(values[start:end]), 1))
    return output


def _normalized_contribution_series(
    finger: list[float], wrist: list[float], arm: list[float], target_count: int = 48
) -> dict[str, list[float]]:
    count = max(len(finger), len(wrist), len(arm), 1)
    normalized = {"finger": [], "wrist": [], "arm": []}
    last_split = {"finger": 33.3, "wrist": 33.3, "arm": 33.4}

    for index in range(count):
        finger_value = (
            finger[index]
            if index < len(finger) and not math.isnan(finger[index])
            else 0.0
        )
        wrist_value = (
            wrist[index] if index < len(wrist) and not math.isnan(wrist[index]) else 0.0
        )
        arm_value = (
            arm[index] if index < len(arm) and not math.isnan(arm[index]) else 0.0
        )
        total = finger_value + wrist_value + arm_value

        if total <= 0:
            normalized["finger"].append(last_split["finger"])
            normalized["wrist"].append(last_split["wrist"])
            normalized["arm"].append(last_split["arm"])
            continue

        finger_percent = round(finger_value / total * 100.0, 1)
        wrist_percent = round(wrist_value / total * 100.0, 1)
        arm_percent = round(100.0 - finger_percent - wrist_percent, 1)
        last_split = {
            "finger": finger_percent,
            "wrist": wrist_percent,
            "arm": arm_percent,
        }
        normalized["finger"].append(last_split["finger"])
        normalized["wrist"].append(last_split["wrist"])
        normalized["arm"].append(last_split["arm"])

    return {
        "finger": _resample(normalized["finger"], target_count),
        "wrist": _resample(normalized["wrist"], target_count),
        "arm": _resample(normalized["arm"], target_count),
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
                math.dist(index_point, thumb_point)
                + math.dist(pinky_point, thumb_point)
            )
        else:
            hand_spread.append(float("nan"))

    return {
        "elbow": elbow_angles,
        "shoulder": shoulder_angles,
        "wristBreak": wrist_break_angles,
        "handSpread": hand_spread,
    }


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
    left_y = _valid_y(trajectories.get("left_wrist", []))
    right_y = _valid_y(trajectories.get("right_wrist", []))
    left_peaks = detect_stroke_peaks(left_y)
    right_peaks = detect_stroke_peaks(right_y)
    all_peaks = sorted(left_peaks + right_peaks)
    intervals = [
        (all_peaks[index] - all_peaks[index - 1]) / sample_fps
        for index in range(1, len(all_peaks))
        if all_peaks[index] > all_peaks[index - 1]
    ]

    left_range = max(left_y) - min(left_y) if left_y else 0.0
    right_range = max(right_y) - min(right_y) if right_y else 0.0
    height_delta = abs(left_range - right_range)
    symmetry_score = max(0.0, min(100.0, 100.0 - height_delta * 250.0))

    timing_score = _score_from_variation(intervals, scale=1.3)
    left_consistency = _score_from_variation(left_y, scale=0.45)
    right_consistency = _score_from_variation(right_y, scale=0.45)
    stroke_consistency = (left_consistency + right_consistency) / 2.0

    shoulder_y = _valid_y(trajectories.get("left_shoulder", [])) + _valid_y(
        trajectories.get("right_shoulder", [])
    )
    posture_stability = _score_from_variation(shoulder_y, scale=2.0)
    overall = mean(
        [timing_score, symmetry_score, stroke_consistency, posture_stability]
    )

    left_angles = _hand_angles(trajectories, "left")
    right_angles = _hand_angles(trajectories, "right")
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

    contribution_series = _normalized_contribution_series(
        finger_motion,
        [value * 1.15 for value in wrist_motion],
        elbow_motion + shoulder_motion,
    )
    muscle_usage = {
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
            "overall": overall,
        },
        "intervals": intervals,
        "leftRange": left_range,
        "rightRange": right_range,
        "heightDelta": height_delta,
        "leftMotion": left_y[:24],
        "rightMotion": right_y[:24],
        "muscleUsage": muscle_usage,
        "approach": approach,
        "angles": {
            "left": {
                "bicep": round(_average(left_angles["shoulder"]), 1),
                "forearm": round(_average(left_angles["elbow"]), 1),
                "wristBreak": round(_average(left_angles["wristBreak"]), 1),
            },
            "right": {
                "bicep": round(_average(right_angles["shoulder"]), 1),
                "forearm": round(_average(right_angles["elbow"]), 1),
                "wristBreak": round(_average(right_angles["wristBreak"]), 1),
            },
        },
        "frameMetrics": {
            "finger": contribution_series["finger"],
            "wrist": contribution_series["wrist"],
            "arm": contribution_series["arm"],
            "leftWristBreak": _resample(left_angles["wristBreak"]),
            "rightWristBreak": _resample(right_angles["wristBreak"]),
        },
    }
