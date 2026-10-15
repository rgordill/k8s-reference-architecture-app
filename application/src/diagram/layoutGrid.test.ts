import { describe, expect, it } from 'vitest';
import { architectureRepository } from '../data';
import {
  computeGridLayout,
  computeLayers,
  nearestGroupSideCenter,
  resolveEdgeEndpoints,
  type GroupBox,
} from './layoutGrid';
import { collectGroupNodeIds, groupByIdMap } from '../data/groupMembership';

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

  it('treats an edge to a nested group as edges to every descendant node', () => {
    const layers = computeLayers(
      [
        { id: 'op', name: 'Op', style: 'a' },
        { id: 'cm', name: 'CM', style: 'a' },
        { id: 'wh', name: 'WH', style: 'a' },
      ],
      [{ source: 'op', target: 'operands', style: 'e' }],
      [
        { id: 'controllers', name: 'Controllers', nodes: ['cm'] },
        { id: 'webhooks', name: 'Webhooks', nodes: ['wh'] },
        { id: 'operands', name: 'Operands', groups: ['controllers', 'webhooks'] },
      ],
    );
    expect(layers[0]).toEqual(['op']);
    expect(layers[1].sort()).toEqual(['cm', 'wh']);
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

    const zone0 = layout.groupBoxes.find((b) => b.id === 'zone-0')!;
    const apps = layout.groupBoxes.find((b) => b.id === 'group-app')!;
    expect(zone0.orientation).toBe('vertical');
    expect(apps.orientation).toBe('horizontal');
    expect(apps.height).toBeLessThan(zone0.height);
    expect(zone0.width).toBeLessThan(apps.width);
  });

  it('places same role-group peers side-by-side inside a zone', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'postgresql-0', name: 'PostgreSQL-0', style: 'postgresql' },
        { id: 'csi-block-storage-data-0', name: 'Data', style: 'csi-block-storage' },
        { id: 'csi-block-storage-wal-0', name: 'WAL', style: 'csi-block-storage' },
        { id: 'postgresql-1', name: 'PostgreSQL-1', style: 'postgresql' },
        { id: 'csi-block-storage-data-1', name: 'Data', style: 'csi-block-storage' },
        { id: 'csi-block-storage-wal-1', name: 'WAL', style: 'csi-block-storage' },
      ],
      groups: [
        {
          id: 'group-postgres',
          name: 'PostgreSQL',
          nodes: ['postgresql-0', 'postgresql-1'],
        },
        {
          id: 'group-csi-block-storage',
          name: 'CSI Block Storage',
          nodes: [
            'csi-block-storage-data-0',
            'csi-block-storage-data-1',
            'csi-block-storage-wal-0',
            'csi-block-storage-wal-1',
          ],
        },
        {
          id: 'zone-0',
          name: 'Zone-0',
          nodes: [
            'postgresql-0',
            'csi-block-storage-data-0',
            'csi-block-storage-wal-0',
          ],
        },
        {
          id: 'zone-1',
          name: 'Zone-1',
          nodes: [
            'postgresql-1',
            'csi-block-storage-data-1',
            'csi-block-storage-wal-1',
          ],
        },
      ],
      edges: [
        { source: 'postgresql-0', target: 'csi-block-storage-data-0', style: 'e' },
        { source: 'postgresql-0', target: 'csi-block-storage-wal-0', style: 'e' },
        { source: 'postgresql-1', target: 'csi-block-storage-data-1', style: 'e' },
        { source: 'postgresql-1', target: 'csi-block-storage-wal-1', style: 'e' },
      ],
    });

    const pg0 = layout.positions.get('postgresql-0')!;
    const data0 = layout.positions.get('csi-block-storage-data-0')!;
    const wal0 = layout.positions.get('csi-block-storage-wal-0')!;
    expect(pg0.y).toBeLessThan(data0.y);
    expect(data0.y).toBeCloseTo(wal0.y, 5);
    expect(data0.x).toBeLessThan(wal0.x);
    expect(data0.y).toBeCloseTo(
      layout.positions.get('csi-block-storage-data-1')!.y,
      5,
    );
  });

  it('aligns members of a horizontal role group onto one row across zones', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'cm-0', name: 'Controller-0', style: 'app' },
        { id: 'cm-1', name: 'Controller-1', style: 'app' },
        { id: 'inj-0', name: 'Injector-0', style: 'app' },
        { id: 'inj-1', name: 'Injector-1', style: 'app' },
        { id: 'wh-0', name: 'Webhook-0', style: 'app' },
        { id: 'wh-1', name: 'Webhook-1', style: 'app' },
        { id: 'wh-2', name: 'Webhook-2', style: 'app' },
      ],
      groups: [
        { id: 'group-controllers', name: 'Controllers', nodes: ['cm-0', 'cm-1'] },
        { id: 'group-injectors', name: 'Injectors', nodes: ['inj-0', 'inj-1'] },
        { id: 'group-webhooks', name: 'Webhooks', nodes: ['wh-0', 'wh-1', 'wh-2'] },
        { id: 'zone-0', name: 'Zone-0', nodes: ['cm-0', 'inj-0', 'wh-0'] },
        { id: 'zone-1', name: 'Zone-1', nodes: ['cm-1', 'inj-1', 'wh-1'] },
        { id: 'zone-2', name: 'Zone-2', nodes: ['wh-2'] },
      ],
      edges: [
        { source: 'wh-0', target: 'cm-0', style: 'e' },
        { source: 'wh-1', target: 'cm-1', style: 'e' },
        { source: 'inj-0', target: 'cm-0', style: 'e' },
        { source: 'inj-1', target: 'cm-1', style: 'e' },
      ],
    });

    const wh0 = layout.positions.get('wh-0')!;
    const wh1 = layout.positions.get('wh-1')!;
    const wh2 = layout.positions.get('wh-2')!;
    expect(wh0.y).toBeCloseTo(wh1.y, 5);
    expect(wh0.y).toBeCloseTo(wh2.y, 5);
    expect(wh2.x).toBeGreaterThan(wh1.x);
    expect(layout.positions.get('cm-0')!.y).toBeCloseTo(
      layout.positions.get('cm-1')!.y,
      5,
    );
    expect(layout.groupBoxes.find((b) => b.id === 'group-webhooks')!.orientation).toBe(
      'horizontal',
    );
    const zone0 = layout.groupBoxes.find((b) => b.id === 'zone-0')!;
    const zone2 = layout.groupBoxes.find((b) => b.id === 'zone-2')!;
    const webhooks = layout.groupBoxes.find((b) => b.id === 'group-webhooks')!;
    expect(zone0.labelAlign).toBe('left');
    expect(zone2.labelAlign).toBe('left');
    expect(webhooks.labelAlign).toBe('top');
    expect(zone0.y).toBeLessThanOrEqual(webhooks.y);
    const zoneBoxes = layout.groupBoxes.filter((b) => b.kind === 'zone');
    for (let i = 0; i < zoneBoxes.length; i += 1) {
      for (let j = i + 1; j < zoneBoxes.length; j += 1) {
        const a = zoneBoxes[i];
        const b = zoneBoxes[j];
        const overlap =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('keeps disjoint role groups from overlapping when zones omit roles', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'cm-0', name: 'Controller-0', style: 'app' },
        { id: 'cm-1', name: 'Controller-1', style: 'app' },
        { id: 'inj-0', name: 'Injector-0', style: 'app' },
        { id: 'inj-1', name: 'Injector-1', style: 'app' },
        { id: 'wh-0', name: 'Webhook-0', style: 'app' },
        { id: 'wh-1', name: 'Webhook-1', style: 'app' },
        { id: 'wh-2', name: 'Webhook-2', style: 'app' },
      ],
      groups: [
        { id: 'group-controllers', name: 'Controllers', nodes: ['cm-0', 'cm-1'] },
        { id: 'group-cainjectors', name: 'CA Injectors', nodes: ['inj-0', 'inj-1'] },
        { id: 'group-webhooks', name: 'Webhooks', nodes: ['wh-0', 'wh-1', 'wh-2'] },
        {
          id: 'zone-0',
          name: 'Zone-0',
          nodes: ['cm-0', 'inj-0', 'wh-0'],
        },
        { id: 'zone-1', name: 'Zone-1', nodes: ['cm-1', 'wh-1'] },
        { id: 'zone-2', name: 'Zone-2', nodes: ['inj-1', 'wh-2'] },
      ],
      edges: [
        { source: 'wh-0', target: 'cm-0', style: 'e' },
        { source: 'wh-0', target: 'cm-1', style: 'e' },
        { source: 'wh-1', target: 'cm-0', style: 'e' },
        { source: 'wh-1', target: 'cm-1', style: 'e' },
        { source: 'wh-2', target: 'cm-0', style: 'e' },
        { source: 'wh-2', target: 'cm-1', style: 'e' },
        { source: 'inj-0', target: 'cm-0', style: 'e' },
        { source: 'inj-0', target: 'cm-1', style: 'e' },
        { source: 'inj-1', target: 'cm-0', style: 'e' },
        { source: 'inj-1', target: 'cm-1', style: 'e' },
      ],
    });

    expect(layout.positions.get('wh-0')!.y).toBeCloseTo(
      layout.positions.get('wh-1')!.y,
      5,
    );
    expect(layout.positions.get('wh-0')!.y).toBeCloseTo(
      layout.positions.get('wh-2')!.y,
      5,
    );
    expect(layout.positions.get('cm-0')!.y).toBeCloseTo(
      layout.positions.get('cm-1')!.y,
      5,
    );
    expect(layout.positions.get('inj-0')!.y).toBeCloseTo(
      layout.positions.get('inj-1')!.y,
      5,
    );
    expect(layout.positions.get('wh-0')!.y).not.toBeCloseTo(
      layout.positions.get('cm-0')!.y,
      5,
    );

    const controllers = layout.groupBoxes.find((b) => b.id === 'group-controllers')!;
    const webhooks = layout.groupBoxes.find((b) => b.id === 'group-webhooks')!;
    const injectors = layout.groupBoxes.find((b) => b.id === 'group-cainjectors')!;
    const overlap = (a: typeof controllers, b: typeof controllers) =>
      a.x < b.x + b.width &&
      b.x < a.x + a.width &&
      a.y < b.y + b.height &&
      b.y < a.y + a.height;
    expect(overlap(controllers, webhooks)).toBe(false);
    expect(overlap(controllers, injectors)).toBe(false);
    expect(overlap(webhooks, injectors)).toBe(false);
  });

  it('applies group box text placement from style', () => {
    const styles = new Map([
      [
        'group-zone',
        {
          id: 'group-zone',
          kind: 'group' as const,
          colors: {
            light: { fill: '#fff', stroke: '#000', text: '#000' },
            dark: { fill: '#000', stroke: '#fff', text: '#fff' },
          },
          box: {
            text: { location: 'out' as const, align: 'bottom' as const, justify: 'center' as const },
          },
        },
      ],
    ]);
    const layout = computeGridLayout(
      {
        nodes: [
          { id: 'a', name: 'A', style: 'app' },
          { id: 'b', name: 'B', style: 'app' },
        ],
        groups: [
          { id: 'zone-0', name: 'Zone-0', style: 'group-zone', nodes: ['a'] },
          { id: 'zone-1', name: 'Zone-1', style: 'group-zone', nodes: ['b'] },
        ],
        edges: [],
      },
      { styles },
    );
    const zone0 = layout.groupBoxes.find((box) => box.id === 'zone-0')!;
    expect(zone0.labelLocation).toBe('out');
    expect(zone0.labelAlign).toBe('bottom');
    expect(zone0.labelJustify).toBe('center');
    expect(layout.contentHeight).toBeGreaterThan(zone0.height + 20);
  });

  it('does not place a non-member inside a group hull', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'op', name: 'Operator', style: 'a' },
        { id: 'cm', name: 'Controller', style: 'a' },
        { id: 'wh', name: 'Webhook', style: 'a' },
      ],
      groups: [
        {
          id: 'group-operands',
          name: 'Operands',
          style: 'group-role',
          nodes: ['cm', 'wh'],
        },
      ],
      edges: [{ source: 'op', target: 'group-operands', style: 'e' }],
    });

    const op = layout.positions.get('op')!;
    const operands = layout.groupBoxes.find((b) => b.id === 'group-operands')!;
    expect(operands.styleId).toBe('group-role');
    const insideX = op.x > operands.x && op.x < operands.x + operands.width;
    const insideY = op.y > operands.y && op.y < operands.y + operands.height;
    expect(insideX && insideY).toBe(false);
    expect(op.y).toBeLessThan(operands.y);
  });

  it('wraps nested group boxes and descendant nodes in the parent hull', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'op', name: 'Operator', style: 'a' },
        { id: 'cm', name: 'Controller', style: 'a' },
        { id: 'wh', name: 'Webhook', style: 'a' },
      ],
      groups: [
        { id: 'group-controllers', name: 'Controllers', style: 'group-role', nodes: ['cm'] },
        { id: 'group-webhooks', name: 'Webhooks', style: 'group-role', nodes: ['wh'] },
        {
          id: 'group-operands',
          name: 'Operands',
          style: 'group-role',
          groups: ['group-controllers', 'group-webhooks'],
        },
      ],
      edges: [{ source: 'op', target: 'group-operands', style: 'e' }],
    });

    const operands = layout.groupBoxes.find((b) => b.id === 'group-operands')!;
    const controllers = layout.groupBoxes.find((b) => b.id === 'group-controllers')!;
    const webhooks = layout.groupBoxes.find((b) => b.id === 'group-webhooks')!;
    expect(operands.nestDepth).toBeGreaterThan(controllers.nestDepth);
    expect(operands.x).toBeLessThanOrEqual(controllers.x);
    expect(operands.y).toBeLessThanOrEqual(controllers.y);
    expect(operands.x + operands.width).toBeGreaterThanOrEqual(
      controllers.x + controllers.width,
    );
    expect(operands.y + operands.height).toBeGreaterThanOrEqual(
      controllers.y + controllers.height,
    );
    expect(operands.x).toBeLessThanOrEqual(webhooks.x);
    expect(operands.y + operands.height).toBeGreaterThanOrEqual(
      webhooks.y + webhooks.height,
    );

    const op = layout.positions.get('op')!;
    const inside =
      op.x > operands.x &&
      op.x < operands.x + operands.width &&
      op.y > operands.y &&
      op.y < operands.y + operands.height;
    expect(inside).toBe(false);
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

  it('keeps hierarchical operand members on separate rows without overlap', () => {
    const layout = computeGridLayout({
      nodes: [
        { id: 'op', name: 'Operator', style: 'a' },
        { id: 'cm', name: 'Controller', style: 'a' },
        { id: 'inj', name: 'Injector', style: 'a' },
        { id: 'wh', name: 'Webhook', style: 'a' },
      ],
      groups: [
        {
          id: 'group-operands',
          name: 'Operands',
          style: 'group-role',
          nodes: ['cm', 'inj', 'wh'],
        },
      ],
      edges: [
        { source: 'op', target: 'group-operands', style: 'e' },
        { source: 'wh', target: 'cm', style: 'e' },
        { source: 'inj', target: 'cm', style: 'e' },
      ],
    });
    const members = ['cm', 'inj', 'wh'].map((id) => layout.positions.get(id)!);
    expect(new Set(members.map((p) => p.y)).size).toBeGreaterThan(1);
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const dx = members[i].x - members[j].x;
        const dy = members[i].y - members[j].y;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(88);
      }
    }
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
      const nodeIds = new Set(arch!.diagram.nodes.map((n) => n.id));
      const groupsById = groupByIdMap(arch!.diagram.groups ?? []);
      for (const group of arch!.diagram.groups ?? []) {
        const box = layout.groupBoxes.find((b) => b.id === group.id);
        expect(box, `${arch!.name} missing box for group ${group.id}`).toBeDefined();
        expect(box!.styleId, `${arch!.name} ${group.id} missing styleId`).toBe(
          group.style,
        );
        const members = new Set(
          collectGroupNodeIds(group.id, groupsById, nodeIds),
        );
        const memberZones = new Set(
          (arch!.diagram.groups ?? [])
            .filter(
              (g) =>
                g.id.startsWith('zone-') &&
                collectGroupNodeIds(g.id, groupsById, nodeIds).some((id) =>
                  members.has(id),
                ),
            )
            .map((g) => g.id),
        );
        for (const node of arch!.diagram.nodes) {
          if (members.has(node.id)) {
            continue;
          }
          const nodeZones = (arch!.diagram.groups ?? []).filter(
            (g) =>
              g.id.startsWith('zone-') &&
              collectGroupNodeIds(g.id, groupsById, nodeIds).includes(node.id),
          );
          if (nodeZones.some((z) => memberZones.has(z.id))) {
            continue;
          }
          const pos = layout.positions.get(node.id)!;
          const inside =
            pos.x > box!.x &&
            pos.x < box!.x + box!.width &&
            pos.y > box!.y &&
            pos.y < box!.y + box!.height;
          expect(
            inside,
            `${arch!.name} node ${node.id} is not a member of ${group.id} but sits inside its box`,
          ).toBe(false);
        }
      }
      const zoneBoxes = layout.groupBoxes.filter((b) => b.kind === 'zone');
      for (let i = 0; i < zoneBoxes.length; i += 1) {
        for (let j = i + 1; j < zoneBoxes.length; j += 1) {
          const a = zoneBoxes[i];
          const b = zoneBoxes[j];
          const overlap =
            a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height;
          expect(
            overlap,
            `${arch!.name} ${a.id} overlaps ${b.id}`,
          ).toBe(false);
        }
      }

      // Disjoint groups must not overlap; shared membership (zone∩role) may.
      for (let i = 0; i < layout.groupBoxes.length; i += 1) {
        for (let j = i + 1; j < layout.groupBoxes.length; j += 1) {
          const a = layout.groupBoxes[i];
          const b = layout.groupBoxes[j];
          const aMembers = new Set(
            collectGroupNodeIds(a.id, groupsById, nodeIds),
          );
          const bMembers = new Set(
            collectGroupNodeIds(b.id, groupsById, nodeIds),
          );
          const shared = [...aMembers].some((id) => bMembers.has(id));
          if (shared) {
            continue;
          }
          const overlap =
            a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height;
          expect(
            overlap,
            `${arch!.name} disjoint groups ${a.id} and ${b.id} overlap`,
          ).toBe(false);
        }
      }
    }
  });
});

