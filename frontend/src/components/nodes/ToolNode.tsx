import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, ToolNodeConfig } from '../../types/workflow';

const AVAILABLE_TOOLS = ['query_subway_db', 'calculate_average_delay'];

interface Props {
  node: WorkflowNode;
  availableVars: string[];
  errors: string[];
}

export function ToolNode({ node, availableVars, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as ToolNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#10b981'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#f0fdf4',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>TOOL</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <label>Tool:</label>
        <select
          value={cfg.tool_name}
          onChange={(e) => updateNodeConfig(node.id, { tool_name: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 4px' }}
        >
          {AVAILABLE_TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label>Input:</label>
        <select
          value={cfg.input_variable}
          onChange={(e) => updateNodeConfig(node.id, { input_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 4px' }}
        >
          <option value="">-- select variable --</option>
          {availableVars.map((v) => <option key={v} value={v}>{`{{${v}}}`}</option>)}
        </select>
        <label>→ Output var:</label>
        <input
          value={cfg.output_variable}
          onChange={(e) => updateNodeConfig(node.id, { output_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 120 }}
          placeholder="output_var"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
