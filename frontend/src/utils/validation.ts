import type {
  WorkflowNode,
  InputNodeConfig,
  ToolNodeConfig,
  PromptNodeConfig,
} from '../types/workflow';

function outputVarOf(node: WorkflowNode): string | null {
  if (node.type === 'input') return (node.config as InputNodeConfig).variable_name;
  if (node.type === 'tool') return (node.config as ToolNodeConfig).output_variable;
  if (node.type === 'prompt') return (node.config as PromptNodeConfig).output_variable;
  return null;
}

export function getValidationErrors(
  nodes: WorkflowNode[]
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const available = new Set(
      nodes.slice(0, i).map(outputVarOf).filter(Boolean) as string[]
    );
    const nodeErrors: string[] = [];

    if (node.type === 'tool') {
      const cfg = node.config as ToolNodeConfig;
      if (cfg.input_variable && !available.has(cfg.input_variable)) {
        nodeErrors.push(
          `Variable "{{${cfg.input_variable}}}" is not defined by any previous node`
        );
      }
    } else if (node.type === 'prompt') {
      const cfg = node.config as PromptNodeConfig;
      const refs = [
        ...(cfg.prompt_template?.matchAll(/\{\{(\w+)\}\}/g) ?? []),
      ].map((m) => m[1]);
      for (const ref of refs) {
        if (!available.has(ref)) {
          nodeErrors.push(
            `Variable "{{${ref}}}" is not defined by any previous node`
          );
        }
      }
    }

    if (nodeErrors.length > 0) errors[node.id] = nodeErrors;
  }

  return errors;
}

export function availableVarsAt(nodes: WorkflowNode[], index: number): string[] {
  return nodes
    .slice(0, index)
    .map(outputVarOf)
    .filter(Boolean) as string[];
}
