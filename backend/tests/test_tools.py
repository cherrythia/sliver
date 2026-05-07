import json
from unittest.mock import MagicMock, patch


def test_calculate_average_delay_returns_json_list():
    from app.core.tools import calculate_average_delay

    row = MagicMock()
    row.station = "UNION STATION"
    row.description = "Disorderly Patron"
    row.count = 42
    row.avg_delay = 15.5

    mock_db = MagicMock()
    (mock_db.query.return_value
     .join.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = [row]
    (mock_db.query.return_value
     .join.return_value
     .filter.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = [row]

    result = calculate_average_delay("", db=mock_db)
    data = json.loads(result)
    assert isinstance(data, list)
    assert data[0]["station"] == "UNION STATION"
    assert data[0]["avg_delay_minutes"] == 15.5
    assert data[0]["count"] == 42


def test_calculate_average_delay_filters_by_station():
    from app.core.tools import calculate_average_delay

    mock_db = MagicMock()
    (mock_db.query.return_value
     .join.return_value
     .filter.return_value
     .group_by.return_value
     .order_by.return_value
     .limit.return_value
     .all.return_value) = []

    result = calculate_average_delay("UNION", db=mock_db)
    assert json.loads(result) == []
    mock_db.query.return_value.join.return_value.filter.assert_called_once()


def test_extract_query_params_parses_claude_json():
    with patch("app.core.tools.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text='{"station": "UNION STATION", "year": 2020, "line": null, "start_date": null, "end_date": null}')
        ]
        from app.core.tools import _extract_query_params
        result = _extract_query_params("Union Station delays in 2020")
        assert result["station"] == "UNION STATION"
        assert result["year"] == 2020


def test_extract_query_params_returns_empty_on_error():
    with patch("app.core.tools.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.side_effect = Exception("API error")
        from app.core.tools import _extract_query_params
        result = _extract_query_params("anything")
        assert result == {}


def test_tool_registry_contains_required_tools():
    from app.core.tools import TOOL_REGISTRY
    assert "query_subway_db" in TOOL_REGISTRY
    assert "calculate_average_delay" in TOOL_REGISTRY
    assert callable(TOOL_REGISTRY["query_subway_db"])
    assert callable(TOOL_REGISTRY["calculate_average_delay"])
