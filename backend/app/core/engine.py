import time
import anthropic
from sqlalchemy.orm import Session

from app.schemas.workflow import StepResult, ExecuteResponse
from app.core.tools import TOOL_REGISTRY


def run_workflow(
    workflow_id: str,
    nodes: list[dict],
    input_overrides: dict[str, str],
    db: Session | None,
    anthropic_client: anthropic.Anthropic | None = None,
) -> ExecuteResponse:
    if anthropic_client is None:
        anthropic_client = anthropic.Anthropic()

    context: dict[str, str] = {}
    steps: list[StepResult] = []

    for node in sorted(nodes, key=lambda n: n["order"]):
        t0 = time.monotonic()
        try:
            if node["type"] == "input":
                step = _run_input(node, context, input_overrides)
            elif node["type"] == "tool":
                step = _run_tool(node, context, db)
            elif node["type"] == "prompt":
                step = _run_prompt(node, context, anthropic_client)
            else:
                raise ValueError(f"Unknown node type: {node['type']}")

            context[step["variable"]] = step["output"]
            steps.append(StepResult(
                node_id=node["id"],
                type=node["type"],
                variable=step["variable"],
                output=step["output"],
                duration_ms=int((time.monotonic() - t0) * 1000),
                tool_name=step.get("tool_name"),
            ))
        except Exception as exc:
            var = (
                node["config"].get("variable_name")
                or node["config"].get("output_variable")
                or "unknown"
            )
            steps.append(StepResult(
                node_id=node["id"],
                type=node["type"],
                variable=var,
                output="",
                duration_ms=int((time.monotonic() - t0) * 1000),
                error=str(exc),
            ))
            return ExecuteResponse(
                workflow_id=workflow_id, status="failed", steps=steps
            )

    return ExecuteResponse(
        workflow_id=workflow_id, status="completed", steps=steps
    )


def _run_input(node: dict, context: dict, overrides: dict) -> dict:
    var = node["config"]["variable_name"]
    value = overrides.get(var, node["config"].get("default_value", ""))
    return {"variable": var, "output": str(value)}


def _run_tool(node: dict, context: dict, db: Session | None) -> dict:
    tool_name = node["config"]["tool_name"]
    input_var = node["config"]["input_variable"]
    output_var = node["config"]["output_variable"]
    tool_fn = TOOL_REGISTRY.get(tool_name)
    if not tool_fn:
        raise ValueError(f"Unknown tool: {tool_name}")
    output = tool_fn(context.get(input_var, ""), db=db)
    return {"variable": output_var, "output": str(output), "tool_name": tool_name}


def _run_prompt(node: dict, context: dict, client: anthropic.Anthropic) -> dict:
    template = node["config"]["prompt_template"]
    output_var = node["config"]["output_variable"]
    prompt = template
    for key, value in context.items():
        prompt = prompt.replace(f"{{{{{key}}}}}", str(value))
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"variable": output_var, "output": response.content[0].text}
