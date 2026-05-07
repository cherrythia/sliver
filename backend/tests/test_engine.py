from unittest.mock import MagicMock, patch


def _make_nodes(*specs):
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
    nodes = [
        {"id": "n2", "type": "tool", "order": 1, "config": {"tool_name": "echo", "input_variable": "q", "output_variable": "out"}},
        {"id": "n1", "type": "input", "order": 0, "config": {"variable_name": "q", "default_value": "hi"}},
    ]
    with patch("app.core.engine.TOOL_REGISTRY", {"echo": lambda inp, db=None: inp}):
        result = run_workflow("wf1", nodes, {}, db=None)
    assert result.status == "completed"
    assert result.steps[1].output == "hi"
