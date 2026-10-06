import type { DiagramGroup } from './types';

export function groupByIdMap(groups: DiagramGroup[]): Map<string, DiagramGroup> {
  return new Map(groups.map((group) => [group.id, group]));
}

/**
 * Direct node ids listed on a group (not including nested groups).
 */
export function directGroupNodeIds(group: DiagramGroup): string[] {
  return group.nodes ?? [];
}

/**
 * Nested group ids listed on a group.
 */
export function nestedGroupIds(group: DiagramGroup): string[] {
  return group.groups ?? [];
}

/**
 * Node ids belonging to a group, including descendants of nested groups.
 * Cycles yield an empty expansion for the looping group and are reported
 * separately by validation.
 */
export function collectGroupNodeIds(
  groupId: string,
  groupsById: Map<string, DiagramGroup>,
  nodeIds: Set<string>,
  visiting: Set<string> = new Set(),
): string[] {
  if (visiting.has(groupId)) {
    return [];
  }
  const group = groupsById.get(groupId);
  if (!group) {
    return [];
  }
  visiting.add(groupId);
  const collected = new Set<string>();
  for (const id of directGroupNodeIds(group)) {
    if (nodeIds.has(id)) {
      collected.add(id);
    }
  }
  for (const childId of nestedGroupIds(group)) {
    for (const id of collectGroupNodeIds(childId, groupsById, nodeIds, visiting)) {
      collected.add(id);
    }
  }
  visiting.delete(groupId);
  return Array.from(collected);
}

export function collectAllGroupNodeIds(
  groups: DiagramGroup[],
  nodeIds: Set<string>,
): Map<string, string[]> {
  const groupsById = groupByIdMap(groups);
  const result = new Map<string, string[]>();
  for (const group of groups) {
    result.set(group.id, collectGroupNodeIds(group.id, groupsById, nodeIds));
  }
  return result;
}

/**
 * Returns group ids that participate in a nesting cycle (A → … → A).
 */
export function nestedGroupCycles(groups: DiagramGroup[]): string[][] {
  const groupsById = groupByIdMap(groups);
  const cycles: string[][] = [];
  const seen = new Set<string>();

  function visit(id: string, stack: string[]): void {
    if (stack.includes(id)) {
      cycles.push([...stack.slice(stack.indexOf(id)), id]);
      return;
    }
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    const group = groupsById.get(id);
    if (!group) {
      return;
    }
    stack.push(id);
    for (const childId of nestedGroupIds(group)) {
      visit(childId, stack);
    }
    stack.pop();
  }

  for (const group of groups) {
    visit(group.id, []);
  }
  return cycles;
}
