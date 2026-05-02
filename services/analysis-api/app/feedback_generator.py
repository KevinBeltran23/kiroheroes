"""
feedback_generator.py

Generates structured feedback items from per-hand classification results.

Feedback items follow the existing FeedbackItem schema used by the mobile app:
    id, type, severity, title, explanation, suggestion
"""
from __future__ import annotations

from .trend_classifier import HandClassification


# ---------------------------------------------------------------------------
# Per-label feedback templates
# ---------------------------------------------------------------------------

_FEEDBACK_TEMPLATES: dict[str, dict] = {
    "arm-heavy": {
        "type": "posture",
        "severity": "warning",
        "title": "Arm-Heavy Approach Detected",
        "suggestion": (
            "Try isolating wrist motion by practicing slow single strokes "
            "with your upper arm resting against your side. "
            "Focus on letting the wrist and fingers do the work."
        ),
    },
    "fulcrum-lift": {
        "type": "posture",
        "severity": "info",
        "title": "Fulcrum-Lift Approach Detected",
        "suggestion": (
            "This is a compact, controlled approach. "
            "Make sure the fulcrum is relaxed and not gripping too tightly. "
            "Check that the back fingers are providing support without tension."
        ),
    },
    "lead-by-the-bead": {
        "type": "posture",
        "severity": "info",
        "title": "Lead-by-the-Bead Approach Detected",
        "suggestion": (
            "The wrist is leading with some forearm accompaniment. "
            "This is a common and effective approach. "
            "At higher tempos, try to reduce the forearm contribution "
            "and let the wrist do more of the work independently."
        ),
    },
    "wrist-break": {
        "type": "posture",
        "severity": "info",
        "title": "Wrist-Break Approach Detected",
        "suggestion": (
            "The wrist is doing most of the work with minimal arm contribution. "
            "This is efficient for lower stroke heights. "
            "Make sure the wrist motion is relaxed and not forced."
        ),
    },
}


def generate_feedback(
    right: HandClassification,
    left: HandClassification,
) -> list[dict]:
    """
    Generate a list of feedback items from per-hand classification results.

    Returns a list of dicts matching the FeedbackItem schema.
    """
    items = []

    for hand_label, classification in [("right", right), ("left", left)]:
        template = _FEEDBACK_TEMPLATES.get(classification.label)
        if not template:
            continue

        items.append(
            {
                "id": f"{hand_label}-hand-{classification.label}",
                "type": template["type"],
                "severity": template["severity"],
                "title": f"{hand_label.capitalize()} Hand: {template['title']}",
                "explanation": classification.explanation,
                "suggestion": template["suggestion"],
            }
        )

    # Add asymmetry feedback if hands differ significantly
    if right.label != left.label:
        items.append(
            {
                "id": "hand-asymmetry",
                "type": "symmetry",
                "severity": "info",
                "title": "Different Approach Patterns Between Hands",
                "explanation": (
                    f"Right hand shows '{right.label}' while left hand shows '{left.label}'. "
                    "Some asymmetry is expected in traditional grip, but large differences "
                    "may indicate an imbalance worth addressing."
                ),
                "suggestion": (
                    "Record separate reps focusing on each hand individually "
                    "to better understand the difference."
                ),
            }
        )

    return items
