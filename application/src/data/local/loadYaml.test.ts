import { describe, expect, it } from 'vitest';
import { parseArchitectureFile, parseStyleFile } from './loadYaml';
import { validateArchitecture } from '../validateArchitecture';

describe('parseArchitectureFile', () => {
  it('parses a YAML list of architectures', () => {
    const arches = parseArchitectureFile(`
- name: sample:dev
  description: Sample
  characteristics: []
  usage: []
  dependencies: {}
  diagram:
    nodes:
    - id: a
      name: A
      style: node-style
    edges: []
`);
    expect(arches).toHaveLength(1);
    expect(arches[0].name).toBe('sample:dev');
    expect(arches[0].diagram.nodes).toHaveLength(1);
  });
});

describe('parseStyleFile', () => {
  it('parses a style mapping', () => {
    const style = parseStyleFile(`
id: node-style
kind: node
colors:
  light: { fill: '#fff', stroke: '#000', text: '#000' }
  dark: { fill: '#000', stroke: '#fff', text: '#fff' }
`);
    expect(style.id).toBe('node-style');
    expect(style.kind).toBe('node');
  });

  it('parses group box text placement', () => {
    const style = parseStyleFile(`
id: group-zone
kind: group
colors:
  light: { fill: '#fff', stroke: '#000', text: '#000' }
  dark: { fill: '#000', stroke: '#fff', text: '#fff' }
box:
  text:
    location: out
    align: bottom
    justify: center
`);
    expect(style.box?.text).toEqual({
      location: 'out',
      align: 'bottom',
      justify: 'center',
    });
  });
});

describe('validateArchitecture', () => {
  const styles = [
    {
      id: 'node-style',
      kind: 'node' as const,
      colors: {
        light: { fill: '#fff', stroke: '#000', text: '#000' },
        dark: { fill: '#000', stroke: '#fff', text: '#fff' },
      },
    },
    {
      id: 'edge-style',
      kind: 'edge' as const,
      colors: {
        light: { fill: 'transparent', stroke: '#000', text: '#000' },
        dark: { fill: 'transparent', stroke: '#fff', text: '#fff' },
      },
    },
    {
      id: 'group-style',
      kind: 'group' as const,
      colors: {
        light: { fill: 'rgba(0,0,0,0.03)', stroke: '#888', text: '#000' },
        dark: { fill: 'rgba(255,255,255,0.03)', stroke: '#ccc', text: '#fff' },
      },
    },
  ];

  it('accepts edges that target groups', () => {
    const [arch] = parseArchitectureFile(`
- name: sample:grouped
  description: Sample
  characteristics: []
  usage: []
  tags: [deploy:operator]
  dependencies: {}
  diagram:
    nodes:
    - id: op
      name: Operator
      style: node-style
    - id: a
      name: A
      style: node-style
    groups:
    - id: g1
      name: Group
      style: group-style
      nodes: [a]
    edges:
    - source: op
      target: g1
      style: edge-style
`);
    expect(validateArchitecture(arch, styles)).toEqual([]);
  });

  it('accepts groups that nest other groups and mix in nodes', () => {
    const [arch] = parseArchitectureFile(`
- name: sample:nested
  description: Sample
  characteristics: []
  usage: []
  tags: [deploy:operator]
  dependencies: {}
  diagram:
    nodes:
    - id: a
      name: A
      style: node-style
    - id: b
      name: B
      style: node-style
    - id: extra
      name: Extra
      style: node-style
    groups:
    - id: inner
      name: Inner
      style: group-style
      nodes: [a, b]
    - id: outer
      name: Outer
      style: group-style
      groups: [inner]
      nodes: [extra]
    edges: []
`);
    expect(validateArchitecture(arch, styles)).toEqual([]);
  });

  it('reports unknown styles and dangling references', () => {
    const [arch] = parseArchitectureFile(`
- name: sample:broken
  description: Sample
  characteristics: []
  usage: []
  dependencies: {}
  diagram:
    nodes:
    - id: a
      name: A
      style: missing-node
    groups:
    - id: g1
      name: Group
      nodes: [missing-node]
    edges:
    - source: a
      target: ghost
      style: missing-edge
`);
    const messages = validateArchitecture(arch, styles).map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'node a references unknown style missing-node',
        'group g1 is missing style',
        'group g1 references unknown node missing-node',
        'edge references unknown target ghost',
        'edge a->ghost references unknown style missing-edge',
      ]),
    );
  });

  it('reports nested group cycles', () => {
    const [arch] = parseArchitectureFile(`
- name: sample:cycle
  description: Sample
  characteristics: []
  usage: []
  dependencies: {}
  diagram:
    nodes:
    - id: a
      name: A
      style: node-style
    groups:
    - id: g1
      name: One
      style: group-style
      groups: [g2]
    - id: g2
      name: Two
      style: group-style
      groups: [g1]
    edges: []
`);
    const messages = validateArchitecture(arch, styles).map((i) => i.message);
    expect(messages.some((m) => m.includes('nesting cycle'))).toBe(true);
  });
});
