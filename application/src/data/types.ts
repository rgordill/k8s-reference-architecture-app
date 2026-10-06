export type ThemeMode = 'light' | 'dark';

export interface DiagramNode {
  id: string;
  name: string;
  style: string;
}

export interface DiagramGroup {
  id: string;
  name: string;
  nodes: string[];
}

export interface DiagramEdge {
  source: string;
  target: string;
  style: string;
}

export interface Diagram {
  nodes: DiagramNode[];
  groups?: DiagramGroup[];
  edges: DiagramEdge[];
}

export interface Architecture {
  name: string;
  version?: string;
  description: string;
  characteristics: string[];
  usage: string[];
  /** Free-form classification labels used for list filtering */
  tags?: string[];
  dependencies: string[] | Record<string, never>;
  components?: string[];
  source?: string[];
  additionalProperties?: Record<string, string> | Array<Record<string, string>>;
  diagram: Diagram;
}

export interface ArchitectureSummary {
  name: string;
  version?: string;
  description: string;
  usage: string[];
  tags: string[];
}

export type StyleKind = 'node' | 'edge' | 'group';

export interface StyleColors {
  fill: string;
  stroke: string;
  text: string;
}

export interface StyleLogo {
  type: 'patternfly' | 'url';
  /** PatternFly icon export name (e.g. CubeIcon) or an absolute/relative URL */
  value: string;
}

export interface StyleEdgeOptions {
  strokeWidth?: number;
  dashArray?: string;
}

export interface StyleFont {
  family: string;
  size: number;
}

export interface StyleDefinition {
  id: string;
  kind: StyleKind;
  logo?: StyleLogo;
  colors: {
    light: StyleColors;
    dark: StyleColors;
  };
  font?: StyleFont;
  edge?: StyleEdgeOptions;
}

export function normalizeDependencies(
  deps: Architecture['dependencies'],
): string[] {
  if (Array.isArray(deps)) {
    return deps;
  }
  return [];
}

export function normalizeAdditionalProperties(
  props: Architecture['additionalProperties'],
): Array<{ key: string; value: string }> {
  if (!props) {
    return [];
  }
  if (Array.isArray(props)) {
    return props.flatMap((item) =>
      Object.entries(item).map(([key, value]) => ({ key, value })),
    );
  }
  return Object.entries(props).map(([key, value]) => ({ key, value }));
}
