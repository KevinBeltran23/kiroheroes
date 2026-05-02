from __future__ import annotations


def shape_result(metrics: dict, *, session_id: str, user_id: str, thumbnail_path: str | None) -> dict:
    scores = metrics["scores"]
    height_delta = metrics["heightDelta"]
    timing_variation = 0.0
    if metrics["intervals"]:
        avg_interval = sum(metrics["intervals"]) / len(metrics["intervals"])
        timing_variation = max(metrics["intervals"]) - min(metrics["intervals"])
        timing_variation = timing_variation / avg_interval if avg_interval else 0.0

    flags = []
    feedback = []
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
        feedback.append(
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
        flags.append(
            {
                "id": "timing-variation",
                "severity": "info",
                "title": "Timing spacing varies",
                "explanation": "Detected stroke intervals are not evenly spaced across the clip.",
                "startTime": 0,
            }
        )
        feedback.append(
            {
                "id": "tempo-control",
                "type": "timing",
                "severity": "info",
                "title": "Stabilize timing before increasing tempo",
                "explanation": "The motion pattern is easier to repeat at a slower tempo.",
                "suggestion": "Practice the same rudiment 8-12 BPM slower and listen for even spacing.",
            }
        )

    if not flags:
        flags.append(
            {
                "id": "stable-motion",
                "severity": "info",
                "title": "No major motion inconsistency detected",
                "explanation": "The submitted clip stayed within the MVP heuristic ranges.",
                "startTime": 0,
            }
        )

    return {
        "sessionId": session_id,
        "userId": user_id,
        "summaryScores": scores,
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
        "feedbackItems": feedback,
        "chartSeries": {
            "leftHandMotion": [round(value * 100, 1) for value in metrics["leftMotion"]],
            "rightHandMotion": [round(value * 100, 1) for value in metrics["rightMotion"]],
            "timingDrift": [round(value * 1000, 1) for value in metrics["intervals"][:24]],
            "consistency": [
                round(scores["strokeConsistency"], 1),
                round(scores["timing"], 1),
                round(scores["symmetry"], 1),
                round(scores["postureStability"], 1),
            ],
        },
        "artifactPaths": {"thumbnailPath": thumbnail_path},
    }
