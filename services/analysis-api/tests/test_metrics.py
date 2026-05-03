from app.metrics import compute_metrics, detect_stroke_peaks


def test_detect_stroke_peaks_finds_local_maxima():
    assert detect_stroke_peaks([0.1, 0.5, 0.2, 0.6, 0.1]) == [1, 3]


def test_compute_metrics_returns_scores():
    trajectories = {
        "left_wrist": [(0.1, value) for value in [0.2, 0.5, 0.2, 0.5, 0.2]],
        "right_wrist": [(0.2, value) for value in [0.25, 0.52, 0.25, 0.5, 0.25]],
        "left_shoulder": [(0.1, 0.2), (0.1, 0.21), (0.1, 0.2)],
        "right_shoulder": [(0.2, 0.2), (0.2, 0.21), (0.2, 0.2)],
    }

    result = compute_metrics(trajectories, sample_fps=10)

    assert result["scores"]["overall"] >= 0
    assert result["leftRange"] > 0
    assert result["rightRange"] > 0


def test_contribution_series_sum_to_percentages():
    trajectories = {
        "left_wrist": [(0.1, value) for value in [0.2, 0.5, 0.2, 0.5, 0.2]],
        "right_wrist": [(0.2, value) for value in [0.25, 0.52, 0.25, 0.5, 0.25]],
        "left_elbow": [(0.2, value) for value in [0.35, 0.37, 0.34, 0.39, 0.36]],
        "right_elbow": [(0.3, value) for value in [0.36, 0.38, 0.35, 0.4, 0.37]],
        "left_shoulder": [(0.1, 0.2), (0.1, 0.21), (0.1, 0.2), (0.1, 0.21), (0.1, 0.2)],
        "right_shoulder": [
            (0.2, 0.2),
            (0.2, 0.21),
            (0.2, 0.2),
            (0.2, 0.21),
            (0.2, 0.2),
        ],
        "left_index": [(0.1, value) for value in [0.42, 0.48, 0.43, 0.49, 0.44]],
        "right_index": [(0.2, value) for value in [0.43, 0.47, 0.42, 0.48, 0.43]],
        "left_thumb": [(0.12, value) for value in [0.44, 0.45, 0.43, 0.46, 0.44]],
        "right_thumb": [(0.22, value) for value in [0.45, 0.46, 0.44, 0.47, 0.45]],
        "left_pinky": [(0.08, value) for value in [0.44, 0.5, 0.45, 0.51, 0.46]],
        "right_pinky": [(0.18, value) for value in [0.45, 0.49, 0.44, 0.5, 0.45]],
    }

    result = compute_metrics(trajectories, sample_fps=10)
    frame_metrics = result["frameMetrics"]
    usage = result["muscleUsage"]

    assert round(usage["finger"] + usage["wrist"] + usage["arm"]) == 100
    for finger, wrist, arm in zip(
        frame_metrics["finger"], frame_metrics["wrist"], frame_metrics["arm"]
    ):
        if finger or wrist or arm:
            assert round(finger + wrist + arm) == 100
