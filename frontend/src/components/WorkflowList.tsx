import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import type { WorkflowSummary } from '../types/workflow';

export function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchWorkflows().then(setWorkflows).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    await api.deleteWorkflow(id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Workflow Builder</h1>
        <button
          onClick={() => navigate('/workflows/new')}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
        >+ New Workflow</button>
      </div>
      {workflows.length === 0 && <p style={{ color: '#64748b' }}>No workflows yet. Create one!</p>}
      {workflows.map((wf) => (
        <div key={wf.id} style={{
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '12px 16px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <strong>{wf.name}</strong>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Updated {new Date(wf.updated_at).toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/workflows/${wf.id}/edit`)}
              style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
            >Edit</button>
            <button
              onClick={() => handleDelete(wf.id)}
              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
            >Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
