import * as d3 from 'd3';
import type { Diagram, StyleDefinition, ThemeMode } from '../data/types';
import {
  collectAllGroupNodeIds,
} from '../data/groupMembership';
import { parseInlineMarkdown, wrapMarkdownLabel, type MarkdownSpan } from './inlineMarkdown';
import { computeGridLayout, resolveEdgeEndpoints, type GroupBox, type Point } from './layoutGrid';
import {
  resolveColors,
  resolveEdgeOptions,
  resolveFont,
  resolveLogoHref,
} from './styleResolve';

export interface GroupLabelPlacement {
  x: number;
  firstY: number;
  textAnchor: 'start' | 'middle' | 'end';
}

/** SVG anchor for a group title from box.text style fields. */
export function groupLabelPlacement(
  box: GroupBox,
  fontSize: number,
  lineCount: number,
  lineHeight: number,
): GroupLabelPlacement {
  const inset = 8;
  const outside = box.labelLocation === 'out';
  const alongTopOrBottom = box.labelAlign === 'top' || box.labelAlign === 'bottom';

  if (alongTopOrBottom) {
    let textAnchor: GroupLabelPlacement['textAnchor'] = 'start';
    let x = box.x + inset;
    if (box.labelJustify === 'center') {
      textAnchor = 'middle';
      x = box.x + box.width / 2;
    } else if (box.labelJustify === 'right') {
      textAnchor = 'end';
      x = box.x + box.width - inset;
    }
    const firstY =
      box.labelAlign === 'top'
        ? outside
          ? box.y - 6 - (lineCount - 1) * lineHeight
          : box.y + fontSize + 4
        : outside
          ? box.y + box.height + fontSize + 4
          : box.y + box.height - 6 - (lineCount - 1) * lineHeight;
    return { x, firstY, textAnchor };
  }

  const onLeft = box.labelAlign === 'left';
  const textAnchor: GroupLabelPlacement['textAnchor'] = onLeft
    ? outside
      ? 'end'
      : 'start'
    : outside
      ? 'start'
      : 'end';
  const x = onLeft
    ? outside
      ? box.x - inset
      : box.x + inset
    : outside
      ? box.x + box.width + inset
      : box.x + box.width - inset;
  const textHeight = lineCount * lineHeight;
  let firstY = box.y + fontSize;
  if (box.labelJustify === 'center') {
    firstY = box.y + box.height / 2 - textHeight / 2 + fontSize;
  } else if (box.labelJustify === 'right') {
    firstY = box.y + box.height - 6 - (lineCount - 1) * lineHeight;
  }
  return { x, firstY, textAnchor };
}

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
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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
const NODE_ICON_SIZE = 20;
const NODE_ICON_TEXT_GAP = 4;

/**
 * Vertically center the icon + wrapped label inside the node.
 * More text lines grow the stack equally above and below the node origin.
 */
export function layoutNodeContent(
  lineCount: number,
  fontSize: number,
  iconSize = NODE_ICON_SIZE,
  gap = NODE_ICON_TEXT_GAP,
): { iconY: number; textStartY: number; lineHeight: number } {
  const lines = Math.max(1, lineCount);
  const lineHeight = fontSize + 2;
  const textBlockHeight = lines * lineHeight;
  const stackHeight = iconSize + gap + textBlockHeight;
  const iconY = -stackHeight / 2;
  const textTop = iconY + iconSize + gap;
  const textStartY = textTop + fontSize * 0.8;
  return { iconY, textStartY, lineHeight };
}

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

/**
 * Translate (and scale down if needed) so content is centered in the viewport.
 * Scale never exceeds 1 — small diagrams stay native size in the middle.
 */
export function centeredDiagramTransform(
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
): { x: number; y: number; k: number } {
  const cw = Math.max(contentWidth, 1);
  const ch = Math.max(contentHeight, 1);
  const k = Math.min(1, viewportWidth / cw, viewportHeight / ch);
  return {
    k,
    x: (viewportWidth - cw * k) / 2,
    y: (viewportHeight - ch * k) / 2,
  };
}

