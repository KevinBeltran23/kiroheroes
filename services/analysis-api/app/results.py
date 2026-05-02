"""
results.py

Shapes the final result document written to Firestore.
Combines existing timing/symmetry metrics with per-hand approach labels,
contribution percentages, and feedback items.
"""
from __future__ import annotations

from .feedback_generator import generate_feedback
from .trend_classifier import HandClassification


def _hand_classification_from_metrics(metrics: dict, side: str) -> HandClassification:
    """Reconstruct a HandClassification from the metrics dict for feedback generation."""
    hand = metrics[f"{side}Hand"]
    scores = hand["scores"]
    return HandClassification(
        label=hand["label"],
        arm_pct=scores["arm_pct"],
        wrist_pct=scores["wrist_pct"],
        finger_pct=scores["finger_pct"],
        compactness=scores["compactness"],
        rule_matched=hand["ruleMatched"],
        explanation=hand["explanation"],
    )


def shape_result(metrics: dict, *, session_id: str, user_id: str, thumbnail_path: str | None) -> dict:
    scores = metrics["scores"]
    height_delta = metrics["heightDelta"]

    timing_variation = 0.0
    if metrics["intervals"]:
        avg_interval = sum(metrics["intervals"]) / len(metrics["intervals"])
        timing_variation = max(metrics["intervals"]) - min(metrics["intervals"])
        timing_variation = timing_variation / avg_interval if avg_interval else 0.0

    # --- Flags ---
    flags = []
    if height_delta > 0.04:
        flags.append(
            {
                "id": "height-asymmetry",
                "severity": "warning",
                "title": "Stroke height differs between hands",
                "explanation": "The wrist trajectories show one hand using a larger vertical range.",
                "startTime": 0,
            }
        )

    if timing_variation > 0.12:
        flags.append(
            {
                "id": "timing-variation",
                "severity": "info",
                "title": "Timing spacing varies",
                "explanation": "Detected stroke intervals are not evenly spaced across the clip.",
                "startTime": 0,
            }
        )

    if not flags:
        flags.append(
            {
                "id": "stable-motion",
                "severity": "info",
                "title": "No major motion inconsistency detected",
                "explanation": "The submitted clip stayed within the expected heuristic ranges.",
                "startTime": 0,
            }
        )

    # --- Per-hand approach feedback ---
    right_classification = _hand_classification_from_metrics(metrics, "right")
    left_classification = _hand_classification_from_metrics(metrics, "left")
    feedback_items = generate_feedback(right_classification, left_classification)

    # Add height feedback if flagged
    if height_delta > 0.04:
        feedback_items.append(
            {
                "id": "match-height",
                "type": "height",
                "severity": "warning",
                "title": "Match rebound height",
                "explanation": "Uneven stroke height can make timing and dynamics less consistent.",
                "suggestion": "Slow the pattern and watch that both stick tips return to the same height.",
            }
        )

    if timing_variation > 0.12:
        feedback_items.append(
            {
                "id": "tempo-control",
                "type": "timing",
                "severity": "info",
                "title": "Stabilize timing before increasing tempo",
                "explanation": "The motion pattern is easier to repeat at a slower tempo.",
                "suggestion": "Practice the same rudiment 8-12 BPM slower and listen for even spacing.",
            }
        )

    # --- Right and left hand result blocks ---
    right_hand = metrics["rightHand"]
    left_hand = metrics["leftHand"]

    return {
        "sessionId": session_id,
        "userId": user_id,
        "summaryScores": scores,
        "rightHand": {
            "label": right_hand["label"],
            "explanation": right_hand["explanation"],
            "fingerPct": right_hand["scores"]["finger_pct"],
            "wristPct": right_hand["scores"]["wrist_pct"],
            "armPct": right_hand["scores"]["arm_pct"],
            "compactness": right_hand["scores"]["compactness"],
        },
        "leftHand": {
            "label": left_hand["label"],
            "explanation": left_hand["explanation"],
            "fingerPct": left_hand["scores"]["finger_pct"],
            "wristPct": left_hand["scores"]["wrist_pct"],
            "armPct": left_hand["scores"]["arm_pct"],
            "compactness": left_hand["scores"]["compactness"],
        },
        "overallSummary": metrics["overallSummary"],
        "metrics": [
            {
                "id": "timing_variation",
                "label": "Timing variation",
                "value": round(timing_variation * 100, 1),
                "unit": "%",
                "description": "Relative spread of detected stroke intervals.",
            },
            {
                "id": "height_delta",
                "label": "Height delta",
                "value": round(height_delta * 100, 1),
                "unit": "%",
                "description": "Difference between left and right vertical wrist ranges.",
            },
            {
                "id": "right_arm_pct",
                "label": "Right arm contribution",
                "value": right_hand["scores"]["arm_pct"],
                "unit": "%",
                "description": "Estimated arm movement contribution for the right hand.",
            },
            {
                "id": "right_wrist_pct",
                "label": "Right wrist contribution",
                "value": right_hand["scores"]["wrist_pct"],
                "unit": "%",
                "description": "Estimated wrist movement contribution for the right hand.",
            },
            {
                "id": "right_finger_pct",
                "label": "Right finger contribution",
                "value": right_hand["scores"]["finger_pct"],
                "unit": "%",
                "description": "Estimated finger movement contribution for the right hand.",
            },
            {
                "id": "left_arm_pct",
                "label": "Left arm contribution",
                "value": left_hand["scores"]["arm_pct"],
                "unit": "%",
                "description": "Estimated arm movement contribution for the left hand.",
            },
            {
                "id": "left_wrist_pct",
                "label": "Left wrist contribution",
                "value": left_hand["scores"]["wrist_pct"],
                "unit": "%",
                "description": "Estimated wrist movement contribution for the left hand.",
            },
            {
                "id": "left_finger_pct",
                "label": "Left finger contribution",
                "value": left_hand["scores"]["finger_pct"],
                "unit": "%",
                "description": "Estimated finger movement contribution for the left hand.",
            },
        ],
        "flags": flags,
        "timelineEvents": [
            {
                "id": flag["id"],
                "time": flag["startTime"],
                "label": flag["title"],
                "severity": flag["severity"],
            }
            for flag in flags
        ],
        "feedbackItems": feedback_items,
        "chartSeries": {
            "leftHandMotion": [round(v * 100, 1) for v in metrics["leftMotion"]],
            "rightHandMotion": [round(v * 100, 1) for v in metrics["rightMotion"]],
            "timingDrift": [round(v * 1000, 1) for v in metrics["intervals"][:24]],
            "consistency": [
                round(scores["strokeConsistency"], 1),
                round(scores["timing"], 1),
                round(scores["symmetry"], 1),
                round(scores["postureStability"], 1),
            ],
        },
        "artifactPaths": {"thumbnailPath": thumbnail_path},
    }
