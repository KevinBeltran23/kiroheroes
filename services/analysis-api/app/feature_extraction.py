"""
feature_extraction.py

Computes per-hand raw motion signals from MediaPipe Holistic landmark trajectories.

Right hand and left hand use separate feature paths because traditional grip
produces different visible motion patterns:
  - Right hand: vertical wrist break + forearm/elbow contribution
  - Left hand:  rotational wrist motion + forearm/elbow contribution

All inputs are trajectory dicts of the form:
    { landmark_key: [(x, y), ...] }
where NaN values indicate frames where the landmark was not detected.

Raw signals returned are cumulative motion totals over the clip, suitable
for normalization into contribution percentages.
"""
from __future__ import annotations

import math
from statistics import mean


Point = tuple[float, float]
Trajectory = list[Point]


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _dist(a: Point, b: Point) -> float:
    """Euclidean distance between two (x, y) points."""
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _angle_deg(a: Point, vertex: Point, b: Point) -> float | None:
    """
    Angle in degrees at `vertex` formed by the vectors vertex->a and vertex->b.
    Returns None if any point contains NaN.
    """
    if any(math.isnan(v) for pt in (a, vertex, b) for v in pt):
        return None
    ax, ay = a[0] - vertex[0], a[1] - vertex[1]
    bx, by = b[0] - vertex[0], b[1] - vertex[1]
    dot = ax * bx + ay * by
    mag_a = math.sqrt(ax ** 2 + ay ** 2)
    mag_b = math.sqrt(bx ** 2 + by ** 2)
    if mag_a < 1e-9 or mag_b < 1e-9:
        return None
    cos_val = max(-1.0, min(1.0, dot / (mag_a * mag_b)))
    return math.degrees(math.acos(cos_val))


def _valid_pairs(traj: Trajectory) -> list[tuple[Point, Point]]:
    """Return consecutive (prev, curr) pairs where neither point contains NaN."""
    pairs = []
    for i in range(1, len(traj)):
        prev, curr = traj[i - 1], traj[i]
        if not any(math.isnan(v) for pt in (prev, curr) for v in pt):
            pairs.append((prev, curr))
    return pairs


def _cumulative_displacement(traj: Trajectory) -> float:
    """Sum of frame-to-frame distances along a trajectory."""
    return sum(_dist(prev, curr) for prev, curr in _valid_pairs(traj))


def _cumulative_angle_change(
    traj_a: Trajectory,
    traj_vertex: Trajectory,
    traj_b: Trajectory,
) -> float:
    """
    Sum of absolute frame-to-frame changes in the angle at `vertex`
    formed by points a-vertex-b.
    """
    angles: list[float] = []
    for i in range(len(traj_vertex)):
        angle = _angle_deg(traj_a[i], traj_vertex[i], traj_b[i])
        if angle is not None:
            angles.append(angle)

    total = 0.0
    for i in range(1, len(angles)):
        total += abs(angles[i] - angles[i - 1])
    return total


def _finger_motion_relative_to_palm(
    fingertip_trajs: list[Trajectory],
    palm_traj: Trajectory,
) -> float:
    """
    Cumulative movement of fingertips relative to the palm centroid.
    Subtracts palm motion to isolate finger-specific movement.
    """
    total = 0.0
    for tip_traj in fingertip_trajs:
        for i in range(1, len(tip_traj)):
            tip_prev, tip_curr = tip_traj[i - 1], tip_traj[i]
            palm_prev, palm_curr = palm_traj[i - 1], palm_traj[i]
            if any(math.isnan(v) for pt in (tip_prev, tip_curr, palm_prev, palm_curr) for v in pt):
                continue
            # Relative position of tip to palm
            rel_prev = (tip_prev[0] - palm_prev[0], tip_prev[1] - palm_prev[1])
            rel_curr = (tip_curr[0] - palm_curr[0], tip_curr[1] - palm_curr[1])
            total += _dist(rel_prev, rel_curr)
    return total


# ---------------------------------------------------------------------------
# Right hand feature extraction
# Emphasises: vertical wrist break, forearm displacement, elbow angle change
# ---------------------------------------------------------------------------

