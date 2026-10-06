import * as d3 from 'd3';
import type { Diagram, StyleDefinition, ThemeMode } from '../data/types';
import { computeGridLayout, type GroupBox } from './layoutGrid';
import {
  resolveColors,
  resolveEdgeOptions,
  resolveFont,
  resolveLogoHref,
} from './styleResolve';

export interface LayoutNode {
  id: string;
  name: string;
  styleId: string;
  groupIds: string[];
  x: number;
  y: number;
}

export interface LayoutLink {
  source: string;
  target: string;
  styleId: string;
}

export interface DiagramRenderHandle {
  svg: SVGSVGElement;
  destroy: () => void;
  /** No-op for static layout; kept for API compatibility. */
  restart: () => void;
}

export interface RenderDiagramOptions {
  container: HTMLElement;
  diagram: Diagram;
  styles: Map<string, StyleDefinition>;
  theme: ThemeMode;
  width?: number;
  height?: number;
}

const NODE_RADIUS = 44;
const DEFAULT_FONT_FAMILY = 'RedHatText, Overpass, sans-serif';

/** Split a node label into short lines that fit inside the circle. */
export function wrapNodeLabel(text: string, maxCharsPerLine = 11, maxLines = 3): string[] {
  const words = text.split(/[\s_]+/).filter(Boolean);
  if (words.length === 0) {
    return [text];
  }

  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const word of words) {
    if (lines.length >= maxLines) {
      break;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (lines.length >= maxLines) {
      break;
    }
    if (word.length <= maxCharsPerLine) {
      current = word;
      continue;
    }
    let rest = word;
    while (rest.length > maxCharsPerLine && lines.length < maxLines) {
      lines.push(rest.slice(0, maxCharsPerLine));
      rest = rest.slice(maxCharsPerLine);
    }
    if (rest && lines.length < maxLines) {
      current = rest;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === 0) {
    return [text.slice(0, maxCharsPerLine)];
  }
  return lines.slice(0, maxLines);
}

export function renderDiagram(options: RenderDiagramOptions): DiagramRenderHandle {
  const { container, diagram, styles, theme } = options;
  const width = options.width ?? (container.clientWidth || 800);
  const height = options.height ?? (container.clientHeight || 480);

  container.replaceChildren();

  const layout = computeGridLayout(diagram, { nodeSize: NODE_RADIUS * 2 });
  const nodeById = new Map(
    diagram.nodes.map((n) => {
      const pos = layout.positions.get(n.id) ?? { x: 0, y: 0 };
      const laid: LayoutNode = {
        id: n.id,
        name: n.name,
        styleId: n.style,
        groupIds: (diagram.groups ?? [])
          .filter((g) => g.nodes.includes(n.id))
          .map((g) => g.id),
        x: pos.x,
        y: pos.y,
      };
      return [n.id, laid] as const;
    }),
  );
  const nodes = Array.from(nodeById.values());

  const groupById = new Map(layout.groupBoxes.map((box) => [box.id, box]));

  const endpoint = (id: string): { x: number; y: number } | null => {
    const node = nodeById.get(id);
    if (node) {
      return { x: node.x, y: node.y };
    }
    const box = groupById.get(id);
    if (box) {
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }
    return null;
  };

  const links: LayoutLink[] = diagram.edges
    .filter((e) => endpoint(e.source) && endpoint(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      styleId: e.style,
    }));

  const svgWidth = Math.max(width, layout.contentWidth);
  const svgHeight = Math.max(height, layout.contentHeight);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', 'Architecture diagram')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

  const root = svg.append('g').attr('class', 'diagram-root');

  // Pan/zoom for inspection only — positions stay fixed.
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.4, 2.5])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString());
    });
  svg.call(zoom);

  const groupLayer = root.append('g').attr('class', 'groups');
  const linkLayer = root.append('g').attr('class', 'links');
  const nodeLayer = root.append('g').attr('class', 'nodes');

  drawGroups(groupLayer, layout.groupBoxes, theme);

  linkLayer
    .selectAll<SVGLineElement, LayoutLink>('line')
    .data(links)
    .join('line')
    .attr('data-style', (d) => d.styleId)
    .attr('x1', (d) => endpoint(d.source)!.x)
    .attr('y1', (d) => endpoint(d.source)!.y)
    .attr('x2', (d) => endpoint(d.target)!.x)
    .attr('y2', (d) => endpoint(d.target)!.y)
    .attr('stroke', (d) => resolveColors(styles.get(d.styleId), theme, 'edge').stroke)
    .attr(
      'stroke-width',
      (d) => resolveEdgeOptions(styles.get(d.styleId)).strokeWidth ?? 1.5,
    )
    .attr(
      'stroke-dasharray',
      (d) => resolveEdgeOptions(styles.get(d.styleId)).dashArray ?? null,
    )
    .attr('stroke-opacity', 0.9);

  const node = nodeLayer
    .selectAll<SVGGElement, LayoutNode>('g.node')
    .data(nodes, (d) => d.id)
    .join('g')
    .attr('class', 'node')
    .attr('data-id', (d) => d.id)
    .attr('data-style', (d) => d.styleId)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  node.each(function paintNode(d) {
    const g = d3.select<SVGGElement, LayoutNode>(this);
    const style = styles.get(d.styleId);
    const colors = resolveColors(style, theme, 'node');
    const font = resolveFont(style);
    const logo = resolveLogoHref(style);
    const fallbackPath =
      resolveLogoHref({
        id: 'fallback',
        kind: 'node',
        logo: { type: 'patternfly', value: 'CubeIcon' },
        colors: style?.colors ?? {
          light: { fill: '#eee', stroke: '#333', text: '#111' },
          dark: { fill: '#333', stroke: '#eee', text: '#fff' },
        },
      }).path ?? '';

    g.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', colors.fill)
      .attr('stroke', colors.stroke)
      .attr('stroke-width', 2);

    const iconSize = 20;
    const iconY = -22;

    if (logo.type === 'url') {
      g.append('image')
        .attr('href', logo.value)
        .attr('x', -iconSize / 2)
        .attr('y', iconY)
        .attr('width', iconSize)
        .attr('height', iconSize)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .on('error', function onLogoError() {
          d3.select(this).remove();
          appendPfIcon(g, fallbackPath, colors.stroke, iconY);
        });
    } else {
      appendPfIcon(g, logo.path ?? fallbackPath, colors.stroke, iconY);
    }

    const lines = wrapNodeLabel(d.name);
    const lineHeight = font.size + 2;
    const textBlockHeight = lines.length * lineHeight;
    const textStartY = 6 - textBlockHeight / 2 + lineHeight * 0.8;

    const text = g
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-family', font.family)
      .attr('font-size', font.size)
      .attr('font-weight', 600);

    lines.forEach((line, i) => {
      text
        .append('tspan')
        .attr('x', 0)
        .attr('y', textStartY + i * lineHeight)
        .text(line);
    });
  });

  return {
    svg: svg.node()!,
    destroy: () => {
      container.replaceChildren();
    },
    restart: () => {
      /* static layout */
    },
  };
}

