# Architecture

## Services

Five Docker services defined in `docker-compose.yml`:

| Service | Image / Build | Port | Role |
|---|---|---|---|
| `db` | `cockroachdb/cockroach:v24.3.0` | 26257 (SQL), 8080 (DB Console) | Distributed SQL database |
| `backend` | `./backend` | 8000 | FastAPI — CRUD, execution engine, tool registry |
| `adminer` | `adminer:latest` | 8081 | Lightweight web DB browser |
| `frontend` | `./frontend` | 3000 | Vite + React UI |

Startup order: `db` (healthcheck) → `backend` (creates DB, runs migrations, seeds data) → `frontend`.

## Data flow

```
Browser
  │
  │  GET/POST/PUT/DELETE /workflows
  │  POST /workflows/:id/execute
  ▼
FastAPI (main.py)
  │  CORS allowed from http://localhost:3000
  │
  ├─ CRUD routes ──────────────────────► CockroachDB
  │    workflows.py                        workflows table (nodes as JSON)
  │
  └─ Execute route ────────────────────► engine.py
       execution.py                        │
                                           ├─ Input node  → writes to context{}
                                           ├─ Tool node   → tools.py → CockroachDB
                                           └─ Prompt node → Anthropic API → context{}
```

## Backend startup sequence

On every `docker compose up`, the backend runs these steps in order before accepting traffic:

```
python -m app.db.create_db   ← CREATE DATABASE IF NOT EXISTS silver
       ↓
alembic upgrade head          ← apply schema migrations
       ↓
python -m app.db.seed         ← load CSVs + seed Toronto Subway workflow (idempotent)
       ↓
uvicorn app.main:app          ← start API on :8000
```

## Database tables

### `workflows`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| name | TEXT | Display name |
| nodes | JSON | Ordered array of node configs |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Nodes are stored as a JSON array (not a normalised table) because they are always read and written as a unit.

### `subway_delays`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key — UUID avoids write hotspots in distributed DB |
| date | DATE | |
| time | TEXT | |
| day | TEXT | Mon–Sun |
| station | TEXT | Uppercase |
| code | TEXT | FK → delay_codes.code (nullable) |
| min_delay | INTEGER | Minutes of delay |
| min_gap | INTEGER | Gap in service minutes |
| bound | TEXT | N/S/E/W |
| line | TEXT | BD / YU / SHP / SRT |
| vehicle | INTEGER | |

Indexes on `station`, `date`, `line`.

### `delay_codes`
| Column | Type | Notes |
|---|---|---|
| code | TEXT | Primary key |
| description | TEXT | Human-readable cause |
| vehicle_type | TEXT | SUB / BUS / etc. |

## Connecting to the database

**CockroachDB DB Console** — `http://localhost:8080`
Browse node health, range distribution, and running queries. Navigate to `silver` database to see tables.

**Adminer** — `http://localhost:8081`
Lightweight web UI for running SQL and browsing data. Login:

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `db:26257` |
| Username | `root` |
| Password | *(leave blank — insecure mode)* |
| Database | `silver` |

**CLI inside container**
```bash
docker exec -it silver-db-1 cockroach sql --insecure --database=silver
```

## Environment variables

| Variable | Required | Default | Used by |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Backend (prompt nodes + query extraction) |
| `DATABASE_URL` | No | `cockroachdb+psycopg2://root@localhost:26257/silver?sslmode=disable` | Backend |
| `VITE_API_URL` | No | `http://localhost:8000` | Frontend build |

Set `ANTHROPIC_API_KEY` in `.env` at the repo root before running `docker compose up`.

## Why CockroachDB

CockroachDB replaces PostgreSQL for scalability and resilience:

- **Distributed SQL** — data is automatically sharded and replicated across nodes
- **UUID primary keys** — `subway_delays.id` uses UUID instead of SERIAL to distribute writes evenly across ranges (sequential integers create write hotspots)
- **PostgreSQL wire protocol** — psycopg2, SQLAlchemy, Adminer, and psql all connect without modification
- **Automatic retry** — `sqlalchemy-cockroachdb` dialect transparently retries serialization errors (transaction conflicts under concurrent load)
- **Insecure mode** — used for local development; no TLS certificates required
