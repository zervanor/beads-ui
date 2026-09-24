import { describe, expect, test } from 'vitest';
import { createHierarchyView } from './hierarchy.js';

describe('views/hierarchy', () => {
  test('renders an expanded root and opens a selected issue', () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    /** @type {string[]} */
    const selected_ids = [];
    const issue_stores = {
      snapshotFor() {
        return [
          { id: 'UI-1', title: 'Root', issue_type: 'epic', status: 'open' },
          {
            id: 'UI-2',
            title: 'Child',
            issue_type: 'task',
            status: 'closed',
            dependencies: [
              {
                issue_id: 'UI-2',
                depends_on_id: 'UI-1',
                type: 'parent-child'
              }
            ]
          }
        ];
      },
      subscribeFor() {
        return () => {};
      }
    };
    const view = createHierarchyView(
      mount,
      (id) => selected_ids.push(id),
      issue_stores
    );

    view.load();

    expect(mount.querySelectorAll('.hierarchy-node')).toHaveLength(2);
    const child = /** @type {HTMLButtonElement} */ (
      mount.querySelector('[data-issue-id="UI-2"]')
    );
    child.click();
    expect(selected_ids).toEqual(['UI-2']);
  });

  test('collapses and expands a branch with its native button', () => {
    document.body.innerHTML = '<div id="mount"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));
    const issue_stores = {
      snapshotFor() {
        return [
          { id: 'UI-1', title: 'Root' },
          {
            id: 'UI-2',
            title: 'Child',
            dependencies: [
              {
                issue_id: 'UI-2',
                depends_on_id: 'UI-1',
                type: 'parent-child'
              }
            ]
          }
        ];
      },
      subscribeFor() {
        return () => {};
      }
    };
    const view = createHierarchyView(mount, () => {}, issue_stores);

    view.load();

    const toggle = /** @type {HTMLButtonElement} */ (
      mount.querySelector('.hierarchy-node__toggle')
    );
    toggle.click();
    expect(mount.querySelectorAll('.hierarchy-node')).toHaveLength(1);
    toggle.click();
    expect(mount.querySelectorAll('.hierarchy-node')).toHaveLength(2);
  });
});
