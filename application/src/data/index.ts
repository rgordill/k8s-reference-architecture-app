import { localArchitectureRepository } from './local/architectureRepository';
import { localStyleRepository } from './local/styleRepository';
import type { ArchitectureRepository, StyleRepository } from './repositories';

export type { ArchitectureRepository, StyleRepository } from './repositories';
export type * from './types';
export {
  normalizeDependencies,
  normalizeAdditionalProperties,
} from './types';
export {
  buildSizingTable,
  collectSizingComponents,
  formatCpuMillicores,
  formatMemoryBytes,
  normalizeSizing,
  parseCpuMillicores,
  parseMemoryBytes,
} from './sizing';
export {
  filterArchitectures,
  collectFilterOptions,
  matchesNamePattern,
  patternToRegExp,
  type ArchitectureFilters,
} from './filterArchitectures';
export { validateArchitecture } from './validateArchitecture';

/**
 * Active data sources. Swap these for Kubernetes-backed repositories later.
 */
export const architectureRepository: ArchitectureRepository =
  localArchitectureRepository;

export const styleRepository: StyleRepository = localStyleRepository;
