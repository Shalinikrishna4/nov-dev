"""Pydantic models for request/response validation."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Mode(str, Enum):
    debug = "debug"
    explain = "explain"
    optimize = "optimize"
    refactor = "refactor"
    test = "test"


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AnalyzeRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Source code to analyze")
    error_text: str = Field("", description="Error / unexpected behavior or follow-up context")
    language: str = Field("javascript", description="Source language")
    mode: Mode = Field(Mode.debug, description="Analysis mode")
    session_id: Optional[str] = Field(None, description="Existing session id (or null for new)")


class AnalyzeResponse(BaseModel):
    session_id: str
    response: str
    tokens: int
    elapsed_ms: int
    model: str
    mode: Mode


class FollowUpRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1)


class FollowUpResponse(BaseModel):
    response: str
    tokens: int
    elapsed_ms: int


class HealthRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field("javascript")


class HealthAxis(BaseModel):
    label: str
    value: int


class HealthRaw(BaseModel):
    lines: int
    code_lines: int
    comment_lines: int
    complexity: int
    max_depth: int
    fn_count: int
    magic_numbers: int


class HealthResponse(BaseModel):
    overall: int
    grade: str
    axes: list[HealthAxis]
    raw: HealthRaw


class ComplexityResponse(BaseModel):
    time: str
    space: str
    explanation: str
    confidence: str = "medium"


class Session(BaseModel):
    id: str
    timestamp: int
    mode: Mode
    code: str
    error_text: str
    language: str
    response: str
    chat_history: list[Message]
    tokens: int = 0
