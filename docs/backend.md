# Backend

Stack: FastAPI + SQLAlchemy 2.0 + Pydantic v2 + Alembic + PostgreSQL 15.

## File map

```
backend/
├── app/
│   ├── main.py                  # App entry: CORS, router registration
│   ├── api/routes/
│   │   ├── workflows.py         # GET/POST/PUT/DELETE /workflows
│   │   └── execution.py        # POST /workflows/:id/execute
│   ├── core/
│   │   ├── engine.py            # Sequential node runner
│   │   └── tools.py             # Tool registry + implementations
│   ├── models/
│   │   ├── workflow.py          # Workflow ORM model
│   │   └── subway.py            # SubwayDelay + DelayCode ORM models
│   ├── schemas/
│   │   └── workflow.py          # Pydantic request/response schemas
│   └── db/
│       ├── database.py          # Engine, SessionLocal, get_db()
│       └── seed.py              # CSV loader + default workflow seeder
├── tests/
│   ├── conftest.py              # Per-test DB rollback, TestClient fixture
│   ├── test_workflows.py        # CRUD endpoint tests
│   ├── test_execution.py        # Execute endpoint tests
│   ├── test_engine.py           # Unit tests for engine.py
│   └── test_tools.py            # Unit tests for tools.py
├── alembic/                     # DB migrations
├── requirements.txt
└── Dockerfile
```

---

## Execution engine (`core/engine.py`)

`run_workflow(workflow_id, nodes, input_overrides, db, anthropic_client)` is the single entry point.

```
context = {}   ← grows as nodes run

for node in nodes sorted by order:
  if input:  context[variable_name] = override or default_value
  if tool:   context[output_variable] = TOOL_REGISTRY[tool_name](context[input_variable])
  if prompt: context[output_variable] = Claude(interpolate(template, context))

  on any exception → status="failed", return all steps so far
```

**`_run_input(node, context, overrides)`**
Writes `context[variable_name]`. If `variable_name` is in `overrides`, uses that value; otherwise uses `default_value`.

**`_run_tool(node, context, db)`**
Looks up `tool_name` in `TOOL_REGISTRY`. Passes `context[input_variable]` as the `input` argument plus the SQLAlchemy session as `db`. Writes result to `context[output_variable]`.

**`_run_prompt(node, context, client)`**
Replaces every `{{key}}` in `prompt_template` with `str(context[key])`. Sends the interpolated string to `claude-haiku-4-5-20251001` with `max_tokens=1024`. Writes `response.content[0].text` to `context[output_variable]`.

---

## Tool registry (`core/tools.py`)

```python
TOOL_REGISTRY: dict[str, Callable] = {
    "query_subway_db": query_subway_db,
    "calculate_average_delay": calculate_average_delay,
}
```

All tool functions share the same signature:
```python
def my_tool(input: str, db: Session = None) -> str:
    ...
```

### `query_subway_db`

1. Calls `_extract_query_params(input)` — sends the natural-language string to Claude Haiku and gets back structured JSON: `{station, line, year, start_date, end_date}`.
2. Builds a parameterised SQLAlchemy query against `subway_delays JOIN delay_codes`.
3. Returns top 50 rows ordered by `min_delay DESC` as a JSON string.
4. Falls back to the 20 most recent records if no rows match the filters.

### `calculate_average_delay`

Groups `subway_delays` by `station + delay_codes.description`, returns average delay and incident count as JSON. Filters by station name if `input` is non-empty.

### `_extract_query_params(query: str) -> dict`

Internal helper. Calls Claude Haiku with a system prompt that requests JSON output only. Returns `{}` on any exception so the caller degrades gracefully to an unfiltered query.

---

## Schemas (`schemas/workflow.py`)

| Class | Used for |
|---|---|
| `NodeConfig` | A single node (id, type, order, config dict) |
| `WorkflowCreate` | POST body |
| `WorkflowUpdate` | PUT body |
| `WorkflowRead` | Full workflow response (includes created_at, updated_at) |
| `WorkflowSummary` | List response (id, name, updated_at only) |
| `ExecuteRequest` | Execute POST body (`input_overrides`) |
| `StepResult` | One node's execution result |
| `ExecuteResponse` | Full execute response (status + steps[]) |

---

## Database session (`db/database.py`)

```python
get_db()   # FastAPI dependency — yields Session, closes on exit
```

Used via `Depends(get_db)` in route handlers. Tests override it with a per-test session that rolls back after each test (see `tests/conftest.py`).

---

## Seed script (`db/seed.py`)

Runs once at startup (idempotent — checks if data already exists).

1. Loads `delay_codes` from `Toronto-Subway-Delay-Codes.csv`.
2. Loads `subway_delays` from the main CSV in batches of 5000. Rows with unknown delay codes get `code = NULL` to avoid FK violations.
3. Inserts the "Toronto Subway Analyst" workflow with 3 pre-configured nodes if no workflow with that name exists.

---

## Running tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Tests use SQLite in-memory (no Postgres needed). Each test gets a clean transaction rolled back at the end.
