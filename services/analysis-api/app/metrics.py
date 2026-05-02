from __future__ import annotations

import math
from statistics import mean, pstdev


Point = tuple[float, float]


def _valid_y(points: list[Point]) -> list[float]:
    return [point[1] for point in points if not math.isnan(point[1])]


def _score_from_variation(values: list[float], scale: float = 1.0) -> float:
    if len(values) < 2:
        return 50.0
    avg = abs(mean(values)) or 1.0
    variation = pstdev(values) / avg
    return max(0.0, min(100.0, 100.0 - variation * 100.0 * scale))


def detect_stroke_peaks(y_values: list[float]) -> list[int]:
    peaks: list[int] = []
    if len(y_values) < 3:
        return peaks
    for index in range(1, len(y_values) - 1):
        prev_y, current_y, next_y = y_values[index - 1], y_values[index], y_values[index + 1]
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
    overall = mean([timing_score, symmetry_score, stroke_consistency, posture_stability])

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
    }
