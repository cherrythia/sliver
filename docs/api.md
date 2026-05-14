# API Reference

Base URL: `http://localhost:8000`

All request and response bodies are JSON. All workflow IDs are UUIDs.

---

## Workflows

### `GET /workflows`

List all workflows, newest first.

**Response `200`**
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Toronto Subway Analyst",
    "updated_at": "2026-05-05T10:00:00Z"
  }
]
```

---

### `POST /workflows`

Create a new workflow.

**Request body**
```json
{
  "name": "My Pipeline",
  "nodes": [
    {
      "id": "node-uuid",
      "type": "input",
      "order": 0,
      "config": {
        "variable_name": "user_query",
        "default_value": "What caused delays?"
      }
    }
  ]
}
```

**Response `201`** — full `WorkflowRead` object (same shape as `GET /workflows/:id`).

---

### `GET /workflows/:id`

Fetch a single workflow with all nodes.

**Response `200`**
```json
{
  "id": "uuid",
  "name": "Toronto Subway Analyst",
  "nodes": [
    {
      "id": "node-uuid",
      "type": "input",
      "order": 0,
      "config": { "variable_name": "user_query", "default_value": "..." }
    },
    {
      "id": "node-uuid-2",
      "type": "tool",
      "order": 1,
      "config": {
        "tool_name": "query_subway_db",
        "input_variable": "user_query",
        "output_variable": "db_results"
      }
    },
    {
      "id": "node-uuid-3",
      "type": "prompt",
      "order": 2,
      "config": {
        "prompt_template": "You are a TTC analyst. Question: {{user_query}}. Data: {{db_results}}. Summarize.",
        "output_variable": "analysis"
      }
    }
  ],
  "created_at": "2026-05-05T10:00:00Z",
  "updated_at": "2026-05-05T10:00:00Z"
}
```

**Response `404`** — workflow not found.

---

### `PUT /workflows/:id`

Full replace of a workflow's name and nodes.

**Request body** — same shape as `POST /workflows`.

**Response `200`** — updated `WorkflowRead`.

**Response `404`** — workflow not found.

---

### `DELETE /workflows/:id`

Delete a workflow.

**Response `204`** — no body.

**Response `404`** — workflow not found.

---

## Execution

### `POST /workflows/:id/execute`

Run all nodes in order and return step-by-step results.

**Request body**
```json
{
  "input_overrides": {
    "user_query": "What were the top delay causes on Line 1 in 2020?"
  }
}
```

`input_overrides` is optional. Keys must match the `variable_name` of an Input node. When provided, the override value is used instead of the node's `default_value`.

**Response `200`**
```json
{
  "workflow_id": "uuid",
  "status": "completed",
  "steps": [
    {
      "node_id": "uuid",
      "type": "input",
      "variable": "user_query",
      "output": "What were the top delay causes on Line 1 in 2020?",
      "duration_ms": 0,
      "error": null,
      "tool_name": null
    },
    {
      "node_id": "uuid",
      "type": "tool",
      "variable": "db_results",
      "output": "[{\"station\": \"UNION STATION\", ...}]",
      "duration_ms": 45,
      "error": null,
      "tool_name": "query_subway_db"
    },
    {
      "node_id": "uuid",
      "type": "prompt",
      "variable": "analysis",
      "output": "The primary causes of delays on Line 1 in 2020 were...",
      "duration_ms": 2103,
      "error": null,
      "tool_name": null
    }
  ]
}
```

If a node fails, execution halts and `status` is `"failed"`. Completed steps up to the failure are still returned. The failed step has a non-null `error` field and empty `output`.

---

## Health check

### `GET /health`

**Response `200`**
```json
{ "status": "ok" }
```

---

## Node config shapes

### Input node config
```json
{
  "variable_name": "user_query",
  "default_value": "What caused most delays at Union Station?"
}
```

### Tool node config
```json
{
  "tool_name": "query_subway_db",
  "input_variable": "user_query",
  "output_variable": "db_results"
}
```
`tool_name` must be a key in `TOOL_REGISTRY`. Available tools: `query_subway_db`, `calculate_average_delay`.

### Prompt node config
```json
{
  "prompt_template": "You are a TTC analyst. Question: {{user_query}}. Data: {{db_results}}. Summarize.",
  "output_variable": "analysis"
}
```
`{{variable_name}}` placeholders are replaced with values from the execution context before calling Claude.
