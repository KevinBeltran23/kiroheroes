"""
trend_classifier.py

Threshold-based approach classifier for per-hand drumming technique labels.

Labels (shared for both hands):
    arm-heavy       — stroke initiated from elbow/arm chain
    fulcrum-lift    — compact initiation, low wrist break, near fulcrum area
    lead-by-the-bead — wrist-initiated with forearm accompaniment
    wrist-break     — primarily wrist-driven, minimal arm contribution

Right hand and left hand share the same label taxonomy but use different
feature interpretations:
    Right hand: vertical wrist break emphasis
    Left hand:  rotational wrist motion emphasis

Classification order (most arm → most wrist):
    arm-heavy → fulcrum-lift → lead-by-the-bead → wrist-break

All thresholds are configurable via the THRESHOLDS dict.
"""
from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Configurable thresholds
# Tune these values as real data is collected.
# ---------------------------------------------------------------------------

THRESHOLDS: dict[str, float] = {
    # arm_pct above this → arm-heavy
    "arm_heavy_arm_pct_min": 50.0,

    # wrist_pct above this → wrist-break
    "wrist_break_wrist_pct_min": 50.0,

    # fulcrum-lift: arm_pct below this AND compactness above this
    "fulcrum_lift_arm_pct_max": 40.0,
    "fulcrum_lift_compactness_min": 0.55,

    # lead-by-the-bead: wrist_pct above this AND arm_pct above this (forearm accompaniment)
    "lead_bead_wrist_pct_min": 35.0,
    "lead_bead_arm_pct_min": 15.0,
}


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class HandClassification:
    label: str
    arm_pct: float
    wrist_pct: float
    finger_pct: float
    compactness: float
    rule_matched: str
    explanation: str


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

def classify_hand(scores: dict, *, hand: str) -> HandClassification:
    """
    Classify the approach label for one hand.

    Args:
        scores: output of compute_hand_scores — must contain
                arm_pct, wrist_pct, finger_pct, compactness
        hand:   "right" or "left" (affects explanation wording)

    Returns:
        HandClassification with label, matched rule, and explanation text.
    """
    arm_pct = scores["arm_pct"]
    wrist_pct = scores["wrist_pct"]
    finger_pct = scores["finger_pct"]
    compactness = scores["compactness"]

    t = THRESHOLDS

    # Rule 1: arm-heavy — arm contribution clearly dominant
    if arm_pct >= t["arm_heavy_arm_pct_min"]:
        return HandClassification(
            label="arm-heavy",
            arm_pct=arm_pct,
            wrist_pct=wrist_pct,
            finger_pct=finger_pct,
            compactness=compactness,
            rule_matched="arm_pct >= arm_heavy_arm_pct_min",
            explanation=_explanation("arm-heavy", hand, arm_pct, wrist_pct),
        )

    # Rule 2: wrist-break — wrist contribution clearly dominant
    if wrist_pct >= t["wrist_break_wrist_pct_min"]:
        return HandClassification(
            label="wrist-break",
            arm_pct=arm_pct,
            wrist_pct=wrist_pct,
            finger_pct=finger_pct,
            compactness=compactness,
            rule_matched="wrist_pct >= wrist_break_wrist_pct_min",
            explanation=_explanation("wrist-break", hand, arm_pct, wrist_pct),
        )

    # Rule 3: fulcrum-lift — compact motion, low arm, low wrist break
    if (
        arm_pct < t["fulcrum_lift_arm_pct_max"]
        and compactness >= t["fulcrum_lift_compactness_min"]
    ):
        return HandClassification(
            label="fulcrum-lift",
            arm_pct=arm_pct,
            wrist_pct=wrist_pct,
            finger_pct=finger_pct,
            compactness=compactness,
            rule_matched="arm_pct < fulcrum_lift_arm_pct_max AND compactness >= fulcrum_lift_compactness_min",
            explanation=_explanation("fulcrum-lift", hand, arm_pct, wrist_pct),
        )

    # Rule 4: lead-by-the-bead — wrist-initiated with forearm accompaniment
    if (
        wrist_pct >= t["lead_bead_wrist_pct_min"]
        and arm_pct >= t["lead_bead_arm_pct_min"]
    ):
        return HandClassification(
            label="lead-by-the-bead",
            arm_pct=arm_pct,
            wrist_pct=wrist_pct,
            finger_pct=finger_pct,
            compactness=compactness,
            rule_matched="wrist_pct >= lead_bead_wrist_pct_min AND arm_pct >= lead_bead_arm_pct_min",
            explanation=_explanation("lead-by-the-bead", hand, arm_pct, wrist_pct),
        )

    # Fallback: assign to whichever raw signal is highest
    # finger-dominant without compactness → lead-by-the-bead (not fulcrum-lift)
    dominant = max(
        [("arm-heavy", arm_pct), ("wrist-break", wrist_pct), ("lead-by-the-bead", finger_pct)],
        key=lambda x: x[1],
    )[0]
    return HandClassification(
        label=dominant,
        arm_pct=arm_pct,
        wrist_pct=wrist_pct,
        finger_pct=finger_pct,
        compactness=compactness,
        rule_matched="fallback: dominant signal",
        explanation=_explanation(dominant, hand, arm_pct, wrist_pct),
    )