export function renderDiagram(options: RenderDiagramOptions): DiagramRenderHandle {
  const { container, diagram, styles, theme } = options;
  const width = options.width ?? (container.clientWidth || 800);
  const height = options.height ?? (container.clientHeight || 480);

  container.replaceChildren();

  const layout = computeGridLayout(diagram, {
    nodeSize: NODE_RADIUS * 2,
    styles,
  });
  const nodeIdSet = new Set(diagram.nodes.map((n) => n.id));
  const membersByGroup = collectAllGroupNodeIds(diagram.groups ?? [], nodeIdSet);
  const nodeById = new Map(
    diagram.nodes.map((n) => {
      const pos = layout.positions.get(n.id) ?? { x: 0, y: 0 };
      const laid: LayoutNode = {
        id: n.id,
        name: n.name,
        styleId: n.style,
        groupIds: (diagram.groups ?? [])
          .filter((g) => (membersByGroup.get(g.id) ?? []).includes(n.id))
          .map((g) => g.id),
        x: pos.x,
        y: pos.y,
      };
      return [n.id, laid] as const;
    }),
  );
  const nodes = Array.from(nodeById.values());

  const groupById = new Map(layout.groupBoxes.map((box) => [box.id, box]));

  const asAnchor = (id: string): Point | GroupBox | null => {
    const node = nodeById.get(id);
    if (node) {
      return { x: node.x, y: node.y };
    }
    return groupById.get(id) ?? null;
  };

  const links: LayoutLink[] = diagram.edges
    .map((e) => {
      const source = asAnchor(e.source);
      const target = asAnchor(e.target);
      if (!source || !target) {
        return null;
      }
      const { start, end } = resolveEdgeEndpoints(source, target);
      return {
        source: e.source,
        target: e.target,
        styleId: e.style,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
      };
    })
    .filter((link): link is LayoutLink => link != null);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('role', 'img')
    .attr('aria-label', 'Architecture diagram')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const root = svg.append('g').attr('class', 'diagram-root');
  const fit = centeredDiagramTransform(
    width,
    height,
    layout.contentWidth,
    layout.contentHeight,
  );

  // Pan/zoom for inspection only — positions stay fixed. Default view is
  // centered (and scaled down if the layout is larger than the canvas).
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([Math.min(0.25, fit.k), 2.5])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString());
    });
  svg.call(zoom);
  svg.call(
    zoom.transform,
    d3.zoomIdentity.translate(fit.x, fit.y).scale(fit.k),
  );

  const groupLayer = root.append('g').attr('class', 'groups');
  const linkLayer = root.append('g').attr('class', 'links');
  const nodeLayer = root.append('g').attr('class', 'nodes');

  drawGroups(groupLayer, layout.groupBoxes, styles, theme);

  linkLayer
    .selectAll<SVGLineElement, LayoutLink>('line')
    .data(links)
    .join('line')
    .attr('data-style', (d) => d.styleId)
    .attr('x1', (d) => d.x1)
    .attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2)
    .attr('y2', (d) => d.y2)
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
    const logo = resolveLogoHref(style, theme);
    const fallbackPath =
      resolveLogoHref({
        id: 'fallback',
        kind: 'node',
        logo: { type: 'patternfly', value: 'CubeIcon' },
        colors: style?.colors ?? {
          light: { fill: '#eee', stroke: '#333', text: '#111' },
          dark: { fill: '#333', stroke: '#eee', text: '#fff' },
        },
      }, theme).path ?? '';

    const edgeOpts = resolveEdgeOptions(style);

    g.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', colors.fill)
      .attr('stroke', colors.stroke)
      .attr('stroke-width', edgeOpts.strokeWidth ?? 2)
      .attr('stroke-dasharray', edgeOpts.dashArray ?? null);

    const iconSize = NODE_ICON_SIZE;
    const lines = wrapMarkdownLabel(d.name);
    const { iconY, textStartY, lineHeight } = layoutNodeContent(
      lines.length,
      font.size,
      iconSize,
    );

    if (logo.type === 'url') {
      g.append('image')
        .attr('href', logo.value)
        .attr('xlink:href', logo.value)
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

    const text = g
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-family', font.family)
      .attr('font-size', font.size)
      .attr('font-weight', 600);

    lines.forEach((spans, i) => {
      const line = text
        .append('tspan')
        .attr('x', 0)
        .attr('y', textStartY + i * lineHeight);
      appendMarkdownSpans(line, spans, font.size, font.family);
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

function appendMarkdownSpans<Datum>(
  line: d3.Selection<SVGTSpanElement, Datum, null | SVGGElement, undefined>,
  spans: MarkdownSpan[],
  fontSize: number,
  fontFamily: string,
): void {
  const runs = spans.length > 0 ? spans : [{ text: '', style: {
    bold: false, italic: false, code: false, strike: false, sub: false, sup: false,
  } }];
  runs.forEach((span) => {
    const tspan = line.append('tspan').text(span.text);
    tspan.attr('font-weight', span.style.bold ? 800 : 600);
    if (span.style.italic) {
      tspan.attr('font-style', 'italic');
    }
    if (span.style.code) {
      tspan.attr('font-family', 'RedHatMono, ui-monospace, monospace');
    } else {
      tspan.attr('font-family', fontFamily);
    }
    if (span.style.strike) {
      tspan.attr('text-decoration', 'line-through');
    }
    if (span.style.sub || span.style.sup) {
      tspan.attr('font-size', fontSize * 0.75);
      tspan.attr('baseline-shift', span.style.sub ? 'sub' : 'super');
    }
  });
}

function drawGroups(
  groupLayer: d3.Selection<SVGGElement, unknown, null, undefined>,
  boxes: GroupBox[],
  styles: Map<string, StyleDefinition>,
  theme: ThemeMode,
): void {
  const ordered = [...boxes].sort((a, b) => {
    if (a.nestDepth !== b.nestDepth) return a.nestDepth - b.nestDepth;
    if (a.kind === b.kind) return a.id.localeCompare(b.id);
    return a.kind === 'role' ? -1 : 1;
  });

  const groupSel = groupLayer
    .selectAll<SVGGElement, GroupBox>('g.group')
    .data(ordered, (d) => d.id)
    .join('g')
    .attr('class', (d) => `group group-${d.kind}`)
    .attr('data-id', (d) => d.id)
    .attr('data-style', (d) => d.styleId ?? '');

  groupSel
    .append('rect')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.height)
    .attr('rx', 12)
    .attr('ry', 12)
    .attr('fill', (d) => resolveColors(styles.get(d.styleId ?? ''), theme, 'group').fill)
    .attr('stroke', (d) => resolveColors(styles.get(d.styleId ?? ''), theme, 'group').stroke)
    .attr(
      'stroke-width',
      (d) => resolveEdgeOptions(styles.get(d.styleId ?? '')).strokeWidth ?? 1.5,
    )
    .attr(
      'stroke-dasharray',
      (d) => resolveEdgeOptions(styles.get(d.styleId ?? '')).dashArray ?? null,
    );

  groupSel.each(function drawGroupLabel(d) {
    const g = d3.select(this);
    const style = styles.get(d.styleId ?? '');
    const font = resolveFont(style);
    const colors = resolveColors(style, theme, 'group');
    const lines = wrapMarkdownLabel(d.name, 48, 2);
    const lineHeight = font.size + 2;
    const place = groupLabelPlacement(d, font.size, lines.length, lineHeight);

    const text = g
      .append('text')
      .attr('text-anchor', place.textAnchor)
      .attr('fill', colors.text)
      .attr('font-family', font.family)
      .attr('font-size', font.size)
      .attr('font-weight', 600);

    lines.forEach((spans, i) => {
      const line = text
        .append('tspan')
        .attr('x', place.x)
        .attr('y', place.firstY + i * lineHeight);
      appendMarkdownSpans(
        line,
        spans.length ? spans : parseInlineMarkdown(d.name),
        font.size,
        font.family,
      );
    });
  });
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
