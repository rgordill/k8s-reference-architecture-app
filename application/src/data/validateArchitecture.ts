import type { Architecture, StyleDefinition } from './types';
import { normalizeDependencies } from './types';
import {
  collectGroupNodeIds,
  directGroupNodeIds,
  groupByIdMap,
  nestedGroupCycles,
  nestedGroupIds,
} from './groupMembership';

const DEPLOY_TAGS = new Set(['deploy:helm', 'deploy:operator', 'deploy:both']);

export interface ArchitectureIssue {
  architecture: string;
  message: string;
}

/**
 * Structural invariants every architecture document must satisfy,
 * independent of a specific product or replica count.
 */
export function validateArchitecture(
  architecture: Architecture,
  styles: StyleDefinition[],
): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const name = architecture.name || '(unnamed)';
  const report = (message: string) => {
    issues.push({ architecture: name, message });
  };

  if (!architecture.name?.trim()) {
    report('missing name');
  }
  if (!architecture.description?.trim()) {
    report('missing description');
  }
  if (!Array.isArray(architecture.characteristics)) {
    report('characteristics must be a list');
  }
  if (!Array.isArray(architecture.usage)) {
    report('usage must be a list');
  }

  const deployTags = (architecture.tags ?? []).filter((t) => t.startsWith('deploy:'));
  if (deployTags.length > 1) {
    report(`expected at most one deploy:* tag, found ${deployTags.join(', ')}`);
  }
  for (const tag of deployTags) {
    if (!DEPLOY_TAGS.has(tag)) {
      report(`unknown deploy tag ${tag}; use deploy:helm, deploy:operator, or deploy:both`);
    }
  }

  const diagram = architecture.diagram;
  if (!diagram) {
    report('missing diagram');
    return issues;
  }

  const nodes = diagram.nodes ?? [];
  const groups = diagram.groups ?? [];
  const edges = diagram.edges ?? [];
  const styleById = new Map(styles.map((s) => [s.id, s]));

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id) {
      report('node is missing id');
      continue;
    }
    if (nodeIds.has(node.id)) {
      report(`duplicate node id ${node.id}`);
    }
    nodeIds.add(node.id);
    if (!node.name?.trim()) {
      report(`node ${node.id} is missing name`);
    }
    if (!node.style) {
      report(`node ${node.id} is missing style`);
    } else if (!styleById.has(node.style)) {
      report(`node ${node.id} references unknown style ${node.style}`);
    }
  }

  const groupIds = new Set<string>();
  for (const group of groups) {
    if (!group.id) {
      report('group is missing id');
      continue;
    }
    if (groupIds.has(group.id)) {
      report(`duplicate group id ${group.id}`);
    }
    if (nodeIds.has(group.id)) {
      report(`group id ${group.id} collides with a node id`);
    }
    groupIds.add(group.id);
  }

  for (const group of groups) {
    if (!group.id) {
      continue;
    }
    if (!group.name?.trim()) {
      report(`group ${group.id} is missing name`);
    }
    if (!group.style) {
      report(`group ${group.id} is missing style`);
    } else if (!styleById.has(group.style)) {
      report(`group ${group.id} references unknown style ${group.style}`);
    }
    const directNodes = directGroupNodeIds(group);
    const nested = nestedGroupIds(group);
    if (directNodes.length === 0 && nested.length === 0) {
      report(`group ${group.id} has no nodes or nested groups`);
    }
    for (const member of directNodes) {
      if (groupIds.has(member)) {
        report(
          `group ${group.id} lists ${member} under nodes; nested groups belong in groups`,
        );
      } else if (!nodeIds.has(member)) {
        report(`group ${group.id} references unknown node ${member}`);
      }
    }
    for (const childId of nested) {
      if (childId === group.id) {
        report(`group ${group.id} nests itself`);
      } else if (nodeIds.has(childId)) {
        report(
          `group ${group.id} lists node ${childId} under groups; nodes belong in nodes`,
        );
      } else if (!groupIds.has(childId)) {
        report(`group ${group.id} references unknown group ${childId}`);
      }
    }
  }

  const groupsById = groupByIdMap(groups);
  for (const cycle of nestedGroupCycles(groups)) {
    report(`group nesting cycle ${cycle.join(' -> ')}`);
  }
  for (const group of groups) {
    if (!group.id) {
      continue;
    }
    if (collectGroupNodeIds(group.id, groupsById, nodeIds).length === 0) {
      const nested = nestedGroupIds(group);
      if (nested.length > 0) {
        report(`group ${group.id} has no descendant nodes`);
      }
    }
  }

  const endpoints = new Set<string>([...nodeIds, ...groupIds]);
  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      report('edge is missing source or target');
      continue;
    }
    if (!endpoints.has(edge.source)) {
      report(`edge references unknown source ${edge.source}`);
    }
    if (!endpoints.has(edge.target)) {
      report(`edge references unknown target ${edge.target}`);
    }
    if (!edge.style) {
      report(`edge ${edge.source}->${edge.target} is missing style`);
    } else if (!styleById.has(edge.style)) {
      report(
        `edge ${edge.source}->${edge.target} references unknown style ${edge.style}`,
      );
    }
  }

  for (const dep of normalizeDependencies(architecture.dependencies)) {
    if (!dep.trim()) {
      report('empty dependency entry');
    }
  }

  return issues;
}
