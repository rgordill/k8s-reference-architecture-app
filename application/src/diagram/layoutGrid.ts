import type { Diagram, DiagramEdge, DiagramGroup, DiagramNode } from '../data/types';

export interface Point {
  x: number;
  y: number;
}

export interface GroupBox {
  id: string;
  name: string;
  kind: 'zone' | 'role';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridLayoutResult {
  positions: Map<string, Point>;
  groupBoxes: GroupBox[];
  /** Content size before centering into the viewport */
  contentWidth: number;
  contentHeight: number;
}

export interface GridLayoutOptions {
  nodeSize?: number;
  colGap?: number;
  rowGap?: number;
  padding?: number;
  groupPad?: number;
}

const DEFAULTS = {
  nodeSize: 88,
  colGap: 56,
  rowGap: 56,
  padding: 48,
  groupPad: 28,
};

function isZoneGroup(group: DiagramGroup): boolean {
  return group.id.startsWith('zone-');
}

/** Rank for top→bottom ordering inside a zone column (lower = higher on canvas). */
function nodeRowRank(node: DiagramNode, incoming: Set<string>, outgoing: Set<string>): number {
  const style = node.style.toLowerCase();
  const name = node.name.toLowerCase();
  const id = node.id.toLowerCase();
  const looksStorage =
    style.includes('storage') ||
    name.includes('storage') ||
    id.includes('storage') ||
    id.includes('csi');
  if (looksStorage) return 100;
  // Prefer sources above sinks within the column.
  if (outgoing.size > 0 && incoming.size === 0) return 0;
  if (incoming.size > 0 && outgoing.size === 0) return 50;
  return 25;
}

/**
 * Longest-path layering from roots (nodes with no inbound edges).
 * Produces a top-down hierarchy when zones are not present.
 */
export function computeLayers(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): string[][] {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const inbound = new Map<string, string[]>();
  const outbound = new Map<string, string[]>();
  for (const id of ids) {
    inbound.set(id, []);
    outbound.set(id, []);
  }
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    inbound.get(e.target)!.push(e.source);
    outbound.get(e.source)!.push(e.target);
  }

  const layer = new Map<string, number>();
  const visiting = new Set<string>();

  function depth(id: string): number {
    if (layer.has(id)) return layer.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = inbound.get(id) ?? [];
    const d =
      parents.length === 0 ? 0 : Math.max(...parents.map((p) => depth(p))) + 1;
    visiting.delete(id);
    layer.set(id, d);
    return d;
  }

  for (const id of ids) {
    depth(id);
  }

  const maxLayer = Math.max(0, ...Array.from(layer.values()));
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of ids) {
    layers[layer.get(id) ?? 0].push(id);
  }
  for (const row of layers) {
    row.sort((a, b) => a.localeCompare(b));
  }
  return layers.filter((row) => row.length > 0);
}

