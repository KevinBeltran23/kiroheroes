"""
scoring.py

Normalises raw motion signals into estimated movement contribution percentages
and computes supporting scores.

These are motion-based contribution estimates, not true muscle measurements.
"""
from __future__ import annotations


def normalise_contributions(finger_raw: float, wrist_raw: float, arm_raw: float) -> dict:
    """
    Normalise raw motion signals into contribution percentages summing to 100.

    If all signals are zero (no motion detected), returns equal thirds.

    Returns:
        finger_pct  — estimated finger contribution (0-100)
        wrist_pct   — estimated wrist contribution (0-100)
        arm_pct     — estimated arm contribution (0-100)
    """
    total = finger_raw + wrist_raw + arm_raw
    if total < 1e-9:
        return {"finger_pct": 33.3, "wrist_pct": 33.3, "arm_pct": 33.4}

    return {
        "finger_pct": round(100.0 * finger_raw / total, 1),
        "wrist_pct": round(100.0 * wrist_raw / total, 1),
        "arm_pct": round(100.0 * arm_raw / total, 1),
    }


def compute_hand_scores(features: dict) -> dict:
    """
    Compute per-hand contribution percentages and compactness from raw features.

    Args:
        features: output of extract_right_hand_features or extract_left_hand_features

    Returns dict with:
        finger_pct, wrist_pct, arm_pct  — contribution percentages
        compactness                      — 0-1 compactness score
        finger_raw, wrist_raw, arm_raw  — raw signals (for debugging/tuning)
    """
    contributions = normalise_contributions(
        features["finger_raw"],
        features["wrist_raw"],
        features["arm_raw"],
    )
    return {
        **contributions,
        "compactness": round(features.get("compactness", 0.0), 3),
        "finger_raw": round(features["finger_raw"], 4),
        "wrist_raw": round(features["wrist_raw"], 4),
        "arm_raw": round(features["arm_raw"], 4),
    }
