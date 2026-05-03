from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from firebase_admin import firestore

from .firebase_client import (
    download_video,
    update_job,
    update_session,
    upload_artifact,
    write_result,
)
from .landmarks import extract_pose_trajectories
from .metrics import compute_metrics
from .models import AnalyzeRequest, HealthResponse
from .overlay import write_pose_overlay_video
from .results import shape_result
from .video_io import sample_frames, write_thumbnail

app = FastAPI(title="Kiroheroes Analysis API")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service="analysis-api")


@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> dict[str, str]:
    try:
        update_job(
            request.jobId,
            {"status": "processing", "startedAt": firestore.SERVER_TIMESTAMP},
        )
        update_session(request.sessionId, {"status": "processing"})

        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            video_path = download_video(
                request.inputVideoPath, work_dir / "input-video"
            )
            frames, sample_fps = sample_frames(video_path)
            trajectories = extract_pose_trajectories(frames)
            metrics = compute_metrics(trajectories, sample_fps)

            thumbnail_local = write_thumbnail(frames[0], work_dir / "thumbnail.jpg")
            thumbnail_path = f"users/{request.userId}/sessions/{request.sessionId}/artifacts/thumbnail.jpg"
            upload_artifact(thumbnail_local, thumbnail_path)

            overlay_local = write_pose_overlay_video(
                video_path, work_dir / "overlay.mp4"
            )
            overlay_path = f"users/{request.userId}/sessions/{request.sessionId}/artifacts/overlay.mp4"
            upload_artifact(overlay_local, overlay_path)

            result = shape_result(
                metrics,
                session_id=request.sessionId,
                user_id=request.userId,
                thumbnail_path=thumbnail_path,
                overlay_video_path=overlay_path,
            )
            write_result(result)

        update_job(
            request.jobId,
            {
                "status": "completed",
                "completedAt": firestore.SERVER_TIMESTAMP,
                "thumbnailPath": thumbnail_path,
                "overlayVideoPath": overlay_path,
                "errorMessage": None,
            },
        )
        update_session(request.sessionId, {"status": "completed", "errorMessage": None})
        return {"status": "accepted", "jobId": request.jobId}
    except Exception as exc:
        safe_message = (
            "The video could not be processed. Check framing and try a shorter clip."
        )
        update_job(
            request.jobId,
            {
                "status": "failed",
                "completedAt": firestore.SERVER_TIMESTAMP,
                "errorMessage": safe_message,
            },
        )
        update_session(
            request.sessionId,
            {"status": "failed", "errorMessage": safe_message},
        )
        raise HTTPException(status_code=500, detail=safe_message) from exc
