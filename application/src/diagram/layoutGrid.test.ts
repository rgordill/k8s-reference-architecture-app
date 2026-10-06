import { describe, expect, it } from 'vitest';
import { architectureRepository } from '../data';
import { computeGridLayout, computeLayers } from './layoutGrid';

describe('computeLayers', () => {
  it('places roots above dependents', () => {
    const layers = computeLayers(
      [
        { id: 'op', name: 'Op', style: 'a' },
        { id: 'cm', name: 'CM', style: 'a' },
        { id: 'wh', name: 'WH', style: 'a' },
      ],
      [
        { source: 'op', target: 'wh', style: 'e' },
        { source: 'op', target: 'cm', style: 'e' },
        { source: 'wh', target: 'cm', style: 'e' },
      ],
    );
    expect(layers[0]).toEqual(['op']);
    expect(layers[1]).toEqual(['wh']);
    expect(layers[2]).toEqual(['cm']);
  });
});

describe('computeGridLayout', () => {
  it('places zone members in columns left-to-right and storage below apps', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'app-0', name: 'App-0', style: 'app' },
        { id: 'app-1', name: 'App-1', style: 'app' },
        { id: 'storage-0', name: 'Storage-0', style: 'storage' },
        { id: 'storage-1', name: 'Storage-1', style: 'storage' },
      ],
      groups: [
        { id: 'zone-0', name: 'Zone-0', nodes: ['app-0', 'storage-0'] },
        { id: 'zone-1', name: 'Zone-1', nodes: ['app-1', 'storage-1'] },
        { id: 'group-app', name: 'Apps', nodes: ['app-0', 'app-1'] },
      ],
      edges: [
        { source: 'app-0', target: 'storage-0', style: 'e' },
        { source: 'app-1', target: 'storage-1', style: 'e' },
      ],
    });

    const a0 = layout.positions.get('app-0')!;
    const a1 = layout.positions.get('app-1')!;
    const s0 = layout.positions.get('storage-0')!;
    expect(a0.x).toBeLessThan(a1.x);
    expect(a0.y).toBeLessThan(s0.y);
    expect(a0.x).toBeCloseTo(s0.x, 0);
    expect(layout.groupBoxes.some((b) => b.id === 'zone-0' && b.kind === 'zone')).toBe(
      true,
    );
    expect(layout.groupBoxes.some((b) => b.id === 'group-app' && b.kind === 'role')).toBe(
      true,
    );
  });

  it('stacks hierarchical graphs top-to-bottom when there are no zones', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'root', name: 'Root', style: 'a' },
        { id: 'leaf', name: 'Leaf', style: 'a' },
      ],
      edges: [{ source: 'root', target: 'leaf', style: 'e' }],
    });
    expect(layout.positions.get('root')!.y).toBeLessThan(
      layout.positions.get('leaf')!.y,
    );
  });

  it('assigns a grid position to every node in every catalog architecture', async () => {
    const summaries = await architectureRepository.list();
    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries) {
      const arch = await architectureRepository.get(summary.name);
      expect(arch).not.toBeNull();
      const layout = computeGridLayout(arch!.diagram);
      for (const node of arch!.diagram.nodes) {
        const pos = layout.positions.get(node.id);
        expect(pos, `${arch!.name} missing position for ${node.id}`).toBeDefined();
        expect(Number.isFinite(pos!.x)).toBe(true);
        expect(Number.isFinite(pos!.y)).toBe(true);
      }
      for (const group of arch!.diagram.groups ?? []) {
        expect(
          layout.groupBoxes.some((box) => box.id === group.id),
          `${arch!.name} missing box for group ${group.id}`,
        ).toBe(true);
      }
    }
  });
});