const sampleBox = (): GroupBox => ({
  id: 'g',
  name: 'G',
  kind: 'role',
  orientation: 'horizontal',
  nestDepth: 0,
  labelLocation: 'out',
  labelAlign: 'top',
  labelJustify: 'left',
  x: 0,
  y: 0,
  width: 100,
  height: 40,
});

describe('nearestGroupSideCenter', () => {
  it('picks the nearest outer-side midpoint', () => {
    const box = sampleBox();
    expect(nearestGroupSideCenter(box, { x: 50, y: -20 })).toEqual({ x: 50, y: 0 });
    expect(nearestGroupSideCenter(box, { x: 50, y: 80 })).toEqual({ x: 50, y: 40 });
    expect(nearestGroupSideCenter(box, { x: -10, y: 20 })).toEqual({ x: 0, y: 20 });
    expect(nearestGroupSideCenter(box, { x: 140, y: 20 })).toEqual({ x: 100, y: 20 });
  });
});

describe('resolveEdgeEndpoints', () => {
  it('connects a node to the nearest group side center', () => {
    const box = sampleBox();
    const node = { x: 50, y: -30 };
    const { start, end } = resolveEdgeEndpoints(node, box);
    expect(start).toEqual(node);
    expect(end).toEqual({ x: 50, y: 0 });
  });
});
