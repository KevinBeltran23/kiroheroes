"""
Tests for scoring.py — normalisation and contribution percentage computation.
"""
from __future__ import annotations

import pytest

from app.scoring import compute_hand_scores, normalise_contributions


class TestNormaliseContributions:
    def test_sums_to_100(self):
        result = normalise_contributions(10.0, 20.0, 30.0)
        total = result["finger_pct"] + result["wrist_pct"] + result["arm_pct"]
        assert total == pytest.approx(100.0, abs=0.2)

    def test_equal_signals_give_equal_percentages(self):
        result = normalise_contributions(10.0, 10.0, 10.0)
        assert result["finger_pct"] == pytest.approx(33.3, abs=0.2)
        assert result["wrist_pct"] == pytest.approx(33.3, abs=0.2)
        assert result["arm_pct"] == pytest.approx(33.4, abs=0.2)

    def test_dominant_arm_gives_high_arm_pct(self):
        result = normalise_contributions(1.0, 1.0, 98.0)
        assert result["arm_pct"] > 90.0

    def test_dominant_wrist_gives_high_wrist_pct(self):
        result = normalise_contributions(1.0, 98.0, 1.0)
        assert result["wrist_pct"] > 90.0

    def test_all_zero_returns_equal_thirds(self):
        result = normalise_contributions(0.0, 0.0, 0.0)
        assert result["finger_pct"] == pytest.approx(33.3, abs=0.2)
        assert result["wrist_pct"] == pytest.approx(33.3, abs=0.2)

    def test_percentages_are_non_negative(self):
        result = normalise_contributions(5.0, 10.0, 15.0)
        assert result["finger_pct"] >= 0.0
        assert result["wrist_pct"] >= 0.0
        assert result["arm_pct"] >= 0.0


class TestComputeHandScores:
    def _features(self, finger=10.0, wrist=20.0, arm=30.0, compactness=0.7):
        return {
            "finger_raw": finger,
            "wrist_raw": wrist,
            "arm_raw": arm,
            "compactness": compactness,
        }

    def test_returns_required_keys(self):
        result = compute_hand_scores(self._features())
        for key in ("finger_pct", "wrist_pct", "arm_pct", "compactness",
                    "finger_raw", "wrist_raw", "arm_raw"):
            assert key in result

    def test_percentages_sum_to_100(self):
        result = compute_hand_scores(self._features())
        total = result["finger_pct"] + result["wrist_pct"] + result["arm_pct"]
        assert total == pytest.approx(100.0, abs=0.2)

    def test_compactness_preserved(self):
        result = compute_hand_scores(self._features(compactness=0.8))
        assert result["compactness"] == pytest.approx(0.8, abs=0.001)

    def test_raw_values_preserved(self):
        result = compute_hand_scores(self._features(finger=5.0, wrist=10.0, arm=15.0))
        assert result["finger_raw"] == pytest.approx(5.0, abs=0.001)
        assert result["wrist_raw"] == pytest.approx(10.0, abs=0.001)
        assert result["arm_raw"] == pytest.approx(15.0, abs=0.001)
