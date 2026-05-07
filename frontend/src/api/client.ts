import type {
  WorkflowSummary,
  WorkflowRead,
  WorkflowCreate,
  ExecuteRequest,
  ExecuteResponse,
} from '../types/workflow';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const fetchWorkflows = () =>
  request<WorkflowSummary[]>('/workflows');

export const fetchWorkflow = (id: string) =>
  request<WorkflowRead>(`/workflows/${id}`);

export const createWorkflow = (data: WorkflowCreate) =>
  request<WorkflowRead>('/workflows', { method: 'POST', body: JSON.stringify(data) });

export const updateWorkflow = (id: string, data: WorkflowCreate) =>
  request<WorkflowRead>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteWorkflow = (id: string) =>
  request<void>(`/workflows/${id}`, { method: 'DELETE' });

export const executeWorkflow = (id: string, data: ExecuteRequest) =>
  request<ExecuteResponse>(`/workflows/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
