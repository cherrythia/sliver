import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, InputNodeConfig } from '../../types/workflow';

interface Props {
  node: WorkflowNode;
  errors: string[];
}

export function InputNode({ node, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as InputNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#3b82f6'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#eff6ff',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>INPUT</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <label>Variable:</label>
        <input
          value={cfg.variable_name}
          onChange={(e) => updateNodeConfig(node.id, { variable_name: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 130 }}
          placeholder="variable_name"
        />
        <label>Default value:</label>
        <input
          value={cfg.default_value}
          onChange={(e) => updateNodeConfig(node.id, { default_value: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', flex: 1, minWidth: 200 }}
          placeholder="Default value"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
