export type ThemeMode = 'light' | 'dark';

export interface DiagramNode {
  id: string;
  name: string;
  /** Optional component id shown as the node tooltip. */
  component?: string;
  style: string;
}

export interface DiagramGroup {
  id: string;
  name: string;
  /** Direct member nodes. */
  nodes?: string[];
  /** Nested groups whose members are also members of this group. */
  groups?: string[];
  style?: string;
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

export interface ArchitectureSizingComponent {
  name: string;
  replicas: number;
  memory: string;
  cpu: string;
}

export interface ArchitectureSizing {
  name: string;
  description?: string;
  components: ArchitectureSizingComponent[];
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
  documentation?: string[];
  /** Optional resource sizing profiles (one table per name). */
  sizing?: ArchitectureSizing[] | Array<{
    name: string;
    description?: string;
    components?: Array<Record<string, { replicas?: number; memory?: string; cpu?: string }>>;
  }>;
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
  /** PatternFly icon export name, or a relative/absolute URL for `type: url` (light theme). */
  value: string;
  /** Optional dark-theme URL when `type` is `url`. Falls back to `value`. */
  valueDark?: string;
}

export interface StyleEdgeOptions {
  strokeWidth?: number;
  dashArray?: string;
}

export interface StyleFont {
  family: string;
  size: number;
}

export type BoxTextLocation = 'in' | 'out';
export type BoxTextAlign = 'top' | 'bottom' | 'left' | 'right';
export type BoxTextJustify = 'left' | 'center' | 'right';

/** Group-box title placement: inside or outside, which side, and along-edge alignment. */
export interface StyleBoxText {
  location?: BoxTextLocation;
  align?: BoxTextAlign;
  justify?: BoxTextJustify;
}

export interface StyleBox {
  text?: StyleBoxText;
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
  box?: StyleBox;
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
