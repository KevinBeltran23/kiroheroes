from __future__ import annotations


def shape_result(
    metrics: dict, *, session_id: str, user_id: str, thumbnail_path: str | None
) -> dict:
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

    frame_metrics = metrics.get("frameMetrics", {})
    finger_usage = frame_metrics.get("finger", [])
    wrist_usage = frame_metrics.get("wrist", [])
    arm_usage = frame_metrics.get("arm", [])
    muscle_usage = metrics.get("muscleUsage", {"finger": 0, "wrist": 0, "arm": 0})
    if finger_usage and wrist_usage and arm_usage:
        muscle_usage = {
            "finger": round(sum(finger_usage) / len(finger_usage), 1),
            "wrist": round(sum(wrist_usage) / len(wrist_usage), 1),
            "arm": round(sum(arm_usage) / len(arm_usage), 1),
        }
    approach = metrics.get("approach", {})

    return {
        "sessionId": session_id,
        "userId": user_id,
        "summaryScores": scores,
        "metrics": [
            {
                "id": "finger_usage",
                "label": "Finger",
                "value": muscle_usage.get("finger", 0),
                "unit": "%",
                "description": "Estimated contribution from hand spread changes.",
            },
            {
                "id": "wrist_usage",
                "label": "Wrist",
                "value": muscle_usage.get("wrist", 0),
                "unit": "%",
                "description": "Estimated contribution from wrist break angle changes.",
            },
            {
                "id": "arm_usage",
                "label": "Arm",
                "value": muscle_usage.get("arm", 0),
                "unit": "%",
                "description": "Estimated contribution from shoulder and elbow angle changes.",
            },
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
            "leftHandMotion": [
                round(value * 100, 1) for value in metrics["leftMotion"]
            ],
            "rightHandMotion": [
                round(value * 100, 1) for value in metrics["rightMotion"]
            ],
            "timingDrift": [
                round(value * 1000, 1) for value in metrics["intervals"][:24]
            ],
            "consistency": [
                round(scores["strokeConsistency"], 1),
                round(scores["timing"], 1),
                round(scores["symmetry"], 1),
                round(scores["postureStability"], 1),
            ],
            "fingerUsage": finger_usage,
            "wristUsage": wrist_usage,
            "armUsage": arm_usage,
            "leftWristBreak": frame_metrics.get("leftWristBreak", []),
            "rightWristBreak": frame_metrics.get("rightWristBreak", []),
        },
        "muscleUsage": muscle_usage,
        "approach": approach,
        "angles": metrics.get("angles", {}),
        "artifactPaths": {"thumbnailPath": thumbnail_path},
    }
