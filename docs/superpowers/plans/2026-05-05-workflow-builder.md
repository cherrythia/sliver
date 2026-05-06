# Micro-Agent Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack workflow builder web app where users chain Input, Tool, and Prompt nodes into sequential pipelines, backed by FastAPI + PostgreSQL executing them with the Anthropic Claude API.

**Architecture:** Monorepo with `frontend/` (Vite + React + TypeScript + Zustand + dnd-kit), `backend/` (FastAPI + SQLAlchemy 2.0 + Pydantic v2), and a root `docker-compose.yml`. Workflow node configs are stored as JSONB. The execution engine iterates nodes in order, accumulating a `{variable: value}` context dict. The seeded "Toronto Subway Analyst" workflow exercises all three node types against the real Kaggle TTC delay dataset.

**Tech Stack:** React 18, TypeScript, Zustand, dnd-kit, React Router v6, Vite, Vitest, FastAPI, SQLAlchemy 2.0 (sync), Alembic, Pydantic v2, Anthropic Python SDK, PostgreSQL 15, Docker Compose, pandas, pytest, httpx

---

## File Map

### Backend
| File | Responsibility |
|---|---|
| `backend/app/db/database.py` | SQLAlchemy engine, `SessionLocal`, `get_db` FastAPI dependency |
| `backend/app/models/workflow.py` | `Workflow` ORM model (UUID pk, JSONB nodes) |
| `backend/app/models/subway.py` | `SubwayDelay`, `DelayCode` ORM models |
| `backend/app/schemas/workflow.py` | All Pydantic request/response schemas |
| `backend/app/db/seed.py` | CSV importer + Toronto workflow seeder |
| `backend/app/core/tools.py` | `TOOL_REGISTRY`, `query_subway_db`, `calculate_average_delay` |
| `backend/app/core/engine.py` | `run_workflow` sequential executor |
| `backend/app/api/routes/workflows.py` | CRUD endpoints |
| `backend/app/api/routes/execution.py` | Execute endpoint |
| `backend/app/main.py` | FastAPI app, CORS, router registration |
| `backend/tests/conftest.py` | Test DB fixtures, `TestClient` |
| `backend/tests/test_engine.py` | Engine unit tests (no DB) |
| `backend/tests/test_tools.py` | Tool unit tests (mocked DB + Claude) |
| `backend/tests/test_workflows.py` | CRUD integration tests (requires Postgres) |
| `backend/requirements.txt` | Python dependencies |
| `backend/Dockerfile` | Backend container |
| `backend/alembic.ini` | Alembic config |
| `backend/alembic/env.py` | Alembic migration env (imports our models) |

### Frontend
| File | Responsibility |
|---|---|
| `frontend/src/types/workflow.ts` | All TypeScript interfaces |
| `frontend/src/api/client.ts` | Typed fetch wrappers |
| `frontend/src/store/workflowStore.ts` | Zustand store (state + actions) |
| `frontend/src/utils/validation.ts` | `getValidationErrors` |
| `frontend/src/components/nodes/InputNode.tsx` | Input node card with drag handle |
| `frontend/src/components/nodes/ToolNode.tsx` | Tool node card (tool dropdown, var picker) |
| `frontend/src/components/nodes/PromptNode.tsx` | Prompt node card (textarea + var hints) |
| `frontend/src/components/WorkflowEditor.tsx` | DnD canvas + node palette + save/execute |
| `frontend/src/components/WorkflowList.tsx` | Workflow list page |
| `frontend/src/components/ExecutionViewer.tsx` | Step-by-step result panel |
| `frontend/src/App.tsx` | React Router setup |
| `frontend/src/main.tsx` | Entry point |
| `frontend/src/test/setup.ts` | Vitest global setup |
| `frontend/src/store/workflowStore.test.ts` | Store unit tests |
| `frontend/src/utils/validation.test.ts` | Validation unit tests |
| `frontend/package.json` | Dependencies |
| `frontend/vite.config.ts` | Vite + Vitest config |
| `frontend/Dockerfile` | Frontend container |

### Root
| File | Responsibility |
|---|---|
| `docker-compose.yml` | All three services + healthcheck |
| `.env.example` | Required env vars template |
| `.gitignore` | Excludes `.superpowers/`, `node_modules/`, `__pycache__/`, `.env` |
| `data/` | CSV files copied from Downloads |
| `README.md` | Setup, architecture, diagrams |

---

## Task 1: Repo Scaffolding + Data Files

**Files:**
- Create: `docker-compose.yml` (stub — filled in Task 2)
- Create: `.env.example`
- Create: `.gitignore`
- Create: `data/` directory with CSV files

- [ ] **Step 1: Create directory structure and copy data files**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
mkdir -p backend/app/{api/routes,core,db,models,schemas} backend/tests backend/alembic
mkdir -p frontend/src/{api,components/nodes,store,types,utils,test}
mkdir -p data docs
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/api/routes/__init__.py
touch backend/app/core/__init__.py backend/app/db/__init__.py
touch backend/app/models/__init__.py backend/app/schemas/__init__.py
touch backend/tests/__init__.py
cp /Users/chiaweizhengterry/Downloads/archive.zip data/
cd data && unzip archive.zip && rm archive.zip && cd ..
```

- [ ] **Step 2: Create `.gitignore`**

```
# Python
__pycache__/
*.pyc
.venv/
*.egg-info/
.pytest_cache/
.coverage

# Node
node_modules/
dist/
.vite/

# Env
.env
.env.local

