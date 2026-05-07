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