function sortZoneGroups(groups: DiagramGroup[]): DiagramGroup[] {
  return [...groups].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * Static grid layout:
 * - Zone groups → columns (left→right); members stacked top→bottom in each column
 * - Otherwise → hierarchical rows from edge direction (top→bottom, left→right)
 * - Role groups → axis-aligned bounding boxes over their members
 */
export function computeGridLayout(
  diagram: Diagram,
  options: GridLayoutOptions = {},
): GridLayoutResult {
  const nodeSize = options.nodeSize ?? DEFAULTS.nodeSize;
  const colGap = options.colGap ?? DEFAULTS.colGap;
  const rowGap = options.rowGap ?? DEFAULTS.rowGap;
  const padding = options.padding ?? DEFAULTS.padding;
  const groupPad = options.groupPad ?? DEFAULTS.groupPad;

  const positions = new Map<string, Point>();
  const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
  const groups = diagram.groups ?? [];
  const zoneGroups = sortZoneGroups(groups.filter(isZoneGroup));
  const roleGroups = groups.filter((g) => !isZoneGroup(g));

  if (zoneGroups.length > 0) {
    // Build per-column membership and intra-column edge hints.
    let maxRows = 1;
    const columns = zoneGroups.map((zone) => {
      const members = zone.nodes.filter((id) => nodeById.has(id));
      const memberSet = new Set(members);
      const ranked = members
        .map((id) => {
          const node = nodeById.get(id)!;
          const incoming = new Set(
            diagram.edges
              .filter((e) => e.target === id && memberSet.has(e.source))
              .map((e) => e.source),
          );
          const outgoing = new Set(
            diagram.edges
              .filter((e) => e.source === id && memberSet.has(e.target))
              .map((e) => e.target),
          );
          return {
            id,
            rank: nodeRowRank(node, incoming, outgoing),
          };
        })
        .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
        .map((r) => r.id);
      maxRows = Math.max(maxRows, ranked.length);
      return { zone, members: ranked };
    });

    columns.forEach((col, colIndex) => {
      col.members.forEach((id, rowIndex) => {
        positions.set(id, {
          x: padding + colIndex * (nodeSize + colGap) + nodeSize / 2,
          y: padding + rowIndex * (nodeSize + rowGap) + nodeSize / 2,
        });
      });
    });

    // Place any nodes not covered by a zone to the right.
    const placed = new Set(positions.keys());
    const leftovers = diagram.nodes.filter((n) => !placed.has(n.id));
    leftovers.forEach((n, i) => {
      positions.set(n.id, {
        x: padding + columns.length * (nodeSize + colGap) + nodeSize / 2,
        y: padding + i * (nodeSize + rowGap) + nodeSize / 2,
      });
    });
  } else {
    const layers = computeLayers(diagram.nodes, diagram.edges);
    const maxCols = Math.max(1, ...layers.map((r) => r.length));

    layers.forEach((row, rowIndex) => {
      const rowWidth = row.length * nodeSize + (row.length - 1) * colGap;
      const gridWidth = maxCols * nodeSize + (maxCols - 1) * colGap;
      const offsetX = padding + (gridWidth - rowWidth) / 2;
      row.forEach((id, colIndex) => {
        positions.set(id, {
          x: offsetX + colIndex * (nodeSize + colGap) + nodeSize / 2,
          y: padding + rowIndex * (nodeSize + rowGap) + nodeSize / 2,
        });
      });
    });
  }

  // Content bounds from node centers.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x - nodeSize / 2);
    minY = Math.min(minY, p.y - nodeSize / 2);
    maxX = Math.max(maxX, p.x + nodeSize / 2);
    maxY = Math.max(maxY, p.y + nodeSize / 2);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = nodeSize;
    maxY = nodeSize;
  }

  const groupBoxes: GroupBox[] = [];
  for (const group of [...roleGroups, ...zoneGroups]) {
    const members = group.nodes
      .map((id) => positions.get(id))
      .filter((p): p is Point => Boolean(p));
    if (members.length === 0) continue;
    const xs = members.map((p) => p.x);
    const ys = members.map((p) => p.y);
    const x = Math.min(...xs) - nodeSize / 2 - groupPad;
    const y = Math.min(...ys) - nodeSize / 2 - groupPad;
    const width = Math.max(...xs) - Math.min(...xs) + nodeSize + groupPad * 2;
    const height = Math.max(...ys) - Math.min(...ys) + nodeSize + groupPad * 2;
    groupBoxes.push({
      id: group.id,
      name: group.name,
      kind: isZoneGroup(group) ? 'zone' : 'role',
      x,
      y,
      width,
      height,
    });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  // Normalize so content starts near origin with padding.
  const shiftX = padding - minX;
  const shiftY = padding - minY;
  for (const [id, p] of positions) {
    positions.set(id, { x: p.x + shiftX, y: p.y + shiftY });
  }
  for (const box of groupBoxes) {
    box.x += shiftX;
    box.y += shiftY;
  }

  return {
    positions,
    groupBoxes,
    contentWidth: maxX - minX + padding * 2,
    contentHeight: maxY - minY + padding * 2,
  };
}