# Project
.superpowers/
data/*.csv
```

- [ ] **Step 3: Create `.env.example`**

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- [ ] **Step 4: Initialize git and commit**

```bash
git init
git add .gitignore .env.example docs/ data/Toronto-Subway-Delay-Codes.csv
git commit -m "chore: initial repo scaffolding and data files"
```

---

## Task 2: Docker Compose + Dockerfiles

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: silver
      POSTGRES_USER: silver
      POSTGRES_PASSWORD: silver
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U silver -d silver"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://silver:silver@db:5432/silver
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      DATA_DIR: /app/data
    volumes:
      - ./data:/app/data
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  pgdata:
```

- [ ] **Step 2: Write `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["sh", "-c", "alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
```

- [ ] **Step 3: Write `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

- [ ] **Step 4: Validate compose file syntax**

```bash
docker compose config --quiet
```

Expected: no output (success)

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile
git commit -m "chore: add Docker Compose and Dockerfiles"
```

---

## Task 3: Backend — Database Layer

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/db/database.py`
- Create: `backend/app/models/workflow.py`
- Create: `backend/app/models/subway.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/` (generated)

- [ ] **Step 1: Write `backend/requirements.txt`**

```
fastapi>=0.111
uvicorn[standard]>=0.30
sqlalchemy>=2.0
psycopg2-binary>=2.9
alembic>=1.13
pydantic>=2.7
anthropic>=0.28
pandas>=2.2
python-dotenv>=1.0
httpx>=0.27
pytest>=8.2
pytest-cov>=5.0
```

- [ ] **Step 2: Write `backend/app/db/database.py`**

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://silver:silver@localhost:5432/silver"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 3: Write `backend/app/models/workflow.py`**

```python
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
```

- [ ] **Step 4: Write `backend/app/models/subway.py`**

```python
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, Index
from app.db.database import Base


class DelayCode(Base):
    __tablename__ = "delay_codes"
    code = Column(Text, primary_key=True)
    description = Column(Text)
    vehicle_type = Column(Text)


class SubwayDelay(Base):
    __tablename__ = "subway_delays"
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date)
    time = Column(Text)
    day = Column(Text)
    station = Column(Text)
    code = Column(Text, ForeignKey("delay_codes.code", ondelete="SET NULL"))
    min_delay = Column(Integer)
    min_gap = Column(Integer)
    bound = Column(Text)
    line = Column(Text)
    vehicle = Column(Integer)


Index("ix_subway_delays_station", SubwayDelay.station)
Index("ix_subway_delays_date", SubwayDelay.date)
Index("ix_subway_delays_line", SubwayDelay.line)
```

- [ ] **Step 5: Initialize Alembic and configure it**

```bash
cd backend
pip install -r requirements.txt
alembic init alembic
```

Edit `backend/alembic/env.py` — replace the `target_metadata = None` line and add the import block:

```python
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.database import Base
import app.models.workflow  # registers Workflow
import app.models.subway    # registers SubwayDelay, DelayCode

# Replace the DATABASE_URL in run_migrations_online:
config.set_main_option(
    "sqlalchemy.url",
    os.getenv("DATABASE_URL", "postgresql://silver:silver@localhost:5432/silver")
)

target_metadata = Base.metadata
```

- [ ] **Step 6: Generate and apply the initial migration**

```bash
# Requires docker compose up db to be running
docker compose up db -d
# Wait for postgres to be ready, then:
cd backend
DATABASE_URL=postgresql://silver:silver@localhost:5432/silver alembic revision --autogenerate -m "initial tables"
DATABASE_URL=postgresql://silver:silver@localhost:5432/silver alembic upgrade head
```

Expected output ends with: `INFO  [alembic.runtime.migration] Running upgrade  -> <hash>, initial tables`

- [ ] **Step 7: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/
git commit -m "feat: backend database models and Alembic migration"
```

---

## Task 4: Backend — Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/workflow.py`

- [ ] **Step 1: Write `backend/app/schemas/workflow.py`**

```python
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
```

- [ ] **Step 2: Verify schemas import without errors**

```bash
cd backend
python -c "from app.schemas.workflow import WorkflowRead, ExecuteResponse; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: Pydantic v2 schemas for workflows and execution"
```

---

## Task 5: Backend — Seed Script

**Files:**
- Create: `backend/app/db/seed.py`

- [ ] **Step 1: Write `backend/app/db/seed.py`**

```python
import os
import uuid
from datetime import datetime
import pandas as pd
from app.db.database import SessionLocal
from app.models.subway import SubwayDelay, DelayCode
from app.models.workflow import Workflow

DATA_DIR = os.getenv("DATA_DIR", "/app/data")

TORONTO_NODES = [
    {
        "id": "node-input-1",
        "type": "input",
        "order": 0,
        "config": {
            "variable_name": "user_query",
            "default_value": "What were the main causes of delays at Union Station last year?",
        },
    },
    {
        "id": "node-tool-1",
        "type": "tool",
        "order": 1,
        "config": {
            "tool_name": "query_subway_db",
            "input_variable": "user_query",
            "output_variable": "db_results",
        },
    },
    {
        "id": "node-prompt-1",
        "type": "prompt",
        "order": 2,
        "config": {
            "prompt_template": (
                "You are a Toronto Transit Commission data analyst.\n"
                "A user asked: {{user_query}}\n\n"
                "Here is the relevant subway delay data:\n{{db_results}}\n\n"
                "Provide a clear, concise summary of the key findings. "
                "Highlight the most common causes, affected stations, and any notable patterns."
            ),
            "output_variable": "analysis",
        },
    },
]


def seed():
    db = SessionLocal()
    try:
        _seed_subway_data(db)
        _seed_toronto_workflow(db)
    finally:
        db.close()


def _seed_subway_data(db):
    if db.query(DelayCode).first() is not None:
        print("Subway data already seeded, skipping.")
        return

    print("Seeding delay codes...")
    codes_df = pd.read_csv(os.path.join(DATA_DIR, "Toronto-Subway-Delay-Codes.csv"))
    db.bulk_save_objects([
        DelayCode(
            code=str(row["RMENU CODE"]).strip(),
            description=str(row["CODE DESCRIPTION"]).strip(),
            vehicle_type=str(row["Vehicle Type"]).strip(),
        )
        for _, row in codes_df.iterrows()
        if pd.notna(row["RMENU CODE"])
    ])
    db.flush()

    print("Seeding subway delays (may take ~30 seconds)...")
    delays_df = pd.read_csv(os.path.join(DATA_DIR, "Toronto-Subway-Delay-Jan-2014-Jun-2021.csv"))
    delays_df["Min Delay"] = pd.to_numeric(delays_df["Min Delay"], errors="coerce").fillna(0).astype(int)
    delays_df["Min Gap"] = pd.to_numeric(delays_df["Min Gap"], errors="coerce").fillna(0).astype(int)
    delays_df["Vehicle"] = pd.to_numeric(delays_df["Vehicle"], errors="coerce").fillna(0).astype(int)

    batch, batch_size = [], 5000
    for _, row in delays_df.iterrows():
        try:
            date = datetime.strptime(str(row["Date"]), "%Y/%m/%d").date()
        except ValueError:
            continue
        batch.append(SubwayDelay(
            date=date,
            time=str(row["Time"]),
            day=str(row["Day"]),
            station=str(row["Station"]).strip().upper(),
            code=str(row["Code"]).strip() if pd.notna(row["Code"]) else None,
            min_delay=int(row["Min Delay"]),
            min_gap=int(row["Min Gap"]),
            bound=str(row["Bound"]).strip() if pd.notna(row["Bound"]) else None,
            line=str(row["Line"]).strip() if pd.notna(row["Line"]) else None,
            vehicle=int(row["Vehicle"]),
        ))
        if len(batch) >= batch_size:
            db.bulk_save_objects(batch)
            db.flush()
            batch = []
    if batch:
        db.bulk_save_objects(batch)
    db.commit()
    print("Subway data seeded.")


def _seed_toronto_workflow(db):
    if db.query(Workflow).filter_by(name="Toronto Subway Analyst").first():
        print("Toronto workflow already exists, skipping.")
        return
    db.add(Workflow(name="Toronto Subway Analyst", nodes=TORONTO_NODES))
    db.commit()
    print("Toronto Subway Analyst workflow seeded.")


if __name__ == "__main__":
    seed()
```

- [ ] **Step 2: Run seed against docker postgres to verify**

```bash
# Ensure docker compose up db is running
cd backend
DATABASE_URL=postgresql://silver:silver@localhost:5432/silver \
DATA_DIR=/Users/chiaweizhengterry/Desktop/silver/data \
python -m app.db.seed
```

Expected:
```
Seeding delay codes...
Seeding subway delays (may take ~30 seconds)...
Subway data seeded.
Toronto Subway Analyst workflow seeded.
```

Running again should print: `Subway data already seeded, skipping.` and `Toronto workflow already exists, skipping.`

- [ ] **Step 3: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/app/db/seed.py
git commit -m "feat: CSV seed script for subway data and Toronto workflow"
```

---

## Task 6: Backend — Tool Registry

**Files:**
- Create: `backend/app/core/tools.py`
- Create: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing tests for tools**

```python
# backend/tests/test_tools.py
import json
from unittest.mock import MagicMock, patch


def test_calculate_average_delay_returns_json_list():
    from app.core.tools import calculate_average_delay

    row = MagicMock()
    row.station = "UNION STATION"
    row.description = "Disorderly Patron"
    row.count = 42
    row.avg_delay = 15.5

    mock_db = MagicMock()
    (mock_db.query.return_value
     .join.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = [row]
    (mock_db.query.return_value
     .join.return_value
     .filter.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = [row]

    result = calculate_average_delay("", db=mock_db)
    data = json.loads(result)
    assert isinstance(data, list)
    assert data[0]["station"] == "UNION STATION"
    assert data[0]["avg_delay_minutes"] == 15.5
    assert data[0]["count"] == 42


def test_calculate_average_delay_filters_by_station():
    from app.core.tools import calculate_average_delay

    mock_db = MagicMock()
    (mock_db.query.return_value
     .join.return_value
     .filter.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = []

    result = calculate_average_delay("UNION", db=mock_db)
    assert json.loads(result) == []
    # filter was called (station provided)
    mock_db.query.return_value.join.return_value.filter.assert_called_once()


def test_extract_query_params_parses_claude_json():
    with patch("app.core.tools.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text='{"station": "UNION STATION", "year": 2020, "line": null, "start_date": null, "end_date": null}')
        ]
        from app.core.tools import _extract_query_params
        result = _extract_query_params("Union Station delays in 2020")
        assert result["station"] == "UNION STATION"
        assert result["year"] == 2020


def test_extract_query_params_returns_empty_on_bad_json():
    with patch("app.core.tools.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.side_effect = Exception("API error")
        from app.core.tools import _extract_query_params
        result = _extract_query_params("anything")
        assert result == {}


def test_tool_registry_contains_required_tools():
    from app.core.tools import TOOL_REGISTRY
    assert "query_subway_db" in TOOL_REGISTRY
    assert "calculate_average_delay" in TOOL_REGISTRY
    assert callable(TOOL_REGISTRY["query_subway_db"])
    assert callable(TOOL_REGISTRY["calculate_average_delay"])
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_tools.py -v 2>&1 | head -20
```

Expected: `ImportError` or `ModuleNotFoundError` (tools.py doesn't exist yet)

- [ ] **Step 3: Write `backend/app/core/tools.py`**

```python
import json
import os
from typing import Callable
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import anthropic

from app.models.subway import SubwayDelay, DelayCode


def _extract_query_params(query: str) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=(
                "Extract subway query parameters. Return ONLY valid JSON with these optional fields: "
                '{"station": "STATION NAME IN CAPS or null", "line": "BD or YU or SHP or SRT or null", '
                '"year": integer_or_null, "start_date": "YYYY-MM-DD or null", "end_date": "YYYY-MM-DD or null"}.'
            ),
            messages=[{"role": "user", "content": query}],
        )
        return json.loads(response.content[0].text)
    except Exception:
        return {}


def query_subway_db(input: str, db: Session = None) -> str:
    params = _extract_query_params(input)

    q = db.query(
        SubwayDelay.date,
        SubwayDelay.station,
        SubwayDelay.line,
        SubwayDelay.code,
        SubwayDelay.min_delay,
        SubwayDelay.bound,
        DelayCode.description,
    ).join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)

    if params.get("station"):
        q = q.filter(SubwayDelay.station.ilike(f"%{params['station']}%"))
    if params.get("line"):
        q = q.filter(SubwayDelay.line == params["line"])
    if params.get("year"):
        q = q.filter(extract("year", SubwayDelay.date) == params["year"])
    if params.get("start_date"):
        q = q.filter(SubwayDelay.date >= params["start_date"])
    if params.get("end_date"):
        q = q.filter(SubwayDelay.date <= params["end_date"])

    results = q.order_by(SubwayDelay.min_delay.desc()).limit(50).all()

    if not results:
        results = (
            db.query(
                SubwayDelay.date, SubwayDelay.station, SubwayDelay.line,
                SubwayDelay.code, SubwayDelay.min_delay, SubwayDelay.bound,
                DelayCode.description,
            )
            .join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)
            .order_by(SubwayDelay.min_delay.desc())
            .limit(20)
            .all()
        )

    return json.dumps([
        {
            "date": str(r.date),
            "station": r.station,
            "line": r.line,
            "code": r.code,
            "cause": r.description or r.code,
            "min_delay": r.min_delay,
            "bound": r.bound,
        }
        for r in results
    ])


def calculate_average_delay(input: str, db: Session = None) -> str:
    q = db.query(
        SubwayDelay.station,
        DelayCode.description,
        func.count(SubwayDelay.id).label("count"),
        func.avg(SubwayDelay.min_delay).label("avg_delay"),
    ).join(DelayCode, SubwayDelay.code == DelayCode.code, isouter=True)

    if input.strip():
        q = q.filter(SubwayDelay.station.ilike(f"%{input.strip()}%"))

    results = (
        q.group_by(SubwayDelay.station, DelayCode.description)
        .order_by(func.avg(SubwayDelay.min_delay).desc())
        .limit(20)
        .all()
    )

    return json.dumps([
        {
            "station": r.station,
            "cause": r.description or "Unknown",
            "count": r.count,
            "avg_delay_minutes": round(float(r.avg_delay or 0), 1),
        }
        for r in results
    ])


TOOL_REGISTRY: dict[str, Callable] = {
    "query_subway_db": query_subway_db,
    "calculate_average_delay": calculate_average_delay,
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend
pytest tests/test_tools.py -v
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/app/core/tools.py backend/tests/test_tools.py
git commit -m "feat: tool registry with query_subway_db and calculate_average_delay"
```

---

## Task 7: Backend — Execution Engine

**Files:**
- Create: `backend/app/core/engine.py`
- Create: `backend/tests/test_engine.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_engine.py
from unittest.mock import MagicMock, patch


def _make_nodes(*specs):
    """Build node dicts from (type, id, config) tuples."""
    return [
        {"id": id_, "type": t, "order": i, "config": cfg}
        for i, (t, id_, cfg) in enumerate(specs)
    ]


def test_input_node_uses_default_value():
    from app.core.engine import run_workflow
    nodes = _make_nodes(("input", "n1", {"variable_name": "q", "default_value": "hello"}))
    result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "completed"
    assert result.steps[0].output == "hello"
    assert result.steps[0].variable == "q"


def test_input_node_override_wins():
    from app.core.engine import run_workflow
    nodes = _make_nodes(("input", "n1", {"variable_name": "q", "default_value": "hello"}))
    result = run_workflow("wf1", nodes, {"q": "overridden"}, db=None)
    assert result.steps[0].output == "overridden"


def test_tool_node_calls_registry_and_passes_context():
    from app.core.engine import run_workflow
    nodes = _make_nodes(
        ("input", "n1", {"variable_name": "q", "default_value": "test input"}),
        ("tool", "n2", {"tool_name": "mock_tool", "input_variable": "q", "output_variable": "out"}),
    )
    with patch("app.core.engine.TOOL_REGISTRY", {"mock_tool": lambda inp, db=None: f"result:{inp}"}):
        result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "completed"
    assert result.steps[1].output == "result:test input"
    assert result.steps[1].variable == "out"
    assert result.steps[1].tool_name == "mock_tool"


def test_prompt_node_interpolates_and_calls_claude():
    from app.core.engine import run_workflow
    nodes = _make_nodes(
        ("input", "n1", {"variable_name": "q", "default_value": "what happened?"}),
        ("prompt", "n2", {"prompt_template": "Answer: {{q}}", "output_variable": "answer"}),
    )
    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="42")]
    result = run_workflow("wf1", nodes, {}, db=None, anthropic_client=mock_client)
    assert result.status == "completed"
    assert result.steps[1].output == "42"
    call_kwargs = mock_client.messages.create.call_args[1]
    assert call_kwargs["messages"][0]["content"] == "Answer: what happened?"


def test_unknown_tool_causes_failure():
    from app.core.engine import run_workflow
    nodes = _make_nodes(
        ("tool", "n1", {"tool_name": "nonexistent", "input_variable": "x", "output_variable": "y"}),
    )
    result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "failed"
    assert result.steps[0].error is not None
    assert "nonexistent" in result.steps[0].error


def test_failed_node_includes_prior_completed_steps():
    from app.core.engine import run_workflow
    nodes = _make_nodes(
        ("input", "n1", {"variable_name": "q", "default_value": "hello"}),
        ("tool", "n2", {"tool_name": "bad_tool", "input_variable": "q", "output_variable": "out"}),
    )
    result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "failed"
    assert len(result.steps) == 2
    assert result.steps[0].error is None
    assert result.steps[1].error is not None


def test_nodes_execute_in_order_field_not_list_order():
    from app.core.engine import run_workflow
    # Supply nodes in reverse order in the list; engine should sort by order field
    nodes = [
        {"id": "n2", "type": "tool", "order": 1, "config": {"tool_name": "echo", "input_variable": "q", "output_variable": "out"}},
        {"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "hi"}},
    ]
    with patch("app.core.engine.TOOL_REGISTRY", {"echo": lambda inp, db=None: inp}):
        result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "completed"
    assert result.steps[1].output == "hi"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_engine.py -v 2>&1 | head -10
```

Expected: `ImportError` (engine.py doesn't exist)

- [ ] **Step 3: Write `backend/app/core/engine.py`**

```python
import time
import anthropic
from sqlalchemy.orm import Session

from app.schemas.workflow import StepResult, ExecuteResponse
from app.core.tools import TOOL_REGISTRY


def run_workflow(
    workflow_id: str,
    nodes: list[dict],
    input_overrides: dict[str, str],
    db: Session | None,
    anthropic_client: anthropic.Anthropic | None = None,
) -> ExecuteResponse:
    if anthropic_client is None:
        anthropic_client = anthropic.Anthropic()

    context: dict[str, str] = {}
    steps: list[StepResult] = []

    for node in sorted(nodes, key=lambda n: n["order"]):
        t0 = time.monotonic()
        try:
            if node["type"] == "input":
                step = _run_input(node, context, input_overrides)
            elif node["type"] == "tool":
                step = _run_tool(node, context, db)
            elif node["type"] == "prompt":
                step = _run_prompt(node, context, anthropic_client)
            else:
                raise ValueError(f"Unknown node type: {node['type']}")

            context[step["variable"]] = step["output"]
            steps.append(StepResult(
                node_id=node["id"],
                type=node["type"],
                variable=step["variable"],
                output=step["output"],
                duration_ms=int((time.monotonic() - t0) * 1000),
                tool_name=step.get("tool_name"),
            ))
        except Exception as exc:
            var = (
                node["config"].get("variable_name")
                or node["config"].get("output_variable")
                or "unknown"
            )
            steps.append(StepResult(
                node_id=node["id"],
                type=node["type"],
                variable=var,
                output="",
                duration_ms=int((time.monotonic() - t0) * 1000),
                error=str(exc),
            ))
            return ExecuteResponse(
                workflow_id=workflow_id, status="failed", steps=steps
            )

    return ExecuteResponse(
        workflow_id=workflow_id, status="completed", steps=steps
    )


def _run_input(node: dict, context: dict, overrides: dict) -> dict:
    var = node["config"]["variable_name"]
    value = overrides.get(var, node["config"].get("default_value", ""))
    return {"variable": var, "output": str(value)}


def _run_tool(node: dict, context: dict, db: Session | None) -> dict:
    tool_name = node["config"]["tool_name"]
    input_var = node["config"]["input_variable"]
    output_var = node["config"]["output_variable"]
    tool_fn = TOOL_REGISTRY.get(tool_name)
    if not tool_fn:
        raise ValueError(f"Unknown tool: {tool_name}")
    output = tool_fn(context.get(input_var, ""), db=db)
    return {"variable": output_var, "output": str(output), "tool_name": tool_name}


def _run_prompt(node: dict, context: dict, client: anthropic.Anthropic) -> dict:
    template = node["config"]["prompt_template"]
    output_var = node["config"]["output_variable"]
    prompt = template
    for key, value in context.items():
        prompt = prompt.replace(f"{{{{{key}}}}}", str(value))
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"variable": output_var, "output": response.content[0].text}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend
pytest tests/test_engine.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/app/core/engine.py backend/tests/test_engine.py
git commit -m "feat: sequential execution engine with input/tool/prompt nodes"
```

---

## Task 8: Backend — FastAPI App + CRUD Routes

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/api/routes/workflows.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_workflows.py`

- [ ] **Step 1: Write `backend/tests/conftest.py`**

> **Note:** Tests require `docker compose up db` to be running.

```python
# backend/tests/conftest.py
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://silver:silver@localhost:5432/silver"
)


@pytest.fixture(scope="session")
def db_engine():
    from app.db.database import Base
    import app.models.workflow  # noqa: F401
    import app.models.subway    # noqa: F401
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    yield engine


@pytest.fixture()
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    from app.main import app
    from app.db.database import get_db
    app.dependency_overrides[get_db] = lambda: (yield db_session)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write failing CRUD tests**

```python
# backend/tests/test_workflows.py


def test_create_workflow(client):
    resp = client.post("/workflows", json={"name": "Test", "nodes": []})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test"
    assert "id" in data
    assert data["nodes"] == []


def test_get_workflow(client):
    wf_id = client.post("/workflows", json={"name": "WF", "nodes": []}).json()["id"]
    resp = client.get(f"/workflows/{wf_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == wf_id


def test_get_workflow_not_found(client):
    resp = client.get("/workflows/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_list_workflows(client):
    client.post("/workflows", json={"name": "A", "nodes": []})
    client.post("/workflows", json={"name": "B", "nodes": []})
    resp = client.get("/workflows")
    assert resp.status_code == 200
    names = [w["name"] for w in resp.json()]
    assert "A" in names and "B" in names


def test_update_workflow(client):
    wf_id = client.post("/workflows", json={"name": "Original", "nodes": []}).json()["id"]
    resp = client.put(f"/workflows/{wf_id}", json={"name": "Updated", "nodes": []})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_delete_workflow(client):
    wf_id = client.post("/workflows", json={"name": "Delete me", "nodes": []}).json()["id"]
    assert client.delete(f"/workflows/{wf_id}").status_code == 204
    assert client.get(f"/workflows/{wf_id}").status_code == 404


def test_workflow_with_nodes(client):
    nodes = [
        {"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "test"}},
    ]
    resp = client.post("/workflows", json={"name": "With nodes", "nodes": nodes})
    assert resp.status_code == 201
    wf_id = resp.json()["id"]
    fetched = client.get(f"/workflows/{wf_id}").json()
    assert fetched["nodes"][0]["config"]["variable_name"] == "q"
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_workflows.py -v 2>&1 | head -10
```

Expected: `ImportError` — `app.main` doesn't exist yet

- [ ] **Step 4: Write `backend/app/api/routes/workflows.py`**

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.workflow import Workflow
from app.schemas.workflow import WorkflowCreate, WorkflowRead, WorkflowSummary, WorkflowUpdate

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowSummary])
def list_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).order_by(Workflow.updated_at.desc()).all()


@router.post("", response_model=WorkflowRead, status_code=201)
def create_workflow(body: WorkflowCreate, db: Session = Depends(get_db)):
    wf = Workflow(name=body.name, nodes=[n.model_dump() for n in body.nodes])
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowRead)
def update_workflow(workflow_id: str, body: WorkflowUpdate, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.name = body.name
    wf.nodes = [n.model_dump() for n in body.nodes]
    wf.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
```

- [ ] **Step 5: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.workflows import router as workflows_router

app = FastAPI(title="Workflow Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows_router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
pytest tests/test_workflows.py -v
```

Expected: `7 passed`

- [ ] **Step 7: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/app/main.py backend/app/api/routes/workflows.py \
        backend/tests/conftest.py backend/tests/test_workflows.py
git commit -m "feat: FastAPI app with workflow CRUD endpoints"
```

---

## Task 9: Backend — Execute Route

**Files:**
- Create: `backend/app/api/routes/execution.py`
- Create: `backend/tests/test_execution.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_execution.py
from unittest.mock import patch, MagicMock


def test_execute_workflow_returns_steps(client):
    # Create workflow with just an input node
    nodes = [{"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "hello"}}]
    wf_id = client.post("/workflows", json={"name": "Exec test", "nodes": nodes}).json()["id"]

    resp = client.post(f"/workflows/{wf_id}/execute", json={"input_overrides": {}})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert len(data["steps"]) == 1
    assert data["steps"][0]["output"] == "hello"


def test_execute_workflow_with_override(client):
    nodes = [{"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "default"}}]
    wf_id = client.post("/workflows", json={"name": "Override test", "nodes": nodes}).json()["id"]

    resp = client.post(f"/workflows/{wf_id}/execute", json={"input_overrides": {"q": "overridden"}})
    assert resp.status_code == 200
    assert resp.json()["steps"][0]["output"] == "overridden"


def test_execute_workflow_with_prompt_node(client):
    nodes = [
        {"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "test"}},
        {"id": "n2", "type": "prompt", "order": 1, "config": {"prompt_template": "Answer: {{q}}", "output_variable": "ans"}},
    ]
    wf_id = client.post("/workflows", json={"name": "Prompt test", "nodes": nodes}).json()["id"]

    mock_client = MagicMock()
    mock_client.messages.create.return_value.content = [MagicMock(text="mocked answer")]

    with patch("app.api.routes.execution.anthropic.Anthropic", return_value=mock_client):
        resp = client.post(f"/workflows/{wf_id}/execute", json={"input_overrides": {}})

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["steps"][1]["output"] == "mocked answer"


def test_execute_nonexistent_workflow(client):
    resp = client.post(
        "/workflows/00000000-0000-0000-0000-000000000000/execute",
        json={"input_overrides": {}}
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
pytest tests/test_execution.py -v 2>&1 | head -10
```

Expected: `404` errors (route not registered yet)

- [ ] **Step 3: Write `backend/app/api/routes/execution.py`**

```python
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.workflow import Workflow
from app.schemas.workflow import ExecuteRequest, ExecuteResponse
from app.core.engine import run_workflow

router = APIRouter(prefix="/workflows", tags=["execution"])


@router.post("/{workflow_id}/execute", response_model=ExecuteResponse)
def execute_workflow(
    workflow_id: str,
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
```

- [ ] **Step 4: Register the execution router in `backend/app/main.py`**

Add after the existing router import:
```python
from app.api.routes.execution import router as execution_router
# ...
app.include_router(execution_router)
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend
pytest tests/ -v
```

Expected: all tests pass (≥ 19 passed)

- [ ] **Step 6: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add backend/app/api/routes/execution.py backend/app/main.py backend/tests/test_execution.py
git commit -m "feat: workflow execute endpoint wired to engine"
```

---

## Task 10: Frontend — Project Setup + Types + API Client

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Create: `frontend/src/types/workflow.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/vite.config.ts` (replace generated)
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Scaffold Vite project and install dependencies**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui
```

- [ ] **Step 2: Replace `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 3: Create `frontend/src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Write `frontend/src/types/workflow.ts`**

```typescript
export type NodeType = 'input' | 'tool' | 'prompt';

export interface InputNodeConfig {
  variable_name: string;
  default_value: string;
}

export interface ToolNodeConfig {
  tool_name: string;
  input_variable: string;
  output_variable: string;
}

export interface PromptNodeConfig {
  prompt_template: string;
  output_variable: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  order: number;
  config: InputNodeConfig | ToolNodeConfig | PromptNodeConfig;
}

export interface WorkflowCreate {
  name: string;
  nodes: WorkflowNode[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  updated_at: string;
}

export interface WorkflowRead {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  created_at: string;
  updated_at: string;
}

export interface StepResult {
  node_id: string;
  type: string;
  variable: string;
  output: string;
  duration_ms: number;
  error?: string;
  tool_name?: string;
}

export interface ExecuteResponse {
  workflow_id: string;
  status: 'completed' | 'failed';
  steps: StepResult[];
}

export interface ExecuteRequest {
  input_overrides: Record<string, string>;
}
```

- [ ] **Step 5: Write `frontend/src/api/client.ts`**

```typescript
import type {
  WorkflowSummary,
  WorkflowRead,
  WorkflowCreate,
  ExecuteRequest,
  ExecuteResponse,
} from '../types/workflow';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const fetchWorkflows = () =>
  request<WorkflowSummary[]>('/workflows');

export const fetchWorkflow = (id: string) =>
  request<WorkflowRead>(`/workflows/${id}`);

export const createWorkflow = (data: WorkflowCreate) =>
  request<WorkflowRead>('/workflows', { method: 'POST', body: JSON.stringify(data) });

export const updateWorkflow = (id: string, data: WorkflowCreate) =>
  request<WorkflowRead>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteWorkflow = (id: string) =>
  request<void>(`/workflows/${id}`, { method: 'DELETE' });

export const executeWorkflow = (id: string, data: ExecuteRequest) =>
  request<ExecuteResponse>(`/workflows/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
```

- [ ] **Step 6: Confirm TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add frontend/
git commit -m "feat: frontend scaffold with TypeScript types and API client"
```

---

## Task 11: Frontend — Zustand Store + Validation

**Files:**
- Create: `frontend/src/utils/validation.ts`
- Create: `frontend/src/utils/validation.test.ts`
- Create: `frontend/src/store/workflowStore.ts`
- Create: `frontend/src/store/workflowStore.test.ts`

- [ ] **Step 1: Write failing validation tests**

```typescript
// frontend/src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { getValidationErrors } from './validation';
import type { WorkflowNode } from '../types/workflow';

describe('getValidationErrors', () => {
  it('returns no errors for a valid pipeline', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'input', order: 0, config: { variable_name: 'q', default_value: '' } },
      { id: '2', type: 'tool', order: 1, config: { tool_name: 'query_subway_db', input_variable: 'q', output_variable: 'results' } },
      { id: '3', type: 'prompt', order: 2, config: { prompt_template: 'Summarize: {{q}} and {{results}}', output_variable: 'answer' } },
    ];
    expect(getValidationErrors(nodes)).toEqual({});
  });

  it('flags a tool node referencing an undefined variable', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'tool', order: 0, config: { tool_name: 'query_subway_db', input_variable: 'undefined_var', output_variable: 'out' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['1']).toBeDefined();
    expect(errors['1'][0]).toContain('undefined_var');
  });

  it('flags a prompt node referencing a variable not yet defined', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'prompt', order: 0, config: { prompt_template: 'Hello {{missing}}', output_variable: 'out' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['1']).toBeDefined();
    expect(errors['1'][0]).toContain('missing');
  });

  it('does not flag a prompt referencing a variable defined by a prior node', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'input', order: 0, config: { variable_name: 'q', default_value: '' } },
      { id: '2', type: 'prompt', order: 1, config: { prompt_template: 'Answer {{q}}', output_variable: 'out' } },
    ];
    expect(getValidationErrors(nodes)).toEqual({});
  });

  it('flags reordering that breaks a dependency', () => {
    const nodes: WorkflowNode[] = [
      // prompt comes first (order=0 in array position, but logic uses array index)
      { id: '2', type: 'prompt', order: 0, config: { prompt_template: '{{q}}', output_variable: 'out' } },
      { id: '1', type: 'input', order: 1, config: { variable_name: 'q', default_value: '' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['2']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run validation tests to confirm they fail**

```bash
cd frontend
npx vitest run src/utils/validation.test.ts 2>&1 | tail -5
```

Expected: `Cannot find module './validation'`

- [ ] **Step 3: Write `frontend/src/utils/validation.ts`**

```typescript
import type {
  WorkflowNode,
  InputNodeConfig,
  ToolNodeConfig,
  PromptNodeConfig,
} from '../types/workflow';

function outputVarOf(node: WorkflowNode): string | null {
  if (node.type === 'input') return (node.config as InputNodeConfig).variable_name;
  if (node.type === 'tool') return (node.config as ToolNodeConfig).output_variable;
  if (node.type === 'prompt') return (node.config as PromptNodeConfig).output_variable;
  return null;
}

export function getValidationErrors(
  nodes: WorkflowNode[]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const available = new Set(
      nodes.slice(0, i).map(outputVarOf).filter(Boolean) as string[]
    );
    const nodeErrors: string[] = [];

    if (node.type === 'tool') {
      const cfg = node.config as ToolNodeConfig;
      if (cfg.input_variable && !available.has(cfg.input_variable)) {
        nodeErrors.push(
          `Variable "{{${cfg.input_variable}}}" is not defined by any previous node`
        );
      }
    } else if (node.type === 'prompt') {
      const cfg = node.config as PromptNodeConfig;
      const refs = [
        ...(cfg.prompt_template?.matchAll(/\{\{(\w+)\}\}/g) ?? []),
      ].map((m) => m[1]);
      for (const ref of refs) {
        if (!available.has(ref)) {
          nodeErrors.push(
            `Variable "{{${ref}}}" is not defined by any previous node`
          );
        }
      }
    }

    if (nodeErrors.length > 0) errors[node.id] = nodeErrors;
  }

  return errors;
}

export function availableVarsAt(nodes: WorkflowNode[], index: number): string[] {
  return nodes
    .slice(0, index)
    .map(outputVarOf)
    .filter(Boolean) as string[];
}
```

- [ ] **Step 4: Run validation tests to confirm they pass**

```bash
npx vitest run src/utils/validation.test.ts
```

Expected: `5 passed`

- [ ] **Step 5: Write failing store tests**

```typescript
// frontend/src/store/workflowStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from './workflowStore';

const reset = () =>
  useWorkflowStore.setState({
    nodes: [],
    workflowId: null,
    workflowName: 'Untitled',
    isDirty: false,
    executionResult: null,
    isExecuting: false,
  });

describe('workflowStore', () => {
  beforeEach(reset);

  it('addNode appends a node with correct type', () => {
    useWorkflowStore.getState().addNode('input');
    const { nodes } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('input');
    expect(nodes[0].id).toBeTruthy();
  });

  it('addNode sets isDirty', () => {
    useWorkflowStore.getState().addNode('prompt');
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it('removeNode removes by id', () => {
    useWorkflowStore.getState().addNode('input');
    const id = useWorkflowStore.getState().nodes[0].id;
    useWorkflowStore.getState().removeNode(id);
    expect(useWorkflowStore.getState().nodes).toHaveLength(0);
  });

  it('reorderNodes swaps nodes', () => {
    useWorkflowStore.getState().addNode('input');
    useWorkflowStore.getState().addNode('tool');
    useWorkflowStore.getState().reorderNodes(0, 1);
    const { nodes } = useWorkflowStore.getState();
    expect(nodes[0].type).toBe('tool');
    expect(nodes[1].type).toBe('input');
  });

  it('reorderNodes updates order fields', () => {
    useWorkflowStore.getState().addNode('input');
    useWorkflowStore.getState().addNode('tool');
    useWorkflowStore.getState().reorderNodes(0, 1);
    const { nodes } = useWorkflowStore.getState();
    expect(nodes[0].order).toBe(0);
    expect(nodes[1].order).toBe(1);
  });

  it('updateNodeConfig merges config patch', () => {
    useWorkflowStore.getState().addNode('input');
    const id = useWorkflowStore.getState().nodes[0].id;
    useWorkflowStore.getState().updateNodeConfig(id, { variable_name: 'foo' });
    const node = useWorkflowStore.getState().nodes[0];
    expect((node.config as any).variable_name).toBe('foo');
  });
});
```

- [ ] **Step 6: Run store tests to confirm they fail**

```bash
npx vitest run src/store/workflowStore.test.ts 2>&1 | tail -5
```

Expected: `Cannot find module './workflowStore'`

- [ ] **Step 7: Write `frontend/src/store/workflowStore.ts`**

```typescript
import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../api/client';
import type {
  WorkflowNode,
  NodeType,
  ExecuteResponse,
  InputNodeConfig,
  ToolNodeConfig,
  PromptNodeConfig,
} from '../types/workflow';

// npm install uuid @types/uuid
const defaultConfig = (type: NodeType): InputNodeConfig | ToolNodeConfig | PromptNodeConfig => {
  if (type === 'input') return { variable_name: 'my_var', default_value: '' };
  if (type === 'tool') return { tool_name: 'query_subway_db', input_variable: '', output_variable: 'tool_result' };
  return { prompt_template: '', output_variable: 'llm_result' };
};

interface WorkflowState {
  nodes: WorkflowNode[];
  workflowId: string | null;
  workflowName: string;
  isDirty: boolean;
  executionResult: ExecuteResponse | null;
  isExecuting: boolean;
  setWorkflow: (id: string, name: string, nodes: WorkflowNode[]) => void;
  addNode: (type: NodeType) => void;
  removeNode: (id: string) => void;
  reorderNodes: (oldIndex: number, newIndex: number) => void;
  updateNodeConfig: (id: string, patch: Partial<InputNodeConfig & ToolNodeConfig & PromptNodeConfig>) => void;
  setWorkflowName: (name: string) => void;
  saveWorkflow: () => Promise<void>;
  executeWorkflow: (overrides?: Record<string, string>) => Promise<void>;
  clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,
  executionResult: null,
  isExecuting: false,

  setWorkflow: (id, name, nodes) =>
    set({ workflowId: id, workflowName: name, nodes, isDirty: false }),

  addNode: (type) =>
    set((s) => {
      const newNode: WorkflowNode = {
        id: uuidv4(),
        type,
        order: s.nodes.length,
        config: defaultConfig(type),
      };
      return { nodes: [...s.nodes, newNode], isDirty: true };
    }),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes
        .filter((n) => n.id !== id)
        .map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    })),

  reorderNodes: (oldIndex, newIndex) =>
    set((s) => ({
      nodes: arrayMove(s.nodes, oldIndex, newIndex).map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    })),

  updateNodeConfig: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, config: { ...n.config, ...patch } } : n
      ),
      isDirty: true,
    })),

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  saveWorkflow: async () => {
    const { workflowId, workflowName, nodes } = get();
    const payload = { name: workflowName, nodes };
    if (workflowId) {
      await api.updateWorkflow(workflowId, payload);
    } else {
      const created = await api.createWorkflow(payload);
      set({ workflowId: created.id });
    }
    set({ isDirty: false });
  },

  executeWorkflow: async (overrides = {}) => {
    const { workflowId } = get();
    if (!workflowId) return;
    set({ isExecuting: true, executionResult: null });
    try {
      const result = await api.executeWorkflow(workflowId, { input_overrides: overrides });
      set({ executionResult: result });
    } finally {
      set({ isExecuting: false });
    }
  },

  clearExecution: () => set({ executionResult: null }),
}));
```

- [ ] **Step 8: Install `uuid` package**

```bash
cd frontend
npm install uuid
npm install -D @types/uuid
```

- [ ] **Step 9: Run all frontend tests**

```bash
npx vitest run
```

Expected: `11 passed` (5 validation + 6 store)

- [ ] **Step 10: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add frontend/src/utils/ frontend/src/store/
git commit -m "feat: Zustand store and validation logic with tests"
```

---

## Task 12: Frontend — Node Components

**Files:**
- Create: `frontend/src/components/nodes/InputNode.tsx`
- Create: `frontend/src/components/nodes/ToolNode.tsx`
- Create: `frontend/src/components/nodes/PromptNode.tsx`

All three components use `useSortable` from dnd-kit for drag handles.

- [ ] **Step 1: Write `frontend/src/components/nodes/InputNode.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, InputNodeConfig } from '../../types/workflow';

interface Props {
  node: WorkflowNode;
  errors: string[];
}

export function InputNode({ node, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as InputNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#3b82f6'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#eff6ff',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>INPUT</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <label>Variable:</label>
        <input
          value={cfg.variable_name}
          onChange={(e) => updateNodeConfig(node.id, { variable_name: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 130 }}
          placeholder="variable_name"
        />
        <label>Default value:</label>
        <input
          value={cfg.default_value}
          onChange={(e) => updateNodeConfig(node.id, { default_value: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', flex: 1, minWidth: 200 }}
          placeholder="Default value"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/nodes/ToolNode.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, ToolNodeConfig } from '../../types/workflow';

const AVAILABLE_TOOLS = ['query_subway_db', 'calculate_average_delay'];

interface Props {
  node: WorkflowNode;
  availableVars: string[];
  errors: string[];
}

export function ToolNode({ node, availableVars, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as ToolNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#10b981'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#f0fdf4',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>TOOL</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <label>Tool:</label>
        <select
          value={cfg.tool_name}
          onChange={(e) => updateNodeConfig(node.id, { tool_name: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 4px' }}
        >
          {AVAILABLE_TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label>Input:</label>
        <select
          value={cfg.input_variable}
          onChange={(e) => updateNodeConfig(node.id, { input_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 4px' }}
        >
          <option value="">-- select variable --</option>
          {availableVars.map((v) => <option key={v} value={v}>{`{{${v}}}`}</option>)}
        </select>
        <label>→ Output var:</label>
        <input
          value={cfg.output_variable}
          onChange={(e) => updateNodeConfig(node.id, { output_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 120 }}
          placeholder="output_var"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `frontend/src/components/nodes/PromptNode.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, PromptNodeConfig } from '../../types/workflow';

interface Props {
  node: WorkflowNode;
  availableVars: string[];
  errors: string[];
}

export function PromptNode({ node, availableVars, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as PromptNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const insertVar = (v: string) => {
    updateNodeConfig(node.id, {
      prompt_template: (cfg.prompt_template || '') + `{{${v}}}`,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#f59e0b'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#fffbeb',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>PROMPT</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      {availableVars.length > 0 && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Insert variable:{' '}
          {availableVars.map((v) => (
            <button
              key={v}
              onClick={() => insertVar(v)}
              style={{
                marginLeft: 4,
                background: '#fef9c3',
                border: '1px solid #fcd34d',
                borderRadius: 3,
                padding: '1px 6px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >{`{{${v}}}`}</button>
          ))}
        </div>
      )}
      <textarea
        value={cfg.prompt_template}
        onChange={(e) => updateNodeConfig(node.id, { prompt_template: e.target.value })}
        rows={3}
        placeholder="Write your prompt here. Use {{variable_name}} to inject values."
        style={{
          width: '100%',
          border: '1px solid #cbd5e1',
          borderRadius: 4,
          padding: '4px 6px',
          fontSize: 13,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 4 }}>
        <label>→ Output var:</label>
        <input
          value={cfg.output_variable}
          onChange={(e) => updateNodeConfig(node.id, { output_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 130 }}
          placeholder="output_var"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add frontend/src/components/nodes/
git commit -m "feat: InputNode, ToolNode, PromptNode components with drag handles"
```

---

## Task 13: Frontend — WorkflowEditor, WorkflowList, ExecutionViewer, App

**Files:**
- Create: `frontend/src/components/WorkflowEditor.tsx`
- Create: `frontend/src/components/WorkflowList.tsx`
- Create: `frontend/src/components/ExecutionViewer.tsx`
- Create: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write `frontend/src/components/ExecutionViewer.tsx`**

```tsx
import type { ExecuteResponse } from '../types/workflow';

interface Props {
  result: ExecuteResponse;
  onClose: () => void;
}

const statusColor = (s: string) =>
  s === 'completed' ? '#166534' : '#991b1b';

const stepBg: Record<string, string> = {
  input: '#eff6ff',
  tool: '#f0fdf4',
  prompt: '#fffbeb',
};

export function ExecutionViewer({ result, onClose }: Props) {
  return (
    <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>
          <strong>Execution Result</strong>{' '}
          <span style={{
            background: result.status === 'completed' ? '#dcfce7' : '#fee2e2',
            color: statusColor(result.status),
            borderRadius: 4,
            padding: '1px 8px',
            fontSize: 12,
          }}>{result.status}</span>
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
      {result.steps.map((step, i) => (
        <div key={step.node_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div style={{
            background: stepBg[step.type] ?? '#f8fafc',
            padding: '6px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
          }}>
            <span>
              <strong>{i + 1}. {step.type.toUpperCase()}</strong>
              {step.tool_name && <span style={{ color: '#64748b' }}> — {step.tool_name}</span>}
              {' → '}<code>{step.variable}</code>
              {' '}
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{step.duration_ms}ms</span>
            </span>
            <span>{step.error ? '✗' : '✓'}</span>
          </div>
          <div style={{ padding: '6px 14px', background: '#f8fafc', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto' }}>
            {step.error
              ? <span style={{ color: '#dc2626' }}>{step.error}</span>
              : step.output}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/WorkflowList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import type { WorkflowSummary } from '../types/workflow';

export function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchWorkflows().then(setWorkflows).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await api.deleteWorkflow(id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Workflow Builder</h1>
        <button
          onClick={() => navigate('/workflows/new')}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
        >+ New Workflow</button>
      </div>
      {workflows.length === 0 && <p style={{ color: '#64748b' }}>No workflows yet. Create one!</p>}
      {workflows.map((wf) => (
        <div key={wf.id} style={{
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '12px 16px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <strong>{wf.name}</strong>
            <div style={{ fontSize: 12, color: '#64748b' }}>Updated {new Date(wf.updated_at).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/workflows/${wf.id}/edit`)}
              style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
            >Edit</button>
            <button
              onClick={() => handleDelete(wf.id)}
              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
            >Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `frontend/src/components/WorkflowEditor.tsx`**

```tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkflowStore } from '../store/workflowStore';
import { getValidationErrors, availableVarsAt } from '../utils/validation';
import { InputNode } from './nodes/InputNode';
import { ToolNode } from './nodes/ToolNode';
import { PromptNode } from './nodes/PromptNode';
import { ExecutionViewer } from './ExecutionViewer';
import * as api from '../api/client';

export function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    nodes,
    workflowId,
    workflowName,
    isDirty,
    isExecuting,
    executionResult,
    setWorkflow,
    setWorkflowName,
    addNode,
    reorderNodes,
    saveWorkflow,
    executeWorkflow,
    clearExecution,
  } = useWorkflowStore();

  useEffect(() => {
    if (id && id !== 'new') {
      api.fetchWorkflow(id).then((wf) => setWorkflow(wf.id, wf.name, wf.nodes));
    }
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const validationErrors = getValidationErrors(nodes);
  const hasErrors = Object.keys(validationErrors).length > 0;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = nodes.findIndex((n) => n.id === active.id);
      const newIndex = nodes.findIndex((n) => n.id === over.id);
      reorderNodes(oldIndex, newIndex);
    }
  }

  const handleSave = async () => {
    await saveWorkflow();
    if (!workflowId) navigate(`/workflows/${useWorkflowStore.getState().workflowId}/edit`, { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 20px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>← Back</button>
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 10px', fontSize: 16, fontWeight: 600, width: 280 }}
        />
        <span style={{ flex: 1 }} />
        {hasErrors && <span style={{ color: '#ef4444', fontSize: 13 }}>⚠ Fix validation errors</span>}
        <button
          onClick={handleSave}
          disabled={!isDirty}
          style={{ background: isDirty ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: isDirty ? 'pointer' : 'default' }}
        >💾 Save{isDirty ? '*' : ''}</button>
        <button
          onClick={() => executeWorkflow()}
          disabled={isExecuting || hasErrors || !workflowId}
          style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
        >{isExecuting ? 'Running...' : '▶ Execute'}</button>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        <aside style={{ width: 140, borderRight: '1px solid #e2e8f0', padding: 12, background: 'white' }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Add Node</div>
          {(['input', 'tool', 'prompt'] as const).map((type) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 6,
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                background: type === 'input' ? '#dbeafe' : type === 'tool' ? '#d1fae5' : '#fef3c7',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
              }}
            >+ {type.charAt(0).toUpperCase() + type.slice(1)}</button>
          ))}
        </aside>

        <main style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              {nodes.map((node, index) => {
                const errors = validationErrors[node.id] ?? [];
                const avail = availableVarsAt(nodes, index);
                if (node.type === 'input') return <InputNode key={node.id} node={node} errors={errors} />;
                if (node.type === 'tool') return <ToolNode key={node.id} node={node} availableVars={avail} errors={errors} />;
                if (node.type === 'prompt') return <PromptNode key={node.id} node={node} availableVars={avail} errors={errors} />;
                return null;
              })}
            </SortableContext>
          </DndContext>
          {nodes.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 60 }}>
              Add nodes from the left panel to build your workflow.
            </p>
          )}
          {executionResult && (
            <ExecutionViewer result={executionResult} onClose={clearExecution} />
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowEditor } from './components/WorkflowEditor';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkflowList />} />
        <Route path="/workflows/new" element={<WorkflowEditor />} />
        <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Update `frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Also delete the generated `frontend/src/App.css`, `frontend/src/index.css`, and `frontend/src/assets/` if present (remove their imports from main.tsx).

- [ ] **Step 6: Confirm TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add frontend/src/
git commit -m "feat: WorkflowEditor, WorkflowList, ExecutionViewer, App routing"
```

---

## Task 14: Smoke Test + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Copy `.env.example` to `.env` and fill in your API key**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY=<your key>
```

- [ ] **Step 2: Build and start all services**

```bash
docker compose up --build
```

Wait for all three services to be healthy. Backend seeding takes ~30 seconds on first run.

- [ ] **Step 3: Verify backend is seeded**

```bash
curl http://localhost:8000/workflows | python3 -m json.tool
```

Expected: JSON array containing `"Toronto Subway Analyst"`.

- [ ] **Step 4: Verify frontend loads and shows the Toronto workflow**

Open `http://localhost:3000` in a browser. You should see the workflow list with "Toronto Subway Analyst". Click **Edit**, verify 3 nodes load. Click **Execute** and confirm the execution panel renders with 3 steps.

- [ ] **Step 5: Write `README.md`**

````markdown
# Micro-Agent Workflow Builder

A web application for constructing and executing sequential AI pipelines. Ships with a pre-configured **Toronto Subway Analyst** workflow that answers natural-language questions about TTC delay data.

---

## Quick Start

**Requirements:** Docker Desktop, an Anthropic API key.

```bash
git clone <repo-url>
cd silver
cp .env.example .env          # fill in ANTHROPIC_API_KEY
docker compose up --build     # first run seeds ~50k delay records (~30s)
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Running Tests

```bash
# Backend (requires docker compose up db)
cd backend
pip install -r requirements.txt
pytest tests/ -v

# Frontend
cd frontend
npm install
npm test
```

---

## Architecture

### Stack
| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| State | Zustand |
| Drag-and-drop | dnd-kit |
| Backend | FastAPI + Pydantic v2 |
| ORM | SQLAlchemy 2.0 (sync) |
| Migrations | Alembic |
| LLM | Anthropic Claude (Haiku) |
| Database | PostgreSQL 15 |
| Containerisation | Docker Compose |

### System Diagram

```mermaid
graph LR
  Browser["Browser :3000\n(React)"]
  API["FastAPI :8000"]
  DB["PostgreSQL :5432"]
  Anthropic["Anthropic API"]

  Browser <-->|REST/JSON| API
  API <-->|SQLAlchemy| DB
  API <-->|HTTPS| Anthropic
```

### Save Workflow Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant FE as React Frontend
  participant BE as FastAPI Backend
  participant DB as PostgreSQL

  U->>FE: Clicks "Save"
  FE->>BE: PUT /workflows/:id {name, nodes}
  BE->>BE: Validate Pydantic schema
  BE->>DB: UPDATE workflows SET nodes=:nodes WHERE id=:id
  DB-->>BE: OK
  BE-->>FE: 200 {workflow}
  FE->>FE: isDirty = false
  FE-->>U: Button re-enables
```

### Execute Workflow Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant FE as React Frontend
  participant BE as FastAPI Backend
  participant DB as PostgreSQL
  participant T as Tool (query_subway_db)
  participant AI as Anthropic API

  U->>FE: Clicks "Execute"
  FE->>BE: POST /workflows/:id/execute {input_overrides}
  BE->>DB: SELECT workflow WHERE id=:id
  DB-->>BE: workflow + nodes (JSONB)

  loop For each node (sorted by order)
    alt Input Node
      BE->>BE: context[var] = value
    else Tool Node
      BE->>T: call tool(context[input_var], db)
      T->>BE: calls Claude Haiku to extract params
      T->>DB: parameterized SQL query
      DB-->>T: rows
      T-->>BE: JSON string
      BE->>BE: context[output_var] = result
    else Prompt Node
      BE->>BE: interpolate {{vars}} → prompt string
      BE->>AI: POST messages [{role:user, content:prompt}]
      AI-->>BE: completion text
      BE->>BE: context[output_var] = text
    end
  end

  BE-->>FE: {status, steps[]}
  FE-->>U: ExecutionViewer renders steps
```

---

## Architectural Choices & Trade-offs

### Nodes stored as JSONB
Nodes are stored as a JSON array in a single `JSONB` column rather than a normalised `nodes` table. Rationale: nodes are always read and written as a unit; joins add complexity with no query benefit at this scale. Trade-off: you cannot query individual node fields efficiently in SQL.

### Synchronous SQLAlchemy
Used sync SQLAlchemy rather than async (`asyncpg` + `sqlalchemy[asyncio]`). The execution pipeline is already I/O-bound on Anthropic API calls, but the added complexity of async context propagation wasn't worth it for a weekend project. Trade-off: one thread per request under load.

### Zustand over Redux
Zustand is significantly less boilerplate than Redux Toolkit for a small store. The workflow editor is the only stateful surface, so a single flat store is appropriate. Trade-off: less dev tooling than Redux.

### What I'd change with 2 more weeks
- **Streaming execution** via SSE — stream each node's output as it arrives instead of blocking on the full pipeline
- **Execution history** — persist results to a DB table for audit/replay
- **Text-to-SQL** — replace the Claude-based param extraction in `query_subway_db` with proper few-shot SQL generation
- **Auth** — user accounts with per-user workflow isolation
- **Richer tool input mapping** — allow mapping multiple context variables to named tool params
````

- [ ] **Step 6: Commit README**

```bash
cd /Users/chiaweizhengterry/Desktop/silver
git add README.md
git commit -m "docs: README with setup, architecture, and sequence diagrams"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Add/remove/reorder nodes (Tasks 11–13)
- ✅ Three node types: Input, Prompt, Tool (Tasks 12–13)
- ✅ Variable injection `{{var}}` in Prompt node (Task 7 engine, Task 12 PromptNode)
- ✅ Validation: only prior-node variables accessible (Task 11 validation.ts)
- ✅ Save endpoint POST/PUT (Task 8)
- ✅ Fetch endpoint GET (Task 8)
- ✅ Toronto Subway workflow pre-seeded (Task 5)
- ✅ Execute endpoint with real LLM (Tasks 7, 9)
- ✅ Docker Compose (Task 2)
- ✅ README with setup, architecture, diagrams (Task 14)

**Type consistency check:**
- `run_workflow(workflow_id, nodes, input_overrides, db, anthropic_client)` — defined Task 7, called Task 9 ✅
- `TOOL_REGISTRY` dict key names match ToolNode dropdown values (`query_subway_db`, `calculate_average_delay`) ✅
- `NodeConfig.config` keys match what engine accesses (`variable_name`, `default_value`, `tool_name`, `input_variable`, `output_variable`, `prompt_template`) ✅
- `availableVarsAt` exported from `validation.ts`, imported in `WorkflowEditor.tsx` ✅
