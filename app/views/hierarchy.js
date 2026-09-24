import { html, render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat.js';
import { buildIssueHierarchy } from '../data/hierarchy.js';
import { createPriorityBadge } from '../utils/priority-badge.js';
import { createStatusBadge } from '../utils/status-badge.js';
import { createTypeBadge } from '../utils/type-badge.js';

/**
 * @typedef {{ issue: { id: string, title?: string, issue_type?: string, status?: string, priority?: number }, children: HierarchyNode[] }} HierarchyNode
 */

/**
 * Render the parent-child hierarchy from the full-issue subscription.
 *
 * @param {HTMLElement} mount_element
 * @param {(id: string) => void} goto_issue
 * @param {{ snapshotFor?: (client_id: string) => any[], subscribeFor?: (client_ids: string | string[], fn: (client_id: string) => void) => () => void }} [issue_stores]
 * @returns {{ load: () => void }}
 */
export function createHierarchyView(
  mount_element,
  goto_issue,
  issue_stores = undefined
) {
  /** @type {HierarchyNode[]} */
  let roots = [];
  /** @type {Set<string>} */
  const expanded = new Set();

  if (issue_stores?.subscribeFor) {
    issue_stores.subscribeFor('tab:hierarchy', () => {
      load();
    });
  }

  /** Render the current tree. */
  function doRender() {
    render(template(), mount_element);
  }

  function template() {
    if (roots.length === 0) {
      return html`<div class="panel__header muted">No issues found.</div>`;
    }
    return html`
      <section class="hierarchy-root" aria-label="Issue hierarchy">
        <div class="hierarchy-root__header">
          <h1>Hierarchy</h1>
          <span class="muted">Parent tasks and their child tasks</span>
        </div>
        <ul class="hierarchy-tree" role="tree">
          ${repeat(
            roots,
            (node) => node.issue.id,
            (node) => nodeTemplate(node, 1)
          )}
        </ul>
      </section>
    `;
  }

  /**
   * @param {HierarchyNode} node
   * @param {number} depth
   * @returns {import('lit-html').TemplateResult}
   */
  function nodeTemplate(node, depth) {
    const issue = node.issue;
    const id = issue.id;
    const has_children = node.children.length > 0;
    const is_expanded = expanded.has(id);
    return html`
      <li class="hierarchy-node" role="treeitem" aria-level=${depth}>
        <div class="hierarchy-node__row">
          ${has_children
            ? html`<button
                class="hierarchy-node__toggle"
                type="button"
                aria-label=${is_expanded ? `Collapse ${id}` : `Expand ${id}`}
                aria-expanded=${is_expanded}
                @click=${() => toggle(id)}
              >
                ${is_expanded ? '▾' : '▸'}
              </button>`
            : html`<span
                class="hierarchy-node__spacer"
                aria-hidden="true"
              ></span>`}
          <button
            class="hierarchy-node__issue"
            type="button"
            data-issue-id=${id}
            @click=${() => goto_issue(id)}
          >
            <span class="mono hierarchy-node__id">${id}</span>
            <span class="hierarchy-node__title"
              >${issue.title || '(no title)'}</span
            >
            ${createTypeBadge(issue.issue_type)}
            ${createStatusBadge(issue.status)}
            ${createPriorityBadge(issue.priority)}
          </button>
        </div>
        ${has_children && is_expanded
          ? html`<ul role="group">
              ${repeat(
                node.children,
                (child) => child.issue.id,
                (child) => nodeTemplate(child, depth + 1)
              )}
            </ul>`
          : null}
      </li>
    `;
  }

  /**
   * @param {string} id
   */
  function toggle(id) {
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    doRender();
  }

  /** Refresh the tree from the subscription snapshot. */
  function load() {
    const issues = issue_stores?.snapshotFor
      ? issue_stores.snapshotFor('tab:hierarchy')
      : [];
    roots = buildIssueHierarchy(issues);
    for (const root of roots) {
      expanded.add(root.issue.id);
    }
    doRender();
  }

  return { load };
}
