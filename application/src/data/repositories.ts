import type { Architecture, ArchitectureSummary, StyleDefinition } from './types';

/**
 * Data access contracts. Local YAML fixtures implement these today;
 * a future Kubernetes client (CRDs / ConfigMaps) can replace the
 * implementations without changing the UI.
 */
export interface ArchitectureRepository {
  list(): Promise<ArchitectureSummary[]>;
  get(name: string): Promise<Architecture | null>;
}

export interface StyleRepository {
  list(): Promise<StyleDefinition[]>;
  get(id: string): Promise<StyleDefinition | null>;
}
