import uuid
from sqlalchemy import Column, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    nodes = Column(JSONB, nullable=False, server_default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
