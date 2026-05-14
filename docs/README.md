# Documentation

Reference documentation for the Micro-Agent Workflow Builder.

## Contents

| File | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System overview, data flow, Docker services |
| [api.md](./api.md) | All REST endpoints with request/response shapes |
| [backend.md](./backend.md) | Backend modules, execution engine, tool registry |
| [frontend.md](./frontend.md) | Component tree, Zustand store, validation logic |
| [adding-a-tool.md](./adding-a-tool.md) | Step-by-step guide to registering a new tool |

## Quick orientation

```
Browser (React :3000)
  ↕ REST/JSON
FastAPI (:8000)
  ↕ SQLAlchemy
PostgreSQL (:5432)

FastAPI also calls:
  Anthropic API — prompt nodes + query param extraction
```

Start with [architecture.md](./architecture.md) if you're new to the codebase.
