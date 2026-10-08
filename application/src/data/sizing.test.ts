import { describe, expect, it } from 'vitest';
import {
  buildSizingTable,
  collectSizingComponents,
  formatCpuMillicores,
  formatMemoryBytes,
  normalizeSizing,
  parseCpuMillicores,
  parseMemoryBytes,
} from './sizing';

describe('normalizeSizing', () => {
  it('flattens single-key YAML component maps', () => {
    const sizing = normalizeSizing([
      {
        name: 'min',
        description: 'StartUp sizing',
        components: [
          { 'cert-manager-operator': { replicas: 1, memory: '100Mi', cpu: '10m' } },
          { 'cert-manager': { replicas: 2, memory: '50Mi', cpu: '5m' } },
        ],
      },
    ]);
    expect(sizing).toEqual([
      {
        name: 'min',
        description: 'StartUp sizing',
        components: [
          {
            name: 'cert-manager-operator',
            replicas: 1,
            memory: '100Mi',
            cpu: '10m',
          },
          {
            name: 'cert-manager',
            replicas: 2,
            memory: '50Mi',
            cpu: '5m',
          },
        ],
      },
    ]);
  });
});

describe('quantity parsing', () => {
  it('parses cpu millicores and cores', () => {
    expect(parseCpuMillicores('10m')).toBe(10);
    expect(parseCpuMillicores('1')).toBe(1000);
    expect(parseCpuMillicores('0.5')).toBe(500);
  });

  it('parses memory binary units', () => {
    expect(parseMemoryBytes('100Mi')).toBe(100 * 1024 * 1024);
    expect(parseMemoryBytes('1Gi')).toBe(1024 * 1024 * 1024);
  });

  it('formats totals', () => {
    expect(formatCpuMillicores(25)).toBe('25m');
    expect(formatCpuMillicores(1000)).toBe('1');
    expect(formatMemoryBytes(270 * 1024 * 1024)).toBe('270Mi');
  });
});

describe('buildSizingTable', () => {
  it('hides replicas and sums when every component is single-replica', () => {
    const table = buildSizingTable({
      name: 'min',
      components: [
        { name: 'a', replicas: 1, memory: '100Mi', cpu: '10m' },
        { name: 'b', replicas: 1, memory: '50Mi', cpu: '5m' },
      ],
    });
    expect(table.showReplicas).toBe(false);
    expect(table.totalCpu).toBe('15m');
    expect(table.totalMemory).toBe('150Mi');
  });

  it('shows replicas and multiplies resources for totals', () => {
    const table = buildSizingTable({
      name: 'ha',
      components: [
        { name: 'controller', replicas: 2, memory: '50Mi', cpu: '5m' },
        { name: 'webhook', replicas: 3, memory: '20Mi', cpu: '5m' },
      ],
    });
    expect(table.showReplicas).toBe(true);
    // 2*5m + 3*5m = 25m; 2*50 + 3*20 = 160Mi
    expect(table.totalCpu).toBe('25m');
    expect(table.totalMemory).toBe('160Mi');
    expect(table.rows.map((r) => r.replicas)).toEqual([2, 3]);
  });

  it('aligns rows to a shared component order', () => {
    const order = collectSizingComponents([
      {
        name: 'min',
        components: [
          { name: 'a', replicas: 1, memory: '100Mi', cpu: '10m' },
          { name: 'b', replicas: 1, memory: '50Mi', cpu: '5m' },
        ],
      },
      {
        name: 'ha',
        components: [{ name: 'b', replicas: 2, memory: '50Mi', cpu: '5m' }],
      },
    ]);
    expect(order).toEqual(['a', 'b']);
    const ha = buildSizingTable(
      {
        name: 'ha',
        components: [{ name: 'b', replicas: 2, memory: '50Mi', cpu: '5m' }],
      },
      order,
    );
    expect(ha.rows.map((r) => r.name)).toEqual(['a', 'b']);
    expect(ha.rows[0].cpu).toBe('');
    expect(ha.rows[1].replicas).toBe(2);
    expect(ha.totalCpu).toBe('10m');
  });
});
