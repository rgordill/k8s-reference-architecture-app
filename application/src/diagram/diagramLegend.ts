import type { Diagram, StyleDefinition, ThemeMode } from '../data/types';
import { resolveColors, resolveEdgeOptions } from './styleResolve';

export interface DiagramLegendEntry {
  styleId: string;
  text: string;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
}

/**
 * Unique node styles used in the diagram, in first-appearance order.
 * Only styles with `legend.text` are included.
 */
export function collectNodeLegendEntries(
  diagram: Diagram,
  styles: ReadonlyMap<string, StyleDefinition> | StyleDefinition[],
  theme: ThemeMode,
): DiagramLegendEntry[] {
  const styleMap =
    styles instanceof Map
      ? styles
      : new Map((styles as StyleDefinition[]).map((style) => [style.id, style]));

  const seen = new Set<string>();
  const entries: DiagramLegendEntry[] = [];

  for (const node of diagram.nodes) {
    if (seen.has(node.style)) {
      continue;
    }
    seen.add(node.style);

    const style = styleMap.get(node.style);
    const text = style?.legend?.text?.trim();
    if (!text) {
      continue;
    }

    const colors = resolveColors(style, theme, 'node');
    const edge = resolveEdgeOptions(style);
    entries.push({
      styleId: node.style,
      text,
      stroke: colors.stroke,
      strokeWidth: edge.strokeWidth ?? 2,
      dashArray: edge.dashArray,
    });
  }

  return entries;
}
