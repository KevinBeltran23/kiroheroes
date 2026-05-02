from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore, storage


def initialize_firebase() -> None:
    if firebase_admin._apps:
        return

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")

    if credentials_path:
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})
    else:
        firebase_admin.initialize_app(options={"storageBucket": bucket_name})


def firestore_client():
    initialize_firebase()
    return firestore.client()


def bucket():
    initialize_firebase()
    return storage.bucket()


def update_job(job_id: str, data: dict[str, Any]) -> None:
    firestore_client().collection("analysisJobs").document(job_id).update(data)


def update_session(session_id: str, data: dict[str, Any]) -> None:
    firestore_client().collection("sessions").document(session_id).update(data)


def write_result(data: dict[str, Any]) -> None:
    firestore_client().collection("analysisResults").add(
        {**data, "createdAt": firestore.SERVER_TIMESTAMP}
    )


def download_video(storage_path: str, destination: Path) -> Path:
    blob = bucket().blob(storage_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    blob.download_to_filename(destination)
    return destination


def upload_artifact(local_path: Path, storage_path: str) -> str:
    blob = bucket().blob(storage_path)
    blob.upload_from_filename(local_path)
    return storage_path
