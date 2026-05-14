# Adding a New Tool

Tools are functions the workflow engine can call from a Tool node. Adding one requires changes to one file on the backend and one on the frontend.

---

## 1. Write the function (`backend/app/core/tools.py`)

All tool functions share the same signature:

```python
def my_tool(input: str, db: Session = None) -> str:
    ...
    return json.dumps(result)   # must return a string
```

- `input` — the string value of whichever context variable the Tool node points at.
- `db` — a SQLAlchemy session, available if you need to query the database.
- Return value is always a string (JSON-encoded if structured data).

**Example — a tool that counts delays per line:**

```python
def count_delays_by_line(input: str, db: Session = None) -> str:
    from sqlalchemy import func
    results = (
        db.query(SubwayDelay.line, func.count(SubwayDelay.id).label("count"))
        .group_by(SubwayDelay.line)
        .order_by(func.count(SubwayDelay.id).desc())
        .all()
    )
    return json.dumps([{"line": r.line, "count": r.count} for r in results])
```

---

## 2. Register it

Add one entry to `TOOL_REGISTRY` at the bottom of `tools.py`:

```python
TOOL_REGISTRY: dict[str, Callable] = {
    "query_subway_db": query_subway_db,
    "calculate_average_delay": calculate_average_delay,
    "count_delays_by_line": count_delays_by_line,   # ← add this
}
```

The key is the value users will select in the Tool node dropdown.

---

## 3. Expose it in the frontend (`frontend/src/components/nodes/ToolNode.tsx`)

Find the `AVAILABLE_TOOLS` constant and add your key:

```ts
const AVAILABLE_TOOLS = [
  'query_subway_db',
  'calculate_average_delay',
  'count_delays_by_line',   // ← add this
];
```

This populates the dropdown in the Tool node editor.

---

## 4. Write a test (`backend/tests/test_tools.py`)

```python
def test_count_delays_by_line(db_session):
    # seed some rows
    db_session.add(SubwayDelay(line="YU", min_delay=5, ...))
    db_session.add(SubwayDelay(line="BD", min_delay=3, ...))
    db_session.commit()

    result = json.loads(count_delays_by_line("", db=db_session))
    assert result[0]["line"] in ("YU", "BD")
    assert result[0]["count"] >= 1
```

Run with:
```bash
cd backend && pytest tests/test_tools.py -v
```

---

## Summary checklist

- [ ] Write function in `backend/app/core/tools.py`
- [ ] Add key to `TOOL_REGISTRY` in the same file
- [ ] Add key to `AVAILABLE_TOOLS` in `frontend/src/components/nodes/ToolNode.tsx`
- [ ] Write a test in `backend/tests/test_tools.py`
