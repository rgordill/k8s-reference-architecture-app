import type {
  BoxTextAlign,
  BoxTextJustify,
  BoxTextLocation,
  Diagram,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  StyleDefinition,
} from '../data/types';
import { collectAllGroupNodeIds, nestedGroupIds } from '../data/groupMembership';
import { markdownPlainText } from './inlineMarkdown';
import { resolveBoxText } from './styleResolve';

export interface Point {
  x: number;
  y: number;
}

export interface GroupBox {
  id: string;
  name: string;
  kind: 'zone' | 'role';
  styleId?: string;
  /** Dominant span of member nodes. */
  orientation: 'horizontal' | 'vertical';
  /** 0 for leaf groups; increases with nested-group depth. */
  nestDepth: number;
  labelLocation: BoxTextLocation;
  labelAlign: BoxTextAlign;
  labelJustify: BoxTextJustify;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridLayoutResult {
  positions: Map<string, Point>;
  groupBoxes: GroupBox[];
  /** Content size used to center the layout in the viewport */
  contentWidth: number;
  contentHeight: number;
}

export interface GridLayoutOptions {
  nodeSize?: number;
  colGap?: number;
  rowGap?: number;
  padding?: number;
  groupPad?: number;
  groupCrossInset?: number;
  /** Extra padding when a parent hull wraps nested group boxes. */
  groupNestPad?: number;
  zoneGap?: number;
  styles?: ReadonlyMap<string, StyleDefinition>;
}

const DEFAULTS = {
  nodeSize: 88,
  colGap: 56,
  rowGap: 56,
  padding: 48,
  groupPad: 28,
  /** Shrink the cross-axis so overlapping group labels do not share an edge. */
  groupCrossInset: 14,
  groupNestPad: 12,
  /** Horizontal gap kept between adjacent zone columns. */
  zoneGap: 10,
};

function isZoneGroup(group: DiagramGroup): boolean {
  return group.id.startsWith('zone-');
}

/** Rank for top→bottom ordering inside a zone column (lower = higher on canvas). */
function nodeRowRank(node: DiagramNode, incoming: Set<string>, outgoing: Set<string>): number {
  const style = node.style.toLowerCase();
  const name = markdownPlainText(node.name).toLowerCase();
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
 * Expand edges whose ends are groups into member-node edges so hierarchy
 * layout can place a node that only links to a group.
 */
export function expandGroupEdges(
  edges: DiagramEdge[],
  groups: DiagramGroup[],
  nodeIds: Set<string>,
): DiagramEdge[] {
  const membersByGroup = collectAllGroupNodeIds(groups, nodeIds);
  const resolve = (id: string): string[] => {
    const members = membersByGroup.get(id);
    if (members) {
      return members;
    }
    return nodeIds.has(id) ? [id] : [];
  };

  const expanded: DiagramEdge[] = [];
  for (const edge of edges) {
    const sources = resolve(edge.source);
    const targets = resolve(edge.target);
    for (const source of sources) {
      for (const target of targets) {
        if (source !== target) {
          expanded.push({ source, target, style: edge.style });
        }
      }
    }
  }
  return expanded;
}

/**
 * Longest-path layering from roots (nodes with no inbound edges).
 * Produces a top-down hierarchy when zones are not present.
 */
export function computeLayers(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  groups: DiagramGroup[] = [],
): string[][] {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const inbound = new Map<string, string[]>();
  const outbound = new Map<string, string[]>();
  for (const id of ids) {
    inbound.set(id, []);
    outbound.set(id, []);
  }
  for (const e of expandGroupEdges(edges, groups, idSet)) {
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

function separateZoneBoxes(
  boxes: GroupBox[],
  zoneGroups: DiagramGroup[],
  membersByGroup: Map<string, string[]>,
  positions: Map<string, Point>,
  gap: number,
): void {
  const columns = zoneGroups
    .map((group) => {
      const box = boxes.find((b) => b.id === group.id);
      const xs = (membersByGroup.get(group.id) ?? [])
        .map((id) => positions.get(id)?.x)
        .filter((x): x is number => Number.isFinite(x));
      if (!box || xs.length === 0) {
        return null;
      }
      const cx = xs.reduce((sum, x) => sum + x, 0) / xs.length;
      return { box, cx };
    })
    .filter((column): column is { box: GroupBox; cx: number } => column != null)
    .sort((a, b) => a.cx - b.cx);

  for (let i = 0; i < columns.length - 1; i += 1) {
    const left = columns[i];
    const right = columns[i + 1];
    const mid = (left.cx + right.cx) / 2;
    const leftMax = mid - gap / 2;
    const rightMin = mid + gap / 2;
    if (left.box.x + left.box.width > leftMax) {
      left.box.width = Math.max(8, leftMax - left.box.x);
    }
    if (right.box.x < rightMin) {
      const shift = rightMin - right.box.x;
      right.box.x = rightMin;
      right.box.width = Math.max(8, right.box.width - shift);
    }
  }
}

function clipBoxToXRange(
  box: GroupBox,
  x0: number,
  x1: number,
): GroupBox | undefined {
  const left = Math.max(box.x, x0);
  const right = Math.min(box.x + box.width, x1);
  if (right - left < 1) {
    return undefined;
  }
  return { ...box, x: left, width: right - left };
}

function verticalLabelGutter(name: string): number {
  const plain = markdownPlainText(name);
  return Math.max(32, Math.round(plain.length * 7) + 12);
}

function horizontalLabelBand(): number {
  return 20;
}

function expandContentForLabel(
  box: GroupBox,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  if (box.labelLocation === 'in') {
    return;
  }
  if (box.labelAlign === 'left') {
    bounds.minX = Math.min(bounds.minX, box.x - verticalLabelGutter(box.name));
    return;
  }
  if (box.labelAlign === 'right') {
    bounds.maxX = Math.max(
      bounds.maxX,
      box.x + box.width + verticalLabelGutter(box.name),
    );
    return;
  }
  if (box.labelAlign === 'top') {
    bounds.minY = Math.min(bounds.minY, box.y - horizontalLabelBand());
    return;
  }
  bounds.maxY = Math.max(
    bounds.maxY,
    box.y + box.height + horizontalLabelBand(),
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Leaf role groups that already span more horizontally than vertically, with
 * one member per zone column, share a single row so replicas line up.
 * Skipped when flattening would overlap nodes (hierarchical layouts).
 */
export function alignHorizontalGroupMembers(
  positions: Map<string, Point>,
  roleGroups: DiagramGroup[],
  membersByGroup: Map<string, string[]>,
  nodeSize: number,
): void {
  for (const group of roleGroups) {
    if (nestedGroupIds(group).length > 0) {
      continue;
    }
    const ids = (membersByGroup.get(group.id) ?? []).filter((id) => positions.has(id));
    if (ids.length < 2) {
      continue;
    }
    const points = ids.map((id) => positions.get(id)!);
    const xs = points.map((p) => p.x);
    if (new Set(xs).size !== xs.length) {
      continue;
    }
    const ys = points.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX < spanY) {
      continue;
    }
    const y = median(ys);
    const wouldOverlap = ids.some((idA, i) =>
      ids.some((idB, j) => {
        if (j <= i) {
          return false;
        }
        const dx = positions.get(idA)!.x - positions.get(idB)!.x;
        return Math.abs(dx) < nodeSize;
      }),
    );
    if (wouldOverlap) {
      continue;
    }
    for (const id of ids) {
      const point = positions.get(id)!;
      positions.set(id, { x: point.x, y });
    }
  }
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
  const groupCrossInset = options.groupCrossInset ?? DEFAULTS.groupCrossInset;
  const groupNestPad = options.groupNestPad ?? DEFAULTS.groupNestPad;
  const zoneGap = options.zoneGap ?? DEFAULTS.zoneGap;
  const styles = options.styles;

  const positions = new Map<string, Point>();
  const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
  const groups = diagram.groups ?? [];
  const nodeIds = new Set(diagram.nodes.map((n) => n.id));
  const membersByGroup = collectAllGroupNodeIds(groups, nodeIds);
  const zoneGroups = sortZoneGroups(groups.filter(isZoneGroup));
  const roleGroups = groups.filter((g) => !isZoneGroup(g));

  if (zoneGroups.length > 0) {
    // Build per-column membership and intra-column edge hints.
    let maxRows = 1;
    const columns = zoneGroups.map((zone) => {
      const members = (membersByGroup.get(zone.id) ?? []).filter((id) =>
        nodeById.has(id),
      );
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
    alignHorizontalGroupMembers(positions, roleGroups, membersByGroup, nodeSize);
  } else {
    const layers = computeLayers(diagram.nodes, diagram.edges, groups);
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
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const p of positions.values()) {
    bounds.minX = Math.min(bounds.minX, p.x - nodeSize / 2);
    bounds.minY = Math.min(bounds.minY, p.y - nodeSize / 2);
    bounds.maxX = Math.max(bounds.maxX, p.x + nodeSize / 2);
    bounds.maxY = Math.max(bounds.maxY, p.y + nodeSize / 2);
  }
  if (!Number.isFinite(bounds.minX)) {
    bounds.minX = 0;
    bounds.minY = 0;
    bounds.maxX = nodeSize;
    bounds.maxY = nodeSize;
  }

  const groupBoxes: GroupBox[] = [];
  const boxById = new Map<string, GroupBox>();
  const computing = new Set<string>();

  const buildGroupBox = (group: DiagramGroup): GroupBox | undefined => {
    const existing = boxById.get(group.id);
    if (existing) {
      return existing;
    }
    if (computing.has(group.id)) {
      return undefined;
    }
    computing.add(group.id);

    const childBoxes: GroupBox[] = [];
    for (const childId of nestedGroupIds(group)) {
      const child = groups.find((g) => g.id === childId);
      if (!child) {
        continue;
      }
      const childBox = buildGroupBox(child);
      if (childBox) {
        childBoxes.push(childBox);
      }
    }

    let minBoxX = Infinity;
    let minBoxY = Infinity;
    let maxBoxX = -Infinity;
    let maxBoxY = -Infinity;

    for (const id of group.nodes ?? []) {
      const p = positions.get(id);
      if (!p) {
        continue;
      }
      minBoxX = Math.min(minBoxX, p.x - nodeSize / 2 - groupPad);
      minBoxY = Math.min(minBoxY, p.y - nodeSize / 2 - groupPad);
      maxBoxX = Math.max(maxBoxX, p.x + nodeSize / 2 + groupPad);
      maxBoxY = Math.max(maxBoxY, p.y + nodeSize / 2 + groupPad);
    }
    for (const child of childBoxes) {
      minBoxX = Math.min(minBoxX, child.x - groupNestPad);
      minBoxY = Math.min(minBoxY, child.y - groupNestPad);
      maxBoxX = Math.max(maxBoxX, child.x + child.width + groupNestPad);
      maxBoxY = Math.max(maxBoxY, child.y + child.height + groupNestPad);
    }

    if (isZoneGroup(group)) {
      const zoneMemberSet = new Set(membersByGroup.get(group.id) ?? []);
      const zonePoints = [...zoneMemberSet]
        .map((id) => positions.get(id))
        .filter((p): p is Point => Boolean(p));
      if (zonePoints.length > 0) {
        const x0 = Math.min(...zonePoints.map((p) => p.x)) - nodeSize / 2 - groupPad;
        const x1 = Math.max(...zonePoints.map((p) => p.x)) + nodeSize / 2 + groupPad;
        for (const other of roleGroups) {
          if (nestedGroupIds(other).length > 0) {
            continue;
          }
          const otherMembers = membersByGroup.get(other.id) ?? [];
          if (!otherMembers.some((id) => zoneMemberSet.has(id))) {
            continue;
          }
          const otherBox = buildGroupBox(other);
          if (!otherBox) {
            continue;
          }
          const clipped = clipBoxToXRange(otherBox, x0, x1);
          if (clipped) {
            childBoxes.push(clipped);
            minBoxX = Math.min(minBoxX, clipped.x - groupNestPad);
            minBoxY = Math.min(minBoxY, clipped.y - groupNestPad);
            maxBoxX = Math.max(maxBoxX, clipped.x + clipped.width + groupNestPad);
            maxBoxY = Math.max(maxBoxY, clipped.y + clipped.height + groupNestPad);
          }
        }
      }
    }

    if (!Number.isFinite(minBoxX)) {
      const members = (membersByGroup.get(group.id) ?? [])
        .map((id) => positions.get(id))
        .filter((p): p is Point => Boolean(p));
      if (members.length === 0) {
        computing.delete(group.id);
        return undefined;
      }
      const xs = members.map((p) => p.x);
      const ys = members.map((p) => p.y);
      minBoxX = Math.min(...xs) - nodeSize / 2 - groupPad;
      minBoxY = Math.min(...ys) - nodeSize / 2 - groupPad;
      maxBoxX = Math.max(...xs) + nodeSize / 2 + groupPad;
      maxBoxY = Math.max(...ys) + nodeSize / 2 + groupPad;
    }

    const memberCenters = (membersByGroup.get(group.id) ?? [])
      .map((id) => positions.get(id))
      .filter((p): p is Point => Boolean(p));
    const spanX =
      memberCenters.length > 0
        ? Math.max(...memberCenters.map((p) => p.x)) -
          Math.min(...memberCenters.map((p) => p.x))
        : maxBoxX - minBoxX;
    const spanY =
      memberCenters.length > 0
        ? Math.max(...memberCenters.map((p) => p.y)) -
          Math.min(...memberCenters.map((p) => p.y))
        : maxBoxY - minBoxY;
    const orientation: GroupBox['orientation'] = isZoneGroup(group)
      ? 'vertical'
      : spanX >= spanY
        ? 'horizontal'
        : 'vertical';

    let x = minBoxX;
    let y = minBoxY;
    let width = maxBoxX - minBoxX;
    let height = maxBoxY - minBoxY;
    if (childBoxes.length === 0) {
      if (orientation === 'horizontal') {
        y += groupCrossInset;
        height = Math.max(nodeSize * 0.5, height - groupCrossInset * 2);
      } else {
        x += groupCrossInset;
        width = Math.max(nodeSize * 0.5, width - groupCrossInset * 2);
      }
    }

    const nestDepth =
      childBoxes.length === 0
        ? 0
        : 1 + Math.max(...childBoxes.map((child) => child.nestDepth));

    const label = resolveBoxText(
      styles?.get(group.style ?? ''),
      orientation,
    );

    const box: GroupBox = {
      id: group.id,
      name: group.name,
      kind: isZoneGroup(group) ? 'zone' : 'role',
      styleId: group.style,
      orientation,
      nestDepth,
      labelLocation: label.location,
      labelAlign: label.align,
      labelJustify: label.justify,
      x,
      y,
      width,
      height,
    };
    boxById.set(group.id, box);
    computing.delete(group.id);
    return box;
  };

  for (const group of [...roleGroups, ...zoneGroups]) {
    const box = buildGroupBox(group);
    if (!box) {
      continue;
    }
    if (!groupBoxes.some((existing) => existing.id === box.id)) {
      groupBoxes.push(box);
    }
    bounds.minX = Math.min(bounds.minX, box.x);
    bounds.minY = Math.min(bounds.minY, box.y);
    bounds.maxX = Math.max(bounds.maxX, box.x + box.width);
    bounds.maxY = Math.max(bounds.maxY, box.y + box.height);
    expandContentForLabel(box, bounds);
  }

  separateZoneBoxes(
    groupBoxes,
    zoneGroups,
    membersByGroup,
    positions,
    zoneGap,
  );
  for (const box of groupBoxes) {
    bounds.minX = Math.min(bounds.minX, box.x);
    bounds.minY = Math.min(bounds.minY, box.y);
    bounds.maxX = Math.max(bounds.maxX, box.x + box.width);
    bounds.maxY = Math.max(bounds.maxY, box.y + box.height);
    expandContentForLabel(box, bounds);
  }

  // Normalize so content starts near origin with padding.
  const shiftX = padding - bounds.minX;
  const shiftY = padding - bounds.minY;
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
    contentWidth: bounds.maxX - bounds.minX + padding * 2,
    contentHeight: bounds.maxY - bounds.minY + padding * 2,
  };
}

export type GroupSide = 'top' | 'bottom' | 'left' | 'right';

/** Midpoints of the four outer edges of a group box. */
export function groupSideCenters(box: GroupBox): Record<GroupSide, Point> {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    top: { x: cx, y: box.y },
    bottom: { x: cx, y: box.y + box.height },
    left: { x: box.x, y: cy },
    right: { x: box.x + box.width, y: cy },
  };
}

function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Anchor on the midpoint of the box side closest to `from`.
 */
export function nearestGroupSideCenter(box: GroupBox, from: Point): Point {
  const sides = groupSideCenters(box);
  let best: Point = sides.top;
  let bestDist = Infinity;
  for (const point of Object.values(sides)) {
    const dist = distanceSq(from, point);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  return best;
}

/**
 * Resolve edge endpoints. Node–node uses centers. Any group end snaps to the
 * nearest outer-side midpoint facing the other end.
 */
export function resolveEdgeEndpoints(
  source: Point | GroupBox,
  target: Point | GroupBox,
): { start: Point; end: Point } {
  const isBox = (value: Point | GroupBox): value is GroupBox =>
    'width' in value && 'height' in value;

  if (!isBox(source) && !isBox(target)) {
    return { start: source, end: target };
  }

  if (isBox(source) && !isBox(target)) {
    return { start: nearestGroupSideCenter(source, target), end: target };
  }

  if (!isBox(source) && isBox(target)) {
    return { start: source, end: nearestGroupSideCenter(target, source) };
  }

  const sourceBox = source as GroupBox;
  const targetBox = target as GroupBox;
  const start = nearestGroupSideCenter(sourceBox, {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  });
  const end = nearestGroupSideCenter(targetBox, start);
  return { start, end };
}
