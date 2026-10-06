import { describe, expect, it } from 'vitest';
import { wrapNodeLabel } from './renderDiagram';

describe('wrapNodeLabel', () => {
  it('keeps short names on one line', () => {
    expect(wrapNodeLabel('Vault-0')).toEqual(['Vault-0']);
  });

  it('wraps long multi-word names', () => {
    const lines = wrapNodeLabel('Vault Agent Injector');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toContain('Vault');
    expect(lines.join(' ')).toContain('Injector');
  });
});
