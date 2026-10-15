import styleFixtures from 'virtual:style-fixtures';
import type { StyleRepository } from '../repositories';
import type { StyleDefinition } from '../types';
import { bumpFixtureRevision, hashFixtures } from './fixtureRevision';
import { parseStyleFile } from './loadYaml';

function loadAll(): StyleDefinition[] {
  const byId = new Map<string, StyleDefinition>();
  for (const fixture of styleFixtures) {
    const style = parseStyleFile(fixture.raw);
    if (style?.id) {
      byId.set(style.id, style);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

let cache: StyleDefinition[] | null = null;
let cacheKey = '';

function all(): StyleDefinition[] {
  const key = hashFixtures(styleFixtures);
  if (!cache || cacheKey !== key) {
    cache = loadAll();
    cacheKey = key;
  }
  return cache;
}

export const localStyleRepository: StyleRepository = {
  async list(): Promise<StyleDefinition[]> {
    return all();
  },

  async get(id: string): Promise<StyleDefinition | null> {
    return all().find((s) => s.id === id) ?? null;
  },
};

export function resetStyleCache(): void {
  cache = null;
  cacheKey = '';
}

if (import.meta.hot) {
  import.meta.hot.accept('virtual:style-fixtures', () => {
    resetStyleCache();
    bumpFixtureRevision();
  });
}
