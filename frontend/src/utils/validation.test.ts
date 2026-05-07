import { describe, it, expect } from 'vitest';
import { getValidationErrors } from './validation';
import type { WorkflowNode } from '../types/workflow';

describe('getValidationErrors', () => {
  it('returns no errors for a valid pipeline', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'input', order: 0, config: { variable_name: 'q', default_value: '' } },
      { id: '2', type: 'tool', order: 1, config: { tool_name: 'query_subway_db', input_variable: 'q', output_variable: 'results' } },
      { id: '3', type: 'prompt', order: 2, config: { prompt_template: 'Summarize: {{q}} and {{results}}', output_variable: 'answer' } },
    ];
    expect(getValidationErrors(nodes)).toEqual({});
  });

  it('flags a tool node referencing an undefined variable', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'tool', order: 0, config: { tool_name: 'query_subway_db', input_variable: 'undefined_var', output_variable: 'out' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['1']).toBeDefined();
    expect(errors['1'][0]).toContain('undefined_var');
  });

  it('flags a prompt node referencing a variable not yet defined', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'prompt', order: 0, config: { prompt_template: 'Hello {{missing}}', output_variable: 'out' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['1']).toBeDefined();
    expect(errors['1'][0]).toContain('missing');
  });

  it('does not flag a prompt referencing a variable defined by a prior node', () => {
    const nodes: WorkflowNode[] = [
      { id: '1', type: 'input', order: 0, config: { variable_name: 'q', default_value: '' } },
      { id: '2', type: 'prompt', order: 1, config: { prompt_template: 'Answer {{q}}', output_variable: 'out' } },
    ];
    expect(getValidationErrors(nodes)).toEqual({});
  });

  it('flags reordering that breaks a dependency', () => {
    const nodes: WorkflowNode[] = [
      { id: '2', type: 'prompt', order: 0, config: { prompt_template: '{{q}}', output_variable: 'out' } },
      { id: '1', type: 'input', order: 1, config: { variable_name: 'q', default_value: '' } },
    ];
    const errors = getValidationErrors(nodes);
    expect(errors['2']).toBeDefined();
  });
});
