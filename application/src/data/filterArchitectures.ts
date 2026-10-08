import type { ArchitectureSummary } from './types';

export interface ArchitectureFilters {
  /** Case-insensitive substring match against architecture name (`*` → `.*`) */
  name?: string;
  /** Case-insensitive exact match against a usage value */
  usage?: string;
  /** Case-insensitive exact match against a tag */
  tag?: string;
}

/**
 * Convert a dependency / name filter pattern to a RegExp.
 * Matches as a substring (contain). Supports glob-style `*` wildcards.
 */
export function patternToRegExp(pattern: string): RegExp {
  const trimmed = pattern.trim();
  const escaped = trimmed
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

export function matchesNamePattern(name: string, pattern: string): boolean {
  if (!pattern.trim()) {
    return true;
  }
  try {
    return patternToRegExp(pattern).test(name);
  } catch {
    return name.toLowerCase().includes(pattern.toLowerCase());
  }
}

export function filterArchitectures(
  items: ArchitectureSummary[],
  filters: ArchitectureFilters,
): ArchitectureSummary[] {
  const name = filters.name?.trim() ?? '';
  const usage = filters.usage?.trim().toLowerCase() ?? '';
  const tag = filters.tag?.trim().toLowerCase() ?? '';

  return items.filter((item) => {
    if (name && !matchesNamePattern(item.name, name)) {
      return false;
    }
    if (usage) {
      const usages = (item.usage ?? []).map((u) => u.toLowerCase());
      if (!usages.includes(usage)) {
        return false;
      }
    }
    if (tag) {
      const tags = (item.tags ?? []).map((t) => t.toLowerCase());
      if (!tags.includes(tag)) {
        return false;
      }
    }
    return true;
  });
}

export function collectFilterOptions(items: ArchitectureSummary[]): {
  usages: string[];
  tags: string[];
} {
  const usages = new Set<string>();
  const tags = new Set<string>();
  for (const item of items) {
    for (const u of item.usage ?? []) {
      usages.add(u);
    }
    for (const t of item.tags ?? []) {
      tags.add(t);
    }
  }
  return {
    usages: Array.from(usages).sort((a, b) => a.localeCompare(b)),
    tags: Array.from(tags).sort((a, b) => a.localeCompare(b)),
  };
}
