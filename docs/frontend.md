# Frontend

Stack: Vite + React 18 + TypeScript + Zustand + dnd-kit.

## File map

```
frontend/src/
├── App.tsx                        # React Router routes
├── main.tsx                       # ReactDOM entry point
├── types/workflow.ts              # All TypeScript interfaces
├── api/client.ts                  # fetch() wrappers for every endpoint
├── store/workflowStore.ts         # Zustand store — single source of truth
├── utils/validation.ts            # Variable reference validation
└── components/
    ├── WorkflowList.tsx           # / route
    ├── WorkflowEditor.tsx         # /workflows/:id/edit route
    ├── ExecutionViewer.tsx        # Inline result panel
    └── nodes/
        ├── InputNode.tsx          # Blue card
        ├── ToolNode.tsx           # Green card
        └── PromptNode.tsx         # Amber card
```

---

## Routing (`App.tsx`)

| Path | Component | Behaviour |
|---|---|---|
| `/` | `WorkflowList` | Lists all workflows |
| `/workflows/new` | `WorkflowEditor` | Blank editor |
| `/workflows/:id/edit` | `WorkflowEditor` | Loads workflow from API on mount |
| `*` | — | Redirects to `/` |

---

## Zustand store (`store/workflowStore.ts`)

Single flat store. No context providers needed — components call `useWorkflowStore()` directly.

### State

| Field | Type | Description |
|---|---|---|
| `nodes` | `WorkflowNode[]` | Ordered array, source of truth for the canvas |
| `workflowId` | `string \| null` | `null` for unsaved workflows |
| `workflowName` | `string` | Editable display name |
| `isDirty` | `boolean` | True when there are unsaved changes |
| `executionResult` | `ExecuteResponse \| null` | Populated after Execute |
| `isExecuting` | `boolean` | True while awaiting execute response |

### Actions

| Action | What it does |
|---|---|
| `setWorkflow(id, name, nodes)` | Loads a workflow into the store (called on editor mount) |
| `addNode(type)` | Appends a new node with a `uuidv4` id and default config |
| `removeNode(id)` | Removes node and re-indexes `order` on remaining nodes |
| `reorderNodes(oldIndex, newIndex)` | Uses dnd-kit `arrayMove`, re-indexes `order` |
| `updateNodeConfig(id, patch)` | Merges `patch` into node's config |
| `setWorkflowName(name)` | Updates name, sets `isDirty = true` |
| `saveWorkflow()` | PUT if `workflowId` exists, else POST. Sets `isDirty = false` |
| `executeWorkflow(overrides)` | POST `/execute`, sets `executionResult` |
| `clearExecution()` | Clears `executionResult` |

---

## Validation (`utils/validation.ts`)

Runs as a derived computation — called on every render with the current node array.

### `getValidationErrors(nodes): Record<nodeId, string[]>`

For each node at index `i`, collects the output variables of nodes `0..i-1` as the available set.

- **Tool node**: checks `input_variable` is in the available set.
- **Prompt node**: extracts all `{{var}}` references from `prompt_template` via regex, checks each against the available set.

Returns a map of `nodeId → error messages[]`. Empty object = all valid.

### `availableVarsAt(nodes, index): string[]`

Returns the output variable names defined by nodes `0..index-1`. Used by `ToolNode` to populate the input variable dropdown and by `PromptNode` to render the insert buttons.

---

## Components

### `WorkflowList`

- Fetches `GET /workflows` on mount.
- Renders one row per workflow: name, node count, last updated, Edit and Delete buttons.
- Delete calls `DELETE /workflows/:id` then removes from local state.
- "+ New Workflow" navigates to `/workflows/new`.

### `WorkflowEditor`

- On mount: if `id` param exists, calls `GET /workflows/:id` and hydrates the store via `setWorkflow`.
- Left sidebar: "+ Input", "+ Tool", "+ Prompt" buttons call `addNode(type)`.
- Canvas: wraps nodes in `DndContext + SortableContext` from dnd-kit. `onDragEnd` calls `reorderNodes`.
- Each node receives its `availableVars` (from `availableVarsAt`) and `errors` (from `getValidationErrors`).
- Nav bar: Save button calls `saveWorkflow()`. Execute button calls `executeWorkflow()`.
- When `executionResult` is set, renders `ExecutionViewer` below the canvas.

### Node components (`InputNode`, `ToolNode`, `PromptNode`)

Each uses `useSortable({ id: node.id })` from dnd-kit to enable drag reordering. The drag handle (⠿) receives `attributes` and `listeners`.

| Node | Colour | Editable fields |
|---|---|---|
| Input | Blue | `variable_name`, `default_value` |
| Tool | Green | `tool_name` (dropdown), `input_variable` (dropdown of available vars), `output_variable` |
| Prompt | Amber | `prompt_template` (textarea with insert buttons), `output_variable` |

Nodes with validation errors render a red border and error messages beneath the fields.

### `ExecutionViewer`

Renders each `StepResult` as a collapsible card:
- Header: step number, node type, variable name, ✓ or ✗, duration in ms.
- Body: `output` in monospace pre-wrap, or `error` in red if the step failed.
- Card header colour matches node type (blue/green/amber).

---

## API client (`api/client.ts`)

All HTTP calls go through a single `request<T>(path, options)` function that:
- Prepends `VITE_API_URL` (defaults to `http://localhost:8000`).
- Sets `Content-Type: application/json`.
- Throws on non-2xx responses (includes status code + body text).
- Returns `undefined` for `204 No Content` responses.

Exported functions:

```ts
fetchWorkflows()                        // GET /workflows
fetchWorkflow(id)                       // GET /workflows/:id
createWorkflow(data)                    // POST /workflows
updateWorkflow(id, data)                // PUT /workflows/:id
deleteWorkflow(id)                      // DELETE /workflows/:id
executeWorkflow(id, { input_overrides }) // POST /workflows/:id/execute
```

---

## Running locally (without Docker)

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Requires the backend to be running on port 8000.

## Type checking

```bash
npx tsc --noEmit
```

## Tests

```bash
npx vitest run
```

Test files live alongside their modules: `workflowStore.test.ts`, `validation.test.ts`.
