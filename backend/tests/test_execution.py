from unittest.mock import patch, MagicMock


def test_execute_input_only_workflow(client):
    nodes = [{"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "hello"}}]
    wf_id = client.post("/workflows", json={"name": "Exec test", "nodes": nodes}).json()["id"]
    resp = client.post(f"/workflows/{wf_id}/execute", json={"input_overrides": {}})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert len(data["steps"]) == 1
    assert data["steps"][0]["output"] == "hello"


def test_execute_with_input_override(client):
    nodes = [{"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "default"}}]
    wf_id = client.post("/workflows", json={"name": "Override test", "nodes": nodes}).json()["id"]
    resp = client.post(f"/workflows/{wf_id}/execute", json={"input_overrides": {"q": "overridden"}})
    assert resp.status_code == 200
    assert resp.json()["steps"][0]["output"] == "overridden"


def test_execute_with_prompt_node(client):
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
