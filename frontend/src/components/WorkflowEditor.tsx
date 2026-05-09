import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkflowStore } from '../store/workflowStore';
import { getValidationErrors, availableVarsAt } from '../utils/validation';
import { InputNode } from './nodes/InputNode';
import { ToolNode } from './nodes/ToolNode';
import { PromptNode } from './nodes/PromptNode';
import { ExecutionViewer } from './ExecutionViewer';
import * as api from '../api/client';

export function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    nodes,
    workflowId,
    workflowName,
    isDirty,
    isExecuting,
    executionResult,
    setWorkflow,
    setWorkflowName,
    addNode,
    reorderNodes,
    saveWorkflow,
    executeWorkflow,
    clearExecution,
  } = useWorkflowStore();

  useEffect(() => {
    if (id && id !== 'new') {
      api.fetchWorkflow(id).then((wf) => setWorkflow(wf.id, wf.name, wf.nodes));
    }
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const validationErrors = getValidationErrors(nodes);
  const hasErrors = Object.keys(validationErrors).length > 0;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = nodes.findIndex((n) => n.id === active.id);
      const newIndex = nodes.findIndex((n) => n.id === over.id);
      reorderNodes(oldIndex, newIndex);
    }
  }

  const handleSave = async () => {
    await saveWorkflow();
    const newId = useWorkflowStore.getState().workflowId;
    if (!workflowId && newId) {
      navigate(`/workflows/${newId}/edit`, { replace: true });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 20px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
        >← Back</button>
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 10px', fontSize: 16, fontWeight: 600, width: 280 }}
        />
        <span style={{ flex: 1 }} />
        {hasErrors && (
          <span style={{ color: '#ef4444', fontSize: 13 }}>⚠ Fix validation errors before executing</span>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty}
          style={{
            background: isDirty ? '#3b82f6' : '#cbd5e1',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '6px 14px',
            cursor: isDirty ? 'pointer' : 'default',
          }}
        >💾 Save{isDirty ? ' *' : ''}</button>
        <button
          onClick={() => executeWorkflow()}
          disabled={isExecuting || hasErrors || !workflowId}
          style={{
            background: isExecuting || hasErrors || !workflowId ? '#94a3b8' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '6px 14px',
            cursor: isExecuting || hasErrors || !workflowId ? 'default' : 'pointer',
          }}
        >{isExecuting ? 'Running...' : '▶ Execute'}</button>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)' }}>
        <aside style={{ width: 140, borderRight: '1px solid #e2e8f0', padding: 12, background: 'white' }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            Add Node
          </div>
          {(['input', 'tool', 'prompt'] as const).map((type) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: 6,
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                background: type === 'input' ? '#dbeafe' : type === 'tool' ? '#d1fae5' : '#fef3c7',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
              }}
            >+ {type.charAt(0).toUpperCase() + type.slice(1)}</button>
          ))}
        </aside>

        <main style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={nodes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {nodes.map((node, index) => {
                const errors = validationErrors[node.id] ?? [];
                const avail = availableVarsAt(nodes, index);
                if (node.type === 'input') return <InputNode key={node.id} node={node} errors={errors} />;
                if (node.type === 'tool') return <ToolNode key={node.id} node={node} availableVars={avail} errors={errors} />;
                if (node.type === 'prompt') return <PromptNode key={node.id} node={node} availableVars={avail} errors={errors} />;
                return null;
              })}
            </SortableContext>
          </DndContext>
          {nodes.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 60 }}>
              Add nodes from the left panel to build your workflow.
            </p>
          )}
          {executionResult && (
            <ExecutionViewer result={executionResult} onClose={clearExecution} />
          )}
        </main>
      </div>
    </div>
  );
}
