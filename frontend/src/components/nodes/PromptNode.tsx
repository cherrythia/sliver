import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkflowStore } from '../../store/workflowStore';
import type { WorkflowNode, PromptNodeConfig } from '../../types/workflow';

interface Props {
  node: WorkflowNode;
  availableVars: string[];
  errors: string[];
}

export function PromptNode({ node, availableVars, errors }: Props) {
  const { removeNode, updateNodeConfig } = useWorkflowStore();
  const cfg = node.config as PromptNodeConfig;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const insertVar = (v: string) => {
    updateNodeConfig(node.id, {
      prompt_template: (cfg.prompt_template || '') + `{{${v}}}`,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: `2px solid ${errors.length ? '#ef4444' : '#f59e0b'}`,
        borderRadius: 6,
        padding: '10px 12px',
        background: '#fffbeb',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#94a3b8' }}>⠿</span>
          <span style={{ background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>PROMPT</span>
        </span>
        <button onClick={() => removeNode(node.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
      </div>
      {availableVars.length > 0 && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Insert:{' '}
          {availableVars.map((v) => (
            <button
              key={v}
              onClick={() => insertVar(v)}
              style={{
                marginLeft: 4,
                background: '#fef9c3',
                border: '1px solid #fcd34d',
                borderRadius: 3,
                padding: '1px 6px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >{`{{${v}}}`}</button>
          ))}
        </div>
      )}
      <textarea
        value={cfg.prompt_template}
        onChange={(e) => updateNodeConfig(node.id, { prompt_template: e.target.value })}
        rows={3}
        placeholder="Write your prompt here. Use {{variable_name}} to inject values from previous nodes."
        style={{
          width: '100%',
          border: '1px solid #cbd5e1',
          borderRadius: 4,
          padding: '4px 6px',
          fontSize: 13,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 4 }}>
        <label>→ Output var:</label>
        <input
          value={cfg.output_variable}
          onChange={(e) => updateNodeConfig(node.id, { output_variable: e.target.value })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 130 }}
          placeholder="output_var"
        />
      </div>
      {errors.map((e, i) => (
        <p key={i} style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{e}</p>
      ))}
    </div>
  );
}