function drawGroups(
  groupLayer: d3.Selection<SVGGElement, unknown, null, undefined>,
  boxes: GroupBox[],
  theme: ThemeMode,
): void {
  const ordered = [...boxes].sort((a, b) => {
    if (a.kind === b.kind) return a.id.localeCompare(b.id);
    return a.kind === 'role' ? -1 : 1;
  });

  const groupSel = groupLayer
    .selectAll<SVGGElement, GroupBox>('g.group')
    .data(ordered, (d) => d.id)
    .join('g')
    .attr('class', (d) => `group group-${d.kind}`)
    .attr('data-id', (d) => d.id);

  groupSel
    .append('rect')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.height)
    .attr('rx', 12)
    .attr('ry', 12)
    .attr('fill', (d) => {
      if (d.kind === 'zone') {
        return theme === 'dark'
          ? 'rgba(146, 197, 249, 0.08)'
          : 'rgba(0, 102, 204, 0.06)';
      }
      return theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    })
    .attr('stroke', (d) => {
      if (d.kind === 'zone') {
        return theme === 'dark' ? '#92c5f9' : '#0066cc';
      }
      return theme === 'dark' ? '#6a6e73' : '#8a8d90';
    })
    .attr('stroke-width', (d) => (d.kind === 'zone' ? 2 : 1.5))
    .attr('stroke-dasharray', (d) => (d.kind === 'zone' ? '6 3' : '2 4'));

  groupSel
    .append('text')
    .attr('x', (d) => d.x + 8)
    .attr('y', (d) => d.y - 6)
    .attr('fill', theme === 'dark' ? '#f0f0f0' : '#151515')
    .attr('font-family', DEFAULT_FONT_FAMILY)
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .text((d) => d.name);
}

function appendPfIcon(
  g: d3.Selection<SVGGElement, LayoutNode, null, undefined>,
  path: string,
  fill: string,
  iconY = -22,
): void {
  if (!path) {
    return;
  }
  g.append('g')
    .attr('transform', `translate(-10,${iconY}) scale(0.02)`)
    .append('path')
    .attr('d', path)
    .attr('fill', fill);
}
