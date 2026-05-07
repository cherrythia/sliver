import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../api/client';
import type {
  WorkflowNode,
  NodeType,
  ExecuteResponse,
  InputNodeConfig,
  ToolNodeConfig,
  PromptNodeConfig,
} from '../types/workflow';

const defaultConfig = (type: NodeType): InputNodeConfig | ToolNodeConfig | PromptNodeConfig => {
  if (type === 'input') return { variable_name: 'my_var', default_value: '' };
  if (type === 'tool') return { tool_name: 'query_subway_db', input_variable: '', output_variable: 'tool_result' };
  return { prompt_template: '', output_variable: 'llm_result' };
};

interface WorkflowState {
  nodes: WorkflowNode[];
  workflowId: string | null;
  workflowName: string;
  isDirty: boolean;
  executionResult: ExecuteResponse | null;
  isExecuting: boolean;
  setWorkflow: (id: string, name: string, nodes: WorkflowNode[]) => void;
  addNode: (type: NodeType) => void;
  removeNode: (id: string) => void;
  reorderNodes: (oldIndex: number, newIndex: number) => void;
  updateNodeConfig: (id: string, patch: Partial<InputNodeConfig & ToolNodeConfig & PromptNodeConfig>) => void;
  setWorkflowName: (name: string) => void;
  saveWorkflow: () => Promise<void>;
  executeWorkflow: (overrides?: Record<string, string>) => Promise<void>;
  clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,
  executionResult: null,
  isExecuting: false,

  setWorkflow: (id, name, nodes) =>
    set({ workflowId: id, workflowName: name, nodes, isDirty: false }),

  addNode: (type) =>
    set((s) => {
      const newNode: WorkflowNode = {
        id: uuidv4(),
        type,
        order: s.nodes.length,
        config: defaultConfig(type),
      };
      return { nodes: [...s.nodes, newNode], isDirty: true };
    }),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes
        .filter((n) => n.id !== id)
        .map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    })),

  reorderNodes: (oldIndex, newIndex) =>
    set((s) => ({
      nodes: arrayMove(s.nodes, oldIndex, newIndex).map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    })),

  updateNodeConfig: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, config: { ...n.config, ...patch } } : n
      ),
      isDirty: true,
    })),

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  saveWorkflow: async () => {
    const { workflowId, workflowName, nodes } = get();
    const payload = { name: workflowName, nodes };
    if (workflowId) {
      await api.updateWorkflow(workflowId, payload);
    } else {
      const created = await api.createWorkflow(payload);
      set({ workflowId: created.id });
    }
    set({ isDirty: false });
  },

  executeWorkflow: async (overrides = {}) => {
    const { workflowId } = get();
    if (!workflowId) return;
    set({ isExecuting: true, executionResult: null });
    try {
      const result = await api.executeWorkflow(workflowId, { input_overrides: overrides });
      set({ executionResult: result });
    } finally {
      set({ isExecuting: false });
    }
  },

  clearExecution: () => set({ executionResult: null }),
}));
