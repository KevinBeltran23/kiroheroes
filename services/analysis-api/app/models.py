from typing import Literal

from pydantic import BaseModel, Field


ExerciseType = Literal["single_strokes", "double_strokes", "paradiddles"]


class AnalyzeRequest(BaseModel):
    jobId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    userId: str = Field(min_length=1)
    inputVideoPath: str = Field(min_length=1)
    exerciseType: ExerciseType


class HealthResponse(BaseModel):
    ok: bool
    service: str
