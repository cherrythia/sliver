export type NodeType = 'input' | 'tool' | 'prompt';

export interface InputNodeConfig {
  variable_name: string;
  default_value: string;
}

export interface ToolNodeConfig {
  tool_name: string;
  input_variable: string;
  output_variable: string;
}

export interface PromptNodeConfig {
  prompt_template: string;
  output_variable: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  order: number;
  config: InputNodeConfig | ToolNodeConfig | PromptNodeConfig;
}

export interface WorkflowCreate {
  name: string;
  nodes: WorkflowNode[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  updated_at: string;
}

export interface WorkflowRead {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  created_at: string;
  updated_at: string;
}

export interface StepResult {
  node_id: string;
  type: string;
  variable: string;
  output: string;
  duration_ms: number;
  error?: string;
  tool_name?: string;
}

export interface ExecuteResponse {
  workflow_id: string;
  status: 'completed' | 'failed';
  steps: StepResult[];
}

export interface ExecuteRequest {
  input_overrides: Record<string, string>;
}
