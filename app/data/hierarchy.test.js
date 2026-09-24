import { describe, expect, test } from 'vitest';
import { buildIssueHierarchy } from './hierarchy.js';

describe('data/hierarchy', () => {
  test('nests a child beneath its parent', () => {
    const roots = buildIssueHierarchy([
      { id: 'UI-1', title: 'Root', priority: 1 },
      {
        id: 'UI-2',
        title: 'Child',
        priority: 2,
        dependencies: [
          { issue_id: 'UI-2', depends_on_id: 'UI-1', type: 'parent-child' }
        ]
      }
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].issue.id).toBe('UI-1');
    expect(roots[0].children[0].issue.id).toBe('UI-2');
  });

  test('ignores non-hierarchical dependencies', () => {
    const roots = buildIssueHierarchy([
      { id: 'UI-1', priority: 1 },
      { id: 'UI-2', priority: 2 },
      {
        id: 'UI-3',
        priority: 3,
        dependencies: [
          { issue_id: 'UI-3', depends_on_id: 'UI-2', type: 'blocks' },
          { issue_id: 'UI-3', depends_on_id: 'UI-1', type: 'parent-child' }
        ]
      }
    ]);

    expect(roots.map((node) => node.issue.id)).toEqual(['UI-1', 'UI-2']);
    expect(roots[0].children.map((node) => node.issue.id)).toEqual(['UI-3']);
    expect(roots[1].children).toEqual([]);
  });

  test('breaks parent-child cycles while retaining every issue', () => {
    const roots = buildIssueHierarchy([
      {
        id: 'UI-1',
        dependencies: [
          { issue_id: 'UI-1', depends_on_id: 'UI-2', type: 'parent-child' }
        ]
      },
      {
        id: 'UI-2',
        dependencies: [
          { issue_id: 'UI-2', depends_on_id: 'UI-1', type: 'parent-child' }
        ]
      }
    ]);

    expect(roots).toHaveLength(1);
    expect(roots[0].issue.id).toBe('UI-2');
    expect(roots[0].children[0].issue.id).toBe('UI-1');
  });
});
