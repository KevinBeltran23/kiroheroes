"""
Tests for feedback_generator.py — structured feedback item generation.
"""
from __future__ import annotations

import pytest

from app.feedback_generator import generate_feedback
from app.trend_classifier import HandClassification


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _classification(label: str, hand: str = "right") -> HandClassification:
    return HandClassification(
        label=label,
        arm_pct=33.0,
        wrist_pct=33.0,
        finger_pct=34.0,
        compactness=0.5,
        rule_matched="test",
        explanation=f"{hand} hand {label} explanation.",
    )


VALID_LABELS = ["arm-heavy", "fulcrum-lift", "lead-by-the-bead", "wrist-break"]


# ---------------------------------------------------------------------------
# Output structure
# ---------------------------------------------------------------------------

class TestGenerateFeedback:
    def test_returns_list(self):
        result = generate_feedback(
            _classification("wrist-break", "right"),
            _classification("wrist-break", "left"),
        )
        assert isinstance(result, list)

    def test_two_items_when_same_label(self):
        result = generate_feedback(
            _classification("wrist-break", "right"),
            _classification("wrist-break", "left"),
        )
        # One item per hand, no asymmetry item
        assert len(result) == 2

    def test_three_items_when_labels_differ(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("wrist-break", "left"),
        )
        # One per hand + asymmetry item
        assert len(result) == 3

    def test_all_items_have_required_fields(self):
        result = generate_feedback(
            _classification("wrist-break", "right"),
            _classification("wrist-break", "left"),
        )
        for item in result:
            for field in ("id", "type", "severity", "title", "explanation", "suggestion"):
                assert field in item, f"Missing field '{field}' in feedback item"

    def test_item_ids_are_unique(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("wrist-break", "left"),
        )
        ids = [item["id"] for item in result]
        assert len(ids) == len(set(ids)), "Duplicate feedback item IDs"

    def test_right_hand_item_id_contains_right(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("arm-heavy", "left"),
        )
        right_items = [item for item in result if "right" in item["id"]]
        assert len(right_items) == 1

    def test_left_hand_item_id_contains_left(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("arm-heavy", "left"),
        )
        left_items = [item for item in result if "left" in item["id"]]
        assert len(left_items) == 1


# ---------------------------------------------------------------------------
# Asymmetry feedback
# ---------------------------------------------------------------------------

class TestAsymmetryFeedback:
    def test_asymmetry_item_present_when_labels_differ(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("wrist-break", "left"),
        )
        ids = [item["id"] for item in result]
        assert "hand-asymmetry" in ids

    def test_asymmetry_item_absent_when_labels_same(self):
        result = generate_feedback(
            _classification("fulcrum-lift", "right"),
            _classification("fulcrum-lift", "left"),
        )
        ids = [item["id"] for item in result]
        assert "hand-asymmetry" not in ids

    def test_asymmetry_explanation_mentions_both_labels(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("wrist-break", "left"),
        )
        asymmetry = next(item for item in result if item["id"] == "hand-asymmetry")
        assert "arm-heavy" in asymmetry["explanation"]
        assert "wrist-break" in asymmetry["explanation"]

    def test_asymmetry_item_type_is_symmetry(self):
        result = generate_feedback(
            _classification("arm-heavy", "right"),
            _classification("wrist-break", "left"),
        )
        asymmetry = next(item for item in result if item["id"] == "hand-asymmetry")
        assert asymmetry["type"] == "symmetry"


# ---------------------------------------------------------------------------
# All labels produce feedback
# ---------------------------------------------------------------------------

class TestAllLabelsProduceFeedback:
    @pytest.mark.parametrize("label", VALID_LABELS)
    def test_each_label_produces_feedback_item(self, label):
        result = generate_feedback(
            _classification(label, "right"),
            _classification(label, "left"),
        )
        assert len(result) >= 2

    @pytest.mark.parametrize("label", VALID_LABELS)
    def test_arm_heavy_has_warning_severity(self, label):
        result = generate_feedback(
            _classification(label, "right"),
            _classification(label, "left"),
        )
        right_item = next(item for item in result if "right" in item["id"])
        if label == "arm-heavy":
            assert right_item["severity"] == "warning"
        else:
            assert right_item["severity"] == "info"
