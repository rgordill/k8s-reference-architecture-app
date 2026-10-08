import type { ArchitectureSizing, ArchitectureSizingComponent } from './types';

/** Raw YAML entry: single-key map of component name → resource fields. */
export type RawSizingComponentEntry = Record<
  string,
  {
    replicas?: number;
    memory?: string;
    cpu?: string;
  }
>;

export interface RawArchitectureSizing {
  name: string;
  description?: string;
  components?: RawSizingComponentEntry[];
}

export function normalizeSizing(
  raw: ArchitectureSizing[] | RawArchitectureSizing[] | undefined,
): ArchitectureSizing[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((entry) => ({
    name: entry.name,
    description: entry.description,
    components: normalizeSizingComponents(entry.components),
  }));
}

function normalizeSizingComponents(
  components: ArchitectureSizing['components'] | RawSizingComponentEntry[] | undefined,
): ArchitectureSizingComponent[] {
  if (!components?.length) {
    return [];
  }
  const result: ArchitectureSizingComponent[] = [];
  for (const entry of components) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    if (isNormalizedComponent(entry)) {
      result.push({
        name: entry.name,
        replicas: Math.max(1, Number(entry.replicas) || 1),
        memory: String(entry.memory ?? '0'),
        cpu: String(entry.cpu ?? '0'),
      });
      continue;
    }
    for (const [name, fields] of Object.entries(entry)) {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        continue;
      }
      const resource = fields as {
        replicas?: number;
        memory?: string;
        cpu?: string;
      };
      result.push({
        name,
        replicas: Math.max(1, Number(resource.replicas) || 1),
        memory: String(resource.memory ?? '0'),
        cpu: String(resource.cpu ?? '0'),
      });
    }
  }
  return result;
}

function isNormalizedComponent(
  entry: object,
): entry is ArchitectureSizingComponent {
  return (
    'name' in entry &&
    typeof (entry as ArchitectureSizingComponent).name === 'string' &&
    ('cpu' in entry || 'memory' in entry || 'replicas' in entry)
  );
}

/** Parse Kubernetes CPU quantity to millicores. */
export function parseCpuMillicores(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const milli = trimmed.match(/^([0-9]*\.?[0-9]+)m$/i);
  if (milli) {
    return Number(milli[1]);
  }
  const cores = trimmed.match(/^([0-9]*\.?[0-9]+)$/);
  if (cores) {
    return Number(cores[1]) * 1000;
  }
  return 0;
}

/** Parse Kubernetes memory quantity to bytes (binary suffixes preferred). */
export function parseMemoryBytes(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*([KMGTPE]i?)?$/i);
  if (!match) {
    return 0;
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? '').toLowerCase();
  const factors: Record<string, number> = {
    '': 1,
    k: 1000,
    ki: 1024,
    m: 1000 ** 2,
    mi: 1024 ** 2,
    g: 1000 ** 3,
    gi: 1024 ** 3,
    t: 1000 ** 4,
    ti: 1024 ** 4,
    p: 1000 ** 5,
    pi: 1024 ** 5,
    e: 1000 ** 6,
    ei: 1024 ** 6,
  };
  return amount * (factors[unit] ?? 1);
}

export function formatCpuMillicores(millicores: number): string {
  if (millicores === 0) {
    return '0';
  }
  if (millicores % 1000 === 0) {
    return String(millicores / 1000);
  }
  if (millicores >= 1000) {
    const cores = millicores / 1000;
    const text = cores.toFixed(2).replace(/\.?0+$/, '');
    return text;
  }
  return `${Math.round(millicores)}m`;
}

export function formatMemoryBytes(bytes: number): string {
  if (bytes === 0) {
    return '0';
  }
  const units = [
    { suffix: 'Ei', factor: 1024 ** 6 },
    { suffix: 'Pi', factor: 1024 ** 5 },
    { suffix: 'Ti', factor: 1024 ** 4 },
    { suffix: 'Gi', factor: 1024 ** 3 },
    { suffix: 'Mi', factor: 1024 ** 2 },
    { suffix: 'Ki', factor: 1024 },
  ];
  for (const { suffix, factor } of units) {
    if (bytes >= factor && bytes % factor === 0) {
      return `${bytes / factor}${suffix}`;
    }
    if (bytes >= factor) {
      const value = bytes / factor;
      if (value >= 1) {
        const rounded = Math.round(value * 100) / 100;
        return `${rounded}${suffix}`;
      }
    }
  }
  return String(Math.round(bytes));
}

export interface SizingTableRow {
  name: string;
  replicas: number;
  cpu: string;
  memory: string;
  totalCpuMillicores: number;
  totalMemoryBytes: number;
}

export interface SizingTableModel {
  name: string;
  description?: string;
  showReplicas: boolean;
  rows: SizingTableRow[];
  totalCpu: string;
  totalMemory: string;
}

/** Ordered unique component names across sizing profiles (first-seen order). */
export function collectSizingComponents(
  profiles: ArchitectureSizing[],
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const profile of profiles) {
    for (const component of profile.components) {
      if (seen.has(component.name)) {
        continue;
      }
      seen.add(component.name);
      names.push(component.name);
    }
  }
  return names;
}

export function buildSizingTable(
  sizing: ArchitectureSizing,
  componentOrder?: string[],
): SizingTableModel {
  const byName = new Map(
    sizing.components.map((component) => [component.name, component]),
  );
  const order =
    componentOrder && componentOrder.length > 0
      ? componentOrder
      : sizing.components.map((component) => component.name);

  const rows: SizingTableRow[] = order.map((name) => {
    const component = byName.get(name);
    if (!component) {
      return {
        name,
        replicas: 0,
        cpu: '',
        memory: '',
        totalCpuMillicores: 0,
        totalMemoryBytes: 0,
      };
    }
    const replicas = Math.max(1, component.replicas);
    const perCpu = parseCpuMillicores(component.cpu);
    const perMem = parseMemoryBytes(component.memory);
    return {
      name: component.name,
      replicas,
      cpu: component.cpu,
      memory: component.memory,
      totalCpuMillicores: perCpu * replicas,
      totalMemoryBytes: perMem * replicas,
    };
  });
  const presentRows = rows.filter((row) => row.replicas > 0);
  const showReplicas = presentRows.some((row) => row.replicas > 1);
  const totalCpuMillicores = presentRows.reduce(
    (sum, row) => sum + row.totalCpuMillicores,
    0,
  );
  const totalMemoryBytes = presentRows.reduce(
    (sum, row) => sum + row.totalMemoryBytes,
    0,
  );
  return {
    name: sizing.name,
    description: sizing.description,
    showReplicas,
    rows,
    totalCpu: formatCpuMillicores(totalCpuMillicores),
    totalMemory: formatMemoryBytes(totalMemoryBytes),
  };
}
