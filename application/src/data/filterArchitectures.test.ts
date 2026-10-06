import { describe, expect, it } from 'vitest';
import {
  filterArchitectures,
  matchesNamePattern,
  patternToRegExp,
} from './filterArchitectures';
import type { ArchitectureSummary } from './types';

const items: ArchitectureSummary[] = [
  {
    name: 'cert-manager:openshift-dev',
    description: 'cm',
    usage: ['OpenShift', 'Production'],
    tags: ['cert-manager', 'tls', 'deploy:operator'],
  },
  {
    name: 'hashicorp-vault:ha-storage',
    description: 'ha',
    usage: ['High availability testing'],
    tags: ['vault', 'deploy:helm'],
  },
  {
    name: 'hashicorp-vault:dev',
    description: 'vault',
    usage: ['Development'],
    tags: ['vault', 'deploy:helm'],
  },
];

describe('patternToRegExp / matchesNamePattern', () => {
  it('matches glob-style dependency patterns', () => {
    expect(matchesNamePattern('cert-manager:openshift-dev', 'cert-manager:*')).toBe(true);
    expect(matchesNamePattern('hashicorp-vault:dev', 'cert-manager:*')).toBe(false);
    expect(patternToRegExp('cert-manager:openshift-dev').test('cert-manager:openshift-dev')).toBe(
      true,
    );
  });
});

describe('filterArchitectures', () => {
  it('filters by name pattern', () => {
    const result = filterArchitectures(items, { name: 'cert-manager:*' });
    expect(result.map((a) => a.name)).toEqual(['cert-manager:openshift-dev']);
  });

  it('filters by usage', () => {
    const result = filterArchitectures(items, { usage: 'Development' });
    expect(result.map((a) => a.name)).toEqual(['hashicorp-vault:dev']);
  });

  it('filters by deploy tag', () => {
    const result = filterArchitectures(items, { tag: 'deploy:operator' });
    expect(result.map((a) => a.name)).toEqual(['cert-manager:openshift-dev']);
  });

  it('combines filters', () => {
    const result = filterArchitectures(items, {
      name: 'hashicorp-vault:*',
      tag: 'deploy:helm',
    });
    expect(result.map((a) => a.name)).toEqual([
      'hashicorp-vault:ha-storage',
      'hashicorp-vault:dev',
    ]);
  });
});
