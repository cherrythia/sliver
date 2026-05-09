import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkflowList } from './components/WorkflowList';
import { WorkflowEditor } from './components/WorkflowEditor';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkflowList />} />
        <Route path="/workflows/new" element={<WorkflowEditor />} />
        <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
