import anthropic
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.workflow import Workflow
from app.schemas.workflow import ExecuteRequest, ExecuteResponse
from app.core.engine import run_workflow

router = APIRouter(prefix="/workflows", tags=["execution"])


@router.post("/{workflow_id}/execute", response_model=ExecuteResponse)
def execute_workflow(
    workflow_id: UUID,
    body: ExecuteRequest,
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return run_workflow(
        workflow_id=str(wf.id),
        nodes=wf.nodes,
        input_overrides=body.input_overrides,
        db=db,
        anthropic_client=anthropic.Anthropic(),
    )
