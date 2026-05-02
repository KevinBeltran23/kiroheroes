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
