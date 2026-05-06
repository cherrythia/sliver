from __future__ import annotations
from typing import Any, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NodeConfig(BaseModel):
    id: str
    type: Literal["input", "tool", "prompt"]
    order: int
    config: dict[str, Any]


class WorkflowCreate(BaseModel):
    name: str
    nodes: list[NodeConfig] = []


class WorkflowUpdate(BaseModel):
    name: str
    nodes: list[NodeConfig]


class WorkflowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    nodes: list[NodeConfig]
    created_at: datetime
    updated_at: datetime


class WorkflowSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    updated_at: datetime


class ExecuteRequest(BaseModel):
    input_overrides: dict[str, str] = {}


class StepResult(BaseModel):
    node_id: str
    type: str
    variable: str
    output: str
    duration_ms: int
    error: str | None = None
    tool_name: str | None = None


class ExecuteResponse(BaseModel):
    workflow_id: str
    status: Literal["completed", "failed"]
    steps: list[StepResult]
