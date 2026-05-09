import type { ExecuteResponse } from '../types/workflow';

interface Props {
  result: ExecuteResponse;
  onClose: () => void;
}

const stepBg: Record<string, string> = {
  input: '#eff6ff',
  tool: '#f0fdf4',
  prompt: '#fffbeb',
};

export function ExecutionViewer({ result, onClose }: Props) {
  return (
    <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>
          <strong>Execution Result</strong>{' '}
          <span style={{
            background: result.status === 'completed' ? '#dcfce7' : '#fee2e2',
            color: result.status === 'completed' ? '#166534' : '#991b1b',
            borderRadius: 4,
            padding: '1px 8px',
            fontSize: 12,
          }}>{result.status}</span>
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
      {result.steps.map((step, i) => (
        <div key={step.node_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div style={{
            background: stepBg[step.type] ?? '#f8fafc',
            padding: '6px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
          }}>
            <span>
              <strong>{i + 1}. {step.type.toUpperCase()}</strong>
              {step.tool_name && <span style={{ color: '#64748b' }}> — {step.tool_name}</span>}
              {' → '}<code>{step.variable}</code>
              {' '}
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{step.duration_ms}ms</span>
            </span>
            <span>{step.error ? '✗' : '✓'}</span>
          </div>
          <div style={{
            padding: '6px 14px',
            background: '#f8fafc',
            fontSize: 12,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: 160,
            overflowY: 'auto',
          }}>
            {step.error
              ? <span style={{ color: '#dc2626' }}>{step.error}</span>
              : step.output}
          </div>
        </div>
      ))}
    </div>
  );
}
