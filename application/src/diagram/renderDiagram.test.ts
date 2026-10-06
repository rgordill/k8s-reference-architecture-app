import { describe, expect, it } from 'vitest';
import type { Diagram, StyleDefinition } from '../data/types';
import { serializeSvg } from './exportDiagram';
import { renderDiagram } from './renderDiagram';

const styles: StyleDefinition[] = [
  {
    id: 'node-a',
    kind: 'node',
    logo: { type: 'patternfly', value: 'CubeIcon' },
    colors: {
      light: { fill: '#eee', stroke: '#333', text: '#111' },
      dark: { fill: '#333', stroke: '#eee', text: '#fff' },
    },
  },
  {
    id: 'edge-a',
    kind: 'edge',
    colors: {
      light: { fill: 'transparent', stroke: '#666', text: '#111' },
      dark: { fill: 'transparent', stroke: '#ccc', text: '#fff' },
    },
    edge: { strokeWidth: 2 },
  },
];

const diagram: Diagram = {
  nodes: [
    { id: 'a', name: 'A', style: 'node-a' },
    { id: 'b', name: 'B', style: 'node-a' },
  ],
  groups: [{ id: 'g1', name: 'Group', nodes: ['a', 'b'] }],
  edges: [{ source: 'a', target: 'b', style: 'edge-a' }],
};

describe('renderDiagram', () => {
  it('produces SVG with expected node ids', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });

    const handle = renderDiagram({
      container,
      diagram,
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 640,
      height: 400,
    });

    expect(handle.svg.querySelector('[data-id="a"]')).toBeTruthy();
    expect(handle.svg.querySelector('[data-id="b"]')).toBeTruthy();
    expect(handle.svg.querySelectorAll('line').length).toBe(1);

    const serialized = serializeSvg(handle.svg);
    expect(serialized).toContain('<svg');
    expect(serialized.length).toBeGreaterThan(50);

    handle.destroy();
    container.remove();
  });
});
