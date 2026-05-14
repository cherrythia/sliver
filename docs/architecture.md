# Architecture

## Services

Three Docker services defined in `docker-compose.yml`:

| Service | Image / Build | Port | Role |
|---|---|---|---|
| `db` | `postgres:15` | 5432 | Stores workflows + subway delay data |
| `backend` | `./backend` | 8000 | FastAPI — CRUD, execution engine, tool registry |
| `frontend` | `./frontend` | 3000 | Vite + React UI |
| `adminer` | `adminer:latest` | 8080 | Web DB browser (connect to `db` host) |

Startup order: `db` (healthcheck) → `backend` (runs migrations + seed) → `frontend`.

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
  ├─ CRUD routes ──────────────────────► PostgreSQL
  │    workflows.py                        workflows table (nodes as JSONB)
  │
  └─ Execute route ────────────────────► engine.py
       execution.py                        │
                                           ├─ Input node  → writes to context{}
                                           ├─ Tool node   → tools.py → PostgreSQL
                                           └─ Prompt node → Anthropic API → context{}
```

## Database tables

### `workflows`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| name | TEXT | Display name |
| nodes | JSONB | Ordered array of node configs |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Nodes are stored as a JSONB array (not a normalised table) because they are always read and written as a unit.

### `subway_delays`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL | Primary key |
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

## Environment variables

| Variable | Required | Default | Used by |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Backend (prompt nodes + query extraction) |
| `DATABASE_URL` | No | `postgresql://silver:silver@localhost:5432/silver` | Backend |
| `VITE_API_URL` | No | `http://localhost:8000` | Frontend build |

Set `ANTHROPIC_API_KEY` in `.env` at the repo root before running `docker compose up`.
