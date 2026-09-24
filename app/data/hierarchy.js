import { cmpPriorityThenCreated } from './sort.js';

/**
 * @import { Status } from '../protocol.js'
 */

/**
 * @typedef {{ issue_id?: string, depends_on_id?: string, type?: string }} Dependency
 */

/**
 * @typedef {{ id: string, title?: string, issue_type?: string, status?: Status, parent_id?: string, parent?: string, dependencies?: Dependency[], priority?: number, created_at?: number }} HierarchyIssue
 */

/**
 * @typedef {{ issue: HierarchyIssue, children: HierarchyNode[], relation: string | null }} HierarchyNode
 */

/**
/**
 * Find the real parent for an issue. A hierarchy is not a dependency graph:
 * `blocks`, `related`, and `discovered-from` edges deliberately do not affect
 * tree placement. Beads returns the same parent through the direct `parent`
 * field and through a `parent-child` dependency edge.
 *
 * @param {HierarchyIssue} issue
 * @returns {Array<{ id: string, relation: string, priority: number }>}
 */
function parentCandidates(issue) {
  /** @type {Array<{ id: string, relation: string, priority: number }>} */
  const candidates = [];
  const explicit_parent = String(issue.parent_id || issue.parent || '').trim();
  if (explicit_parent) {
    candidates.push({
      id: explicit_parent,
      relation: 'parent-child',
      priority: -1
    });
  }
  const dependencies = Array.isArray(issue.dependencies)
    ? issue.dependencies
    : [];
  for (const dependency of dependencies) {
    const id = String(dependency?.depends_on_id || '').trim();
    if (!id || id === issue.id) {
      continue;
    }
    if (dependency?.type !== 'parent-child') {
      continue;
    }
    candidates.push({ id, relation: 'parent-child', priority: 0 });
  }
  return candidates.sort(
    (left, right) =>
      left.priority - right.priority || left.id.localeCompare(right.id)
  );
}

/**
 * Determine whether setting child -> parent would form a cycle in the
 * selected single-parent tree.
 *
 * @param {string} child_id
 * @param {string} parent_id
 * @param {Map<string, string>} parent_by_child
 * @returns {boolean}
 */
function createsCycle(child_id, parent_id, parent_by_child) {
  /** @type {Set<string>} */
  const visited = new Set([child_id]);
  let current_id = parent_id;
  while (current_id) {
    if (visited.has(current_id)) {
      return true;
    }
    visited.add(current_id);
    current_id = parent_by_child.get(current_id) || '';
  }
  return false;
}

/**
 * Build a deterministic parent-child forest. An issue with duplicate parent
 * representations is placed once, and cyclic edges are ignored.
 *
 * @param {HierarchyIssue[]} issues
 * @returns {HierarchyNode[]}
 */
export function buildIssueHierarchy(issues) {
  /** @type {Map<string, HierarchyIssue>} */
  const issues_by_id = new Map();
  for (const issue of issues) {
    if (issue && typeof issue.id === 'string' && issue.id.length > 0) {
      issues_by_id.set(issue.id, issue);
    }
  }
  const ordered_issues = Array.from(issues_by_id.values()).sort(
    cmpPriorityThenCreated
  );
  /** @type {Map<string, string>} */
  const parent_by_child = new Map();
  /** @type {Map<string, string>} */
  const relation_by_child = new Map();

  for (const issue of ordered_issues) {
    for (const candidate of parentCandidates(issue)) {
      if (!issues_by_id.has(candidate.id)) {
        continue;
      }
      if (createsCycle(issue.id, candidate.id, parent_by_child)) {
        continue;
      }
      parent_by_child.set(issue.id, candidate.id);
      relation_by_child.set(issue.id, candidate.relation);
      break;
    }
  }

  /** @type {Map<string, HierarchyNode>} */
  const nodes_by_id = new Map();
  for (const issue of ordered_issues) {
    nodes_by_id.set(issue.id, {
      issue,
      children: [],
      relation: relation_by_child.get(issue.id) || null
    });
  }
  /** @type {HierarchyNode[]} */
  const roots = [];
  for (const issue of ordered_issues) {
    const node = nodes_by_id.get(issue.id);
    if (!node) {
      continue;
    }
    const parent_id = parent_by_child.get(issue.id);
    const parent = parent_id ? nodes_by_id.get(parent_id) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
