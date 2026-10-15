import architectureFixtures from 'virtual:architecture-fixtures';
import type { ArchitectureRepository } from '../repositories';
import type { Architecture, ArchitectureSummary } from '../types';
import { bumpFixtureRevision, hashFixtures } from './fixtureRevision';
import { parseArchitectureFile } from './loadYaml';

function loadAll(): Architecture[] {
  const byName = new Map<string, Architecture>();
  for (const fixture of architectureFixtures) {
    for (const arch of parseArchitectureFile(fixture.raw)) {
      if (arch?.name) {
        byName.set(arch.name, arch);
      }
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

let cache: Architecture[] | null = null;
let cacheKey = '';

function all(): Architecture[] {
  const key = hashFixtures(architectureFixtures);
  if (!cache || cacheKey !== key) {
    cache = loadAll();
    cacheKey = key;
  }
  return cache;
}

export const localArchitectureRepository: ArchitectureRepository = {
  async list(): Promise<ArchitectureSummary[]> {
    return all().map(({ name, version, description, icon, usage, tags }) => ({
      name,
      version,
      description,
      icon,
      usage: usage ?? [],
      tags: tags ?? [],
    }));
  },

  async get(name: string): Promise<Architecture | null> {
    return all().find((a) => a.name === name) ?? null;
  },
};

/** Test helper: reset cached fixtures between tests if needed. */
export function resetArchitectureCache(): void {
  cache = null;
  cacheKey = '';
}

if (import.meta.hot) {
  import.meta.hot.accept('virtual:architecture-fixtures', () => {
    resetArchitectureCache();
    bumpFixtureRevision();
  });
}
