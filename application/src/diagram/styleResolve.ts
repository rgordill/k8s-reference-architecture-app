import type {
  BoxTextAlign,
  BoxTextJustify,
  BoxTextLocation,
  StyleBoxText,
  StyleColors,
  StyleDefinition,
  StyleEdgeOptions,
  StyleFont,
  ThemeMode,
} from '../data/types';

const DEFAULT_NODE_COLORS: Record<ThemeMode, StyleColors> = {
  light: { fill: '#f0f0f0', stroke: '#6a6e73', text: '#151515' },
  dark: { fill: '#3c3f42', stroke: '#b8bbbe', text: '#f0f0f0' },
};

const DEFAULT_EDGE_COLORS: Record<ThemeMode, StyleColors> = {
  light: { fill: 'transparent', stroke: '#6a6e73', text: '#151515' },
  dark: { fill: 'transparent', stroke: '#b8bbbe', text: '#f0f0f0' },
};

const DEFAULT_GROUP_COLORS: Record<ThemeMode, StyleColors> = {
  light: { fill: 'rgba(0,0,0,0.03)', stroke: '#8a8d90', text: '#151515' },
  dark: { fill: 'rgba(255,255,255,0.03)', stroke: '#6a6e73', text: '#f0f0f0' },
};

const DEFAULT_FONT: StyleFont = {
  family: 'RedHatText, Overpass, sans-serif',
  size: 12,
};

const DEFAULT_EDGE: StyleEdgeOptions = {
  strokeWidth: 1.5,
};

export function resolveColors(
  style: StyleDefinition | undefined,
  theme: ThemeMode,
  kind: 'node' | 'edge' | 'group' = 'node',
): StyleColors {
  if (style?.colors?.[theme]) {
    return style.colors[theme];
  }
  if (kind === 'edge') {
    return DEFAULT_EDGE_COLORS[theme];
  }
  if (kind === 'group') {
    return DEFAULT_GROUP_COLORS[theme];
  }
  return DEFAULT_NODE_COLORS[theme];
}

export function resolveFont(style: StyleDefinition | undefined): StyleFont {
  return style?.font ?? DEFAULT_FONT;
}

export function resolveEdgeOptions(
  style: StyleDefinition | undefined,
): StyleEdgeOptions {
  return { ...DEFAULT_EDGE, ...style?.edge };
}

const BOX_LOCATIONS = new Set<BoxTextLocation>(['in', 'out']);
const BOX_ALIGNS = new Set<BoxTextAlign>(['top', 'bottom', 'left', 'right']);
const BOX_JUSTIFIES = new Set<BoxTextJustify>(['left', 'center', 'right']);

export interface ResolvedBoxText {
  location: BoxTextLocation;
  align: BoxTextAlign;
  justify: BoxTextJustify;
}

/**
 * Group title placement. Missing fields fall back to outside, with side
 * from the group's orientation (vertical → left, horizontal → top) and
 * start-edge justify.
 */
export function resolveBoxText(
  style: StyleDefinition | undefined,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): ResolvedBoxText {
  const raw: StyleBoxText = style?.box?.text ?? {};
  const location = BOX_LOCATIONS.has(raw.location as BoxTextLocation)
    ? (raw.location as BoxTextLocation)
    : 'out';
  const align = BOX_ALIGNS.has(raw.align as BoxTextAlign)
    ? (raw.align as BoxTextAlign)
    : orientation === 'vertical'
      ? 'left'
      : 'top';
  const justify = BOX_JUSTIFIES.has(raw.justify as BoxTextJustify)
    ? (raw.justify as BoxTextJustify)
    : 'left';
  return { location, align, justify };
}

/** Map of known PatternFly icon names to inline SVG path data (viewBox 0 0 1024 1024 scaled to 0 0 24 24 via transform). */
const PF_ICON_PATHS: Record<string, string> = {
  LockIcon:
    'M520.3 381.6V296c0-77.2-63.3-140.1-141.3-140.1S237.7 218.8 237.7 296v85.6H172c-18.4 0-33.3 14.9-33.3 33.3v346.7c0 18.4 14.9 33.3 33.3 33.3h410.7c18.4 0 33.3-14.9 33.3-33.3V414.9c0-18.4-14.9-33.3-33.3-33.3h-62.4zM379 216.5c44.1 0 80 35.7 80 79.5v85.6H299V296c0-43.8 35.9-79.5 80-79.5zm62.7 373.3c0 18.4-14.9 33.3-33.3 33.3h-58.7c-18.4 0-33.3-14.9-33.3-33.3v-58.7c0-18.4 14.9-33.3 33.3-33.3h58.7c18.4 0 33.3 14.9 33.3 33.3v58.7z',
  DatabaseIcon:
    'M512 128c-176.7 0-320 53.9-320 120.3v527.3C192 842.1 335.3 896 512 896s320-53.9 320-120.3V248.3C832 181.9 688.7 128 512 128zm256 647.7c0 33.1-114.9 76.3-256 76.3S256 808.8 256 775.7V686c53.5 36.5 147.2 56.3 256 56.3s202.5-19.8 256-56.3v89.7zm0-160c0 33.1-114.9 76.3-256 76.3S256 648.8 256 615.7V526c53.5 36.5 147.2 56.3 256 56.3s202.5-19.8 256-56.3v89.7zm0-160c0 33.1-114.9 76.3-256 76.3S256 488.8 256 455.7V366c53.5 36.5 147.2 56.3 256 56.3s202.5-19.8 256-56.3v89.7zm0-172.3C768 316.5 653.1 359.7 512 359.7S256 316.5 256 283.3 370.9 207 512 207s256 43.2 256 76.4z',
  CubeIcon:
    'M896 288.7L512 128 128 288.7v446.6L512 896l384-160.7V288.7zM512 191.3l288.2 120.7L512 432.7 223.8 312 512 191.3zM192 366.9l288 120.7v334.1L192 701V366.9zm352 454.8V487.6l288-120.7V701L544 821.7z',
  ClusterIcon:
    'M512 128c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 192c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zM256 576c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 192c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm512-192c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 192c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zM390.6 512.9l-90.5 90.5 45.3 45.3 90.5-90.5-45.3-45.3zm333.3 0l-45.3 45.3 90.5 90.5 45.3-45.3-90.5-90.5z',
};

export function resolveAssetUrl(value: string): string {
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) {
    return value;
  }
  const base = import.meta.env.BASE_URL ?? '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${value.replace(/^\//, '')}`;
}

export function resolveLogoHref(
  style: StyleDefinition | undefined,
  theme: ThemeMode = 'light',
): {
  type: 'patternfly' | 'url';
  value: string;
  path?: string;
} {
  const logo = style?.logo;
  if (logo?.type === 'url' && logo.value) {
    const raw =
      theme === 'dark' && logo.valueDark ? logo.valueDark : logo.value;
    return { type: 'url', value: resolveAssetUrl(raw) };
  }
  const name = logo?.value || 'CubeIcon';
  return {
    type: 'patternfly',
    value: name,
    path: PF_ICON_PATHS[name] ?? PF_ICON_PATHS.CubeIcon,
  };
}
