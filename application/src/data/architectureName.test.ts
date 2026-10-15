import { describe, expect, it } from 'vitest';
import { parseArchitectureName } from './architectureName';

describe('parseArchitectureName', () => {
  it('splits technology:product:instance', () => {
    expect(parseArchitectureName('certificates:cert-manager:minimal-olm')).toEqual({
      name: 'certificates:cert-manager:minimal-olm',
      technology: 'certificates',
      product: 'cert-manager',
      instance: 'minimal-olm',
      tokens: ['certificates', 'cert-manager', 'minimal-olm'],
    });
  });

  it('keeps extra segments on the instance token', () => {
    expect(parseArchitectureName('vault:hashicorp-vault:ha-storage-backup')).toEqual({
      name: 'vault:hashicorp-vault:ha-storage-backup',
      technology: 'vault',
      product: 'hashicorp-vault',
      instance: 'ha-storage-backup',
      tokens: ['vault', 'hashicorp-vault', 'ha-storage-backup'],
    });
  });

  it('handles fewer than three tokens', () => {
    expect(parseArchitectureName('vault:dev')).toEqual({
      name: 'vault:dev',
      technology: 'vault',
      product: 'dev',
      tokens: ['vault', 'dev'],
    });
    expect(parseArchitectureName('solo')).toEqual({
      name: 'solo',
      technology: 'solo',
      tokens: ['solo'],
    });
  });
});