# ---------------------------------------------------------------------------
# Explanation text
# ---------------------------------------------------------------------------

_EXPLANATIONS: dict[str, dict[str, str]] = {
    "arm-heavy": {
        "right": (
            "Visible motion suggests the stroke is primarily driven from the elbow and forearm. "
            "The wrist appears to be contributing less than the arm chain. "
            "This inferred pattern can reduce endurance and limit speed at higher tempos. "
            "Consider engaging the wrist more to reduce visible arm dominance."
        ),
        "left": (
            "The stroke pattern appears to be initiated from the elbow and arm chain. "
            "The expected rotational wrist motion is less prominent than the observed arm contribution. "
            "Try to let the wrist lead the stroke with the arm following."
        ),
    },
    "fulcrum-lift": {
        "right": (
            "The stroke motion appears compact and likely initiates near the fulcrum area. "
            "There is little visible wrist break, and the wrist stays roughly in line with the forearm. "
            "This inferred pattern is consistent with a controlled, efficient approach."
        ),
        "left": (
            "The stroke pattern appears compact and centered near the fulcrum area "
            "where the thumb, index, and middle fingers relate. "
            "This is an inferred compact approach with minimal large-scale arm or wrist motion."
        ),
    },
    "lead-by-the-bead": {
        "right": (
            "The stroke shows more visible wrist motion than arm-heavy, "
            "but the forearm is still moving with the wrist. "
            "This is an inferred wrist-led pattern with some forearm accompaniment."
        ),
        "left": (
            "The wrist appears to be driving the stroke, but the forearm is moving along with it. "
            "This is an inferred wrist-led pattern with forearm accompaniment, "
            "consistent with traditional grip when the wrist leads but the arm follows."
        ),
    },
    "wrist-break": {
        "right": (
            "Visible motion suggests the stroke is primarily driven by vertical wrist movement. "
            "Arm contribution appears minimal. "
            "This inferred pattern is consistent with an efficient wrist-dominant approach."
        ),
        "left": (
            "Visible motion suggests the stroke is primarily driven by rotational wrist movement. "
            "Arm contribution appears minimal. "
            "This inferred pattern is consistent with an efficient wrist-dominant approach for traditional grip."
        ),
    },
}


def _explanation(label: str, hand: str, arm_pct: float, wrist_pct: float) -> str:
    hand_key = "right" if hand == "right" else "left"
    base = _EXPLANATIONS.get(label, {}).get(hand_key, "No explanation available.")
    return f"{base} (estimated arm: {arm_pct:.0f}%, wrist: {wrist_pct:.0f}%)"


# ---------------------------------------------------------------------------
# Overall summary
# ---------------------------------------------------------------------------

def overall_summary(right: HandClassification, left: HandClassification) -> str:
    """Generate a short overall summary from both hand labels."""
    if right.label == left.label:
        return (
            f"Both hands show a '{right.label}' approach pattern. "
            f"{_EXPLANATIONS.get(right.label, {}).get('right', '')}"
        )
    return (
        f"Right hand: '{right.label}'. Left hand: '{left.label}'. "
        "The two hands are showing different approach patterns, "
        "which may reflect technique differences or grip asymmetry."
    )
