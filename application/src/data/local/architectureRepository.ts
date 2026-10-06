import architectureFixtures from 'virtual:architecture-fixtures';
import type { ArchitectureRepository } from '../repositories';
import type { Architecture, ArchitectureSummary } from '../types';
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

function all(): Architecture[] {
  if (!cache) {
    cache = loadAll();
  }
  return cache;
}

export const localArchitectureRepository: ArchitectureRepository = {
  async list(): Promise<ArchitectureSummary[]> {
    return all().map(({ name, version, description, usage, tags }) => ({
      name,
      version,
      description,
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
}
