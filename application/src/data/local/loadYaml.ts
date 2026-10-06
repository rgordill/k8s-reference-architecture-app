import yaml from 'js-yaml';
import type { Architecture, StyleDefinition } from '../types';

export function parseYamlDocuments<T>(raw: string): T[] {
  const docs = yaml.loadAll(raw);
  return docs.filter((doc): doc is T => doc != null && typeof doc === 'object');
}

/**
 * Architecture fixture files are YAML arrays (or multi-doc) of architecture objects.
 */
export function parseArchitectureFile(raw: string): Architecture[] {
  const loaded = yaml.load(raw);
  if (Array.isArray(loaded)) {
    return loaded as Architecture[];
  }
  if (loaded && typeof loaded === 'object') {
    return [loaded as Architecture];
  }
  return [];
}

export function parseStyleFile(raw: string): StyleDefinition {
  const loaded = yaml.load(raw);
  if (!loaded || typeof loaded !== 'object') {
    throw new Error('Style YAML must be a mapping');
  }
  return loaded as StyleDefinition;
}
