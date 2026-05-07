import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from './workflowStore';

const reset = () =>
  useWorkflowStore.setState({
    nodes: [],
    workflowId: null,
    workflowName: 'Untitled',
    isDirty: false,
    executionResult: null,
    isExecuting: false,
  });

describe('workflowStore', () => {
  beforeEach(reset);

  it('addNode appends a node with correct type', () => {
    useWorkflowStore.getState().addNode('input');
    const { nodes } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('input');
    expect(nodes[0].id).toBeTruthy();
  });

  it('addNode sets isDirty', () => {
    useWorkflowStore.getState().addNode('prompt');
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it('removeNode removes by id', () => {
    useWorkflowStore.getState().addNode('input');
    const id = useWorkflowStore.getState().nodes[0].id;
    useWorkflowStore.getState().removeNode(id);
    expect(useWorkflowStore.getState().nodes).toHaveLength(0);
  });

  it('reorderNodes swaps nodes', () => {
    useWorkflowStore.getState().addNode('input');
    useWorkflowStore.getState().addNode('tool');
    useWorkflowStore.getState().reorderNodes(0, 1);
    const { nodes } = useWorkflowStore.getState();
    expect(nodes[0].type).toBe('tool');
    expect(nodes[1].type).toBe('input');
  });

  it('reorderNodes updates order fields', () => {
    useWorkflowStore.getState().addNode('input');
    useWorkflowStore.getState().addNode('tool');
    useWorkflowStore.getState().reorderNodes(0, 1);
    const { nodes } = useWorkflowStore.getState();
    expect(nodes[0].order).toBe(0);
    expect(nodes[1].order).toBe(1);
  });

  it('updateNodeConfig merges config patch', () => {
    useWorkflowStore.getState().addNode('input');
    const id = useWorkflowStore.getState().nodes[0].id;
    useWorkflowStore.getState().updateNodeConfig(id, { variable_name: 'foo' });
    const node = useWorkflowStore.getState().nodes[0];
    expect((node.config as any).variable_name).toBe('foo');
  });
});