def extract_right_hand_features(trajectories: dict[str, Trajectory]) -> dict:
    """
    Extract raw motion signals for the right hand.

    Returns a dict with keys:
        finger_raw  — cumulative fingertip motion relative to palm
        wrist_raw   — cumulative vertical wrist displacement (y-axis emphasis)
        arm_raw     — cumulative elbow angle change + upper-arm displacement
        compactness — inverse of total wrist range (higher = more compact)
    """
    # Fingertip trajectories relative to palm (wrist as palm proxy)
    palm = trajectories.get("right_wrist", [])
    fingertips = [
        trajectories.get("right_hand_index_tip", []),
        trajectories.get("right_hand_middle_tip", []),
        trajectories.get("right_hand_ring_tip", []),
        trajectories.get("right_hand_pinky_tip", []),
        trajectories.get("right_hand_thumb_tip", []),
    ]
    finger_raw = _finger_motion_relative_to_palm(fingertips, palm)

    # Wrist raw: vertical (y) displacement of wrist — right hand uses vertical break
    wrist_traj = trajectories.get("right_wrist", [])
    wrist_y = [pt[1] for pt in wrist_traj if not math.isnan(pt[1])]
    wrist_raw = sum(abs(wrist_y[i] - wrist_y[i - 1]) for i in range(1, len(wrist_y)))

    # Arm raw: elbow angle change (shoulder-elbow-wrist) + upper-arm displacement
    shoulder = trajectories.get("right_shoulder", [])
    elbow = trajectories.get("right_elbow", [])
    wrist = trajectories.get("right_wrist", [])

    elbow_angle_change = _cumulative_angle_change(shoulder, elbow, wrist)
    upper_arm_displacement = _cumulative_displacement(
        trajectories.get("right_elbow", [])
    )
    arm_raw = elbow_angle_change + upper_arm_displacement * 50.0  # scale to similar magnitude

    # Compactness: how small is the total wrist range of motion
    wrist_range = (max(wrist_y) - min(wrist_y)) if len(wrist_y) >= 2 else 0.0
    compactness = max(0.0, 1.0 - wrist_range * 20.0)  # normalised 0-1

    return {
        "finger_raw": finger_raw,
        "wrist_raw": wrist_raw,
        "arm_raw": arm_raw,
        "compactness": compactness,
    }


# ---------------------------------------------------------------------------
# Left hand feature extraction
# Emphasises: rotational wrist motion, forearm accompaniment, elbow initiation
# ---------------------------------------------------------------------------

def extract_left_hand_features(trajectories: dict[str, Trajectory]) -> dict:
    """
    Extract raw motion signals for the left hand (traditional grip).

    Left hand wrist motion is primarily rotational, so we use the
    x-axis displacement of the wrist as a proxy for rotation, in addition
    to the overall wrist displacement.

    Returns a dict with keys:
        finger_raw  — cumulative fingertip motion relative to palm
        wrist_raw   — cumulative wrist displacement (x + y combined for rotation)
        arm_raw     — cumulative elbow angle change + upper-arm displacement
        compactness — inverse of total wrist range
    """
    palm = trajectories.get("left_wrist", [])
    fingertips = [
        trajectories.get("left_hand_index_tip", []),
        trajectories.get("left_hand_middle_tip", []),
        trajectories.get("left_hand_ring_tip", []),
        trajectories.get("left_hand_pinky_tip", []),
        trajectories.get("left_hand_thumb_tip", []),
    ]
    finger_raw = _finger_motion_relative_to_palm(fingertips, palm)

    # Wrist raw: full 2D displacement for left hand (rotational = x + y movement)
    wrist_traj = trajectories.get("left_wrist", [])
    wrist_raw = _cumulative_displacement(wrist_traj)

    # Arm raw: elbow angle change + upper-arm displacement
    shoulder = trajectories.get("left_shoulder", [])
    elbow = trajectories.get("left_elbow", [])
    wrist = trajectories.get("left_wrist", [])

    elbow_angle_change = _cumulative_angle_change(shoulder, elbow, wrist)
    upper_arm_displacement = _cumulative_displacement(
        trajectories.get("left_elbow", [])
    )
    arm_raw = elbow_angle_change + upper_arm_displacement * 50.0

    # Compactness
    wrist_pts = [pt for pt in wrist_traj if not any(math.isnan(v) for v in pt)]
    if len(wrist_pts) >= 2:
        wrist_range = max(pt[1] for pt in wrist_pts) - min(pt[1] for pt in wrist_pts)
    else:
        wrist_range = 0.0
    compactness = max(0.0, 1.0 - wrist_range * 20.0)

    return {
        "finger_raw": finger_raw,
        "wrist_raw": wrist_raw,
        "arm_raw": arm_raw,
        "compactness": compactness,
    }
