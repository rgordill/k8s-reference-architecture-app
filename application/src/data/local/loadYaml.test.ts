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
      nodes: [a]
    edges:
    - source: op
      target: g1
      style: edge-style
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
        'group g1 references unknown node missing-node',
        'edge references unknown target ghost',
        'edge a->ghost references unknown style missing-edge',
      ]),
    );
  });
});
