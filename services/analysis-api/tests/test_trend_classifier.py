"""
Tests for trend_classifier.py — threshold-based approach label classification.
"""
from __future__ import annotations

import pytest

from app.trend_classifier import THRESHOLDS, HandClassification, classify_hand, overall_summary


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scores(arm_pct=33.0, wrist_pct=33.0, finger_pct=34.0, compactness=0.5):
    return {
        "arm_pct": arm_pct,
        "wrist_pct": wrist_pct,
        "finger_pct": finger_pct,
        "compactness": compactness,
    }


def _classification(label="wrist-break", arm=10.0, wrist=60.0, finger=30.0, compactness=0.5):
    return HandClassification(
        label=label,
        arm_pct=arm,
        wrist_pct=wrist,
        finger_pct=finger,
        compactness=compactness,
        rule_matched="test",
        explanation="test explanation",
    )


# ---------------------------------------------------------------------------
# Label classification rules
# ---------------------------------------------------------------------------

class TestClassifyHand:
    def test_arm_heavy_right(self):
        scores = _scores(arm_pct=60.0, wrist_pct=25.0, finger_pct=15.0)
        result = classify_hand(scores, hand="right")
        assert result.label == "arm-heavy"

    def test_arm_heavy_left(self):
        scores = _scores(arm_pct=60.0, wrist_pct=25.0, finger_pct=15.0)
        result = classify_hand(scores, hand="left")
        assert result.label == "arm-heavy"

    def test_wrist_break_right(self):
        scores = _scores(arm_pct=15.0, wrist_pct=65.0, finger_pct=20.0)
        result = classify_hand(scores, hand="right")
        assert result.label == "wrist-break"

    def test_wrist_break_left(self):
        scores = _scores(arm_pct=15.0, wrist_pct=65.0, finger_pct=20.0)
        result = classify_hand(scores, hand="left")
        assert result.label == "wrist-break"

    def test_fulcrum_lift_compact_low_arm(self):
        scores = _scores(arm_pct=25.0, wrist_pct=30.0, finger_pct=45.0, compactness=0.8)
        result = classify_hand(scores, hand="right")
        assert result.label == "fulcrum-lift"

    def test_fulcrum_lift_not_triggered_low_compactness(self):
        # Same arm/wrist but low compactness → should NOT be fulcrum-lift
        scores = _scores(arm_pct=25.0, wrist_pct=30.0, finger_pct=45.0, compactness=0.2)
        result = classify_hand(scores, hand="right")
        assert result.label != "fulcrum-lift"

    def test_lead_by_the_bead(self):
        scores = _scores(arm_pct=20.0, wrist_pct=40.0, finger_pct=40.0, compactness=0.3)
        result = classify_hand(scores, hand="right")
        assert result.label == "lead-by-the-bead"

    def test_arm_heavy_takes_priority_over_wrist_break(self):
        # Both arm and wrist above thresholds — arm-heavy should win (checked first)
        scores = _scores(arm_pct=55.0, wrist_pct=55.0, finger_pct=0.0, compactness=0.5)
        # Normalise so they sum to 100
        total = 55.0 + 55.0
        scores = _scores(
            arm_pct=55.0 * 100 / total,
            wrist_pct=55.0 * 100 / total,
            finger_pct=0.0,
            compactness=0.5,
        )
        result = classify_hand(scores, hand="right")
        assert result.label == "arm-heavy"

    def test_result_has_explanation(self):
        scores = _scores(arm_pct=60.0, wrist_pct=25.0, finger_pct=15.0)
        result = classify_hand(scores, hand="right")
        assert len(result.explanation) > 0

    def test_result_has_rule_matched(self):
        scores = _scores(arm_pct=60.0, wrist_pct=25.0, finger_pct=15.0)
        result = classify_hand(scores, hand="right")
        assert len(result.rule_matched) > 0

    def test_explanation_contains_percentages(self):
        scores = _scores(arm_pct=60.0, wrist_pct=25.0, finger_pct=15.0)
        result = classify_hand(scores, hand="right")
        assert "60%" in result.explanation or "60" in result.explanation

    def test_valid_label_always_returned(self):
        valid_labels = {"arm-heavy", "fulcrum-lift", "lead-by-the-bead", "wrist-break"}
        for arm in [10, 30, 55, 70]:
            for wrist in [10, 30, 55, 70]:
                finger = max(0, 100 - arm - wrist)
                if arm + wrist > 100:
                    continue
                scores = _scores(arm_pct=float(arm), wrist_pct=float(wrist),
                                 finger_pct=float(finger), compactness=0.5)
                result = classify_hand(scores, hand="right")
                assert result.label in valid_labels


# ---------------------------------------------------------------------------
# Overall summary
# ---------------------------------------------------------------------------

class TestOverallSummary:
    def test_same_labels_mentions_both(self):
        right = _classification(label="wrist-break")
        left = _classification(label="wrist-break")
        summary = overall_summary(right, left)
        assert "wrist-break" in summary

    def test_different_labels_mentions_both(self):
        right = _classification(label="arm-heavy")
        left = _classification(label="wrist-break")
        summary = overall_summary(right, left)
        assert "arm-heavy" in summary
        assert "wrist-break" in summary

    def test_returns_non_empty_string(self):
        right = _classification(label="fulcrum-lift")
        left = _classification(label="lead-by-the-bead")
        assert len(overall_summary(right, left)) > 0
