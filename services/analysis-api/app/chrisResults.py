from __future__ import annotations


def shape_result(
    metrics: dict, *, session_id: str, user_id: str, thumbnail_path: str | None
) -> dict:
    scores = metrics["scores"]
    arm = metrics.get("arm", {})
    height_delta = metrics["heightDelta"]
    arm_motion_asymmetry = arm.get("armMotionAsymmetry", 0.0)
    tracking_confidence = arm.get("trackingConfidence", 0.0)
    left_elbow_angle_range = arm.get("leftElbowAngleRange", 0.0)
    right_elbow_angle_range = arm.get("rightElbowAngleRange", 0.0)
    max_elbow_angle_range = max(left_elbow_angle_range, right_elbow_angle_range)
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

    if tracking_confidence < 55:
        flags.append(
            {
                "id": "low-arm-tracking-confidence",
                "severity": "warning",
                "title": "Arm tracking confidence is low",
                "explanation": "MediaPipe lost one or more shoulder, elbow, or wrist landmarks during parts of the clip.",
                "startTime": 0,
            }
        )
        feedback.append(
            {
                "id": "improve-arm-framing",
                "type": "arm",
                "severity": "warning",
                "title": "Improve camera framing",
                "explanation": "Reliable arm tracking needs both shoulders, elbows, and wrists visible for most frames.",
                "suggestion": "Record from a stable front angle with the full upper body and both hands in frame.",
            }
        )

    if arm_motion_asymmetry > 0.28:
        dominant_side = (
            "left"
            if arm.get("leftArmMotionAverage", 0.0)
            > arm.get("rightArmMotionAverage", 0.0)
            else "right"
        )
        flags.append(
            {
                "id": "arm-motion-asymmetry",
                "severity": "warning",
                "title": "Arm motion differs between sides",
                "explanation": f"The {dominant_side} arm shows more elbow and shoulder movement than the other side.",
                "startTime": 0,
            }
        )
        feedback.append(
            {
                "id": "balance-arm-drive",
                "type": "arm",
                "severity": "warning",
                "title": "Balance elbow and shoulder contribution",
                "explanation": "Uneven arm contribution can make stick heights and sound quality drift between hands.",
                "suggestion": "Use a mirror or front-facing video and check that both elbows travel through a similar range.",
            }
        )

    if max_elbow_angle_range > 42:
        flags.append(
            {
                "id": "large-elbow-angle-range",
                "severity": "info",
                "title": "Large elbow angle changes detected",
                "explanation": "The tracked arm path suggests the stroke may be using more arm motion than needed.",
                "startTime": 0,
            }
        )
        feedback.append(
            {
                "id": "reduce-arm-heavy-motion",
                "type": "arm",
                "severity": "info",
                "title": "Check for arm-heavy strokes",
                "explanation": "Big elbow angle changes can be useful at some dynamics, but they may hide wrist control issues.",
                "suggestion": "Try the same passage softer and watch whether the wrist can drive the motion with quieter elbows.",
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
            {
                "id": "arm_motion_asymmetry",
                "label": "Arm motion asymmetry",
                "value": round(arm_motion_asymmetry * 100, 1),
                "unit": "%",
                "description": "Relative difference in tracked arm movement between sides.",
            },
            {
                "id": "left_elbow_angle_range",
                "label": "Left elbow angle range",
                "value": round(left_elbow_angle_range, 1),
                "unit": "deg",
                "description": "Range of the left elbow angle through the sampled clip.",
            },
            {
                "id": "right_elbow_angle_range",
                "label": "Right elbow angle range",
                "value": round(right_elbow_angle_range, 1),
                "unit": "deg",
                "description": "Range of the right elbow angle through the sampled clip.",
            },
            {
                "id": "arm_tracking_confidence",
                "label": "Arm tracking confidence",
                "value": round(tracking_confidence, 1),
                "unit": "%",
                "description": "How consistently MediaPipe saw both shoulders, elbows, and wrists.",
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
            "leftArmMotion": [round(value, 1) for value in metrics["leftArmMotion"]],
            "rightArmMotion": [round(value, 1) for value in metrics["rightArmMotion"]],
            "leftElbowAngle": [round(value, 1) for value in metrics["leftElbowAngle"]],
            "rightElbowAngle": [
                round(value, 1) for value in metrics["rightElbowAngle"]
            ],
            "timingDrift": [
                round(value * 1000, 1) for value in metrics["intervals"][:24]
            ],
            "consistency": [
                round(scores["strokeConsistency"], 1),
                round(scores["timing"], 1),
                round(scores["symmetry"], 1),
                round(scores["postureStability"], 1),
                round(scores["armControl"], 1),
            ],
        },
        "artifactPaths": {"thumbnailPath": thumbnail_path},
    }
