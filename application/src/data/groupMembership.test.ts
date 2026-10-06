import { describe, expect, it } from 'vitest';
import {
  collectGroupNodeIds,
  groupByIdMap,
  nestedGroupCycles,
} from './groupMembership';
import type { DiagramGroup } from './types';

const groups: DiagramGroup[] = [
  { id: 'leaf-a', name: 'A', nodes: ['a'] },
  { id: 'leaf-b', name: 'B', nodes: ['b'] },
  { id: 'parent', name: 'P', groups: ['leaf-a', 'leaf-b'], nodes: ['c'] },
];

describe('collectGroupNodeIds', () => {
  it('includes direct nodes and descendants of nested groups', () => {
    const ids = collectGroupNodeIds(
      'parent',
      groupByIdMap(groups),
      new Set(['a', 'b', 'c']),
    );
    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('nestedGroupCycles', () => {
  it('detects a nesting cycle', () => {
    const cyclic: DiagramGroup[] = [
      { id: 'a', name: 'A', groups: ['b'] },
      { id: 'b', name: 'B', groups: ['a'] },
    ];
    const cycles = nestedGroupCycles(cyclic);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0].join('->')).toMatch(/a|b/);
  });
});
