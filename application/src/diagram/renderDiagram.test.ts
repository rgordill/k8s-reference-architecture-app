import { describe, expect, it } from 'vitest';
import type { Diagram, StyleDefinition } from '../data/types';
import { serializeSvg } from './exportDiagram';
import {
  centeredDiagramTransform,
  layoutNodeContent,
  renderDiagram,
} from './renderDiagram';

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
  {
    id: 'group-a',
    kind: 'group',
    colors: {
      light: { fill: 'rgba(0,0,0,0.03)', stroke: '#888', text: '#111' },
      dark: { fill: 'rgba(255,255,255,0.03)', stroke: '#ccc', text: '#fff' },
    },
    edge: { strokeWidth: 1.5, dashArray: '2 4' },
  },
];

const diagram: Diagram = {
  nodes: [
    { id: 'a', name: 'A', style: 'node-a' },
    { id: 'b', name: 'B', style: 'node-a' },
  ],
groups: [{ id: 'g1', name: 'Group', style: 'group-a', nodes: ['a', 'b'] }],
  edges: [{ source: 'a', target: 'b', style: 'edge-a' }],
};

describe('centeredDiagramTransform', () => {
  it('centers smaller content without scaling up', () => {
    const fit = centeredDiagramTransform(800, 600, 200, 100);
    expect(fit.k).toBe(1);
    expect(fit.x).toBe(300);
    expect(fit.y).toBe(250);
  });

  it('scales down and centers content that exceeds the canvas', () => {
    const fit = centeredDiagramTransform(400, 200, 800, 200);
    expect(fit.k).toBe(0.5);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(50);
  });
});

describe('layoutNodeContent', () => {
  it('keeps the icon+text stack centered as line count grows', () => {
    const one = layoutNodeContent(1, 12);
    const three = layoutNodeContent(3, 12);
    expect(three.iconY).toBeLessThan(one.iconY);
    expect(three.textStartY).toBeGreaterThan(three.iconY + 20);
    const oneBottom = one.textStartY + one.lineHeight - 12 * 0.8;
    const threeBottom = three.textStartY + 3 * three.lineHeight - 12 * 0.8;
    expect(one.iconY + oneBottom).toBeCloseTo(0, 5);
    expect(three.iconY + threeBottom).toBeCloseTo(0, 5);
  });
});

describe('renderDiagram', () => {
  it('produces SVG with expected node ids', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 400 });

    const handle = renderDiagram({
      container,
      diagram: {
        ...diagram,
        nodes: [
          { id: 'a', name: '**A**~0~', style: 'node-a' },
          { id: 'b', name: '*B*', style: 'node-a' },
        ],
      },
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 640,
      height: 400,
    });

    const nodeA = handle.svg.querySelector('[data-id="a"]');
    expect(nodeA?.textContent).toContain('A');
    expect(nodeA?.textContent).toContain('0');
    expect(nodeA?.querySelector('tspan[font-weight="800"]')?.textContent).toBe('A');
    expect(nodeA?.querySelector('tspan[baseline-shift="sub"]')?.textContent).toBe('0');
    expect(
      handle.svg.querySelector('[data-id="b"] tspan[font-style="italic"]')?.textContent,
    ).toBe('B');
    expect(handle.svg.querySelector('[data-id="g1"]')?.getAttribute('data-style')).toBe(
      'group-a',
    );
    expect(handle.svg.querySelectorAll('line').length).toBe(1);
    expect(handle.svg.getAttribute('viewBox')).toBe('0 0 640 400');
    expect(handle.svg.querySelector('.diagram-root')?.getAttribute('transform') ?? '').toMatch(
      /translate\(/,
    );
    expect(serializeSvg(handle.svg)).toContain('<svg');

    handle.destroy();
    container.remove();
  });

  it('raises the icon when the label wraps to more lines', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const short = renderDiagram({
      container,
      diagram: {
        nodes: [{ id: 'a', name: 'Short', style: 'node-a' }],
        edges: [],
      },
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const shortIcon = short.svg.querySelector('[data-id="a"] g')?.getAttribute('transform');
    short.destroy();

    const tall = renderDiagram({
      container,
      diagram: {
        nodes: [{ id: 'a', name: 'Vault Agent Injector Extra', style: 'node-a' }],
        edges: [],
      },
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const tallIcon = tall.svg.querySelector('[data-id="a"] g')?.getAttribute('transform');
    const firstLineY = Number(
      tall.svg.querySelector('[data-id="a"] text tspan')?.getAttribute('y'),
    );
    tall.destroy();
    container.remove();

    const shortY = Number(shortIcon?.match(/translate\(-10,(-?[\d.]+)\)/)?.[1]);
    const tallY = Number(tallIcon?.match(/translate\(-10,(-?[\d.]+)\)/)?.[1]);
    expect(tallY).toBeLessThan(shortY);
    expect(firstLineY).toBeGreaterThan(tallY);
  });

  it('draws a dashed node outline when the style sets dashArray', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = renderDiagram({
      container,
      diagram: {
        nodes: [{ id: 'a', name: 'Standby', style: 'node-standby' }],
        edges: [],
      },
      styles: new Map([
        ...styles.map((s) => [s.id, s] as const),
        [
          'node-standby',
          {
            ...styles[0],
            id: 'node-standby',
            edge: { strokeWidth: 2, dashArray: '6 4' },
          },
        ],
      ]),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const circle = handle.svg.querySelector('[data-id="a"] circle');
    expect(circle?.getAttribute('stroke-dasharray')).toBe('6 4');
    handle.destroy();
    container.remove();
  });

  it('formats group names with inline markdown', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = renderDiagram({
      container,
      diagram: {
        nodes: [
          { id: 'a', name: 'A', style: 'node-a' },
          { id: 'b', name: 'B', style: 'node-a' },
        ],
        groups: [{ id: 'g1', name: '**Zone**~0~', style: 'group-a', nodes: ['a', 'b'] }],
        edges: [],
      },
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const group = handle.svg.querySelector('[data-id="g1"]');
    expect(group?.querySelector('tspan[font-weight="800"]')?.textContent).toBe('Zone');
    expect(group?.querySelector('tspan[baseline-shift="sub"]')?.textContent).toBe('0');
    handle.destroy();
    container.remove();
  });

  it('places vertical zone labels to the left of the box', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = renderDiagram({
      container,
      diagram: {
        nodes: [
          { id: 'a', name: 'A', style: 'node-a' },
          { id: 'b', name: 'B', style: 'node-a' },
        ],
        groups: [
          { id: 'zone-0', name: 'Zone~0~', style: 'group-a', nodes: ['a'] },
          { id: 'group-row', name: 'Row', style: 'group-a', nodes: ['a', 'b'] },
        ],
        edges: [],
      },
      styles: new Map(styles.map((s) => [s.id, s])),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const zoneText = handle.svg.querySelector('[data-id="zone-0"] text');
    const rowText = handle.svg.querySelector('[data-id="group-row"] text');
    expect(zoneText?.getAttribute('text-anchor')).toBe('end');
    expect(rowText?.getAttribute('text-anchor')).toBe('start');
    handle.destroy();
    container.remove();
  });

  it('places zone labels outside bottom-center when the style says so', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = renderDiagram({
      container,
      diagram: {
        nodes: [
          { id: 'a', name: 'A', style: 'node-a' },
          { id: 'b', name: 'B', style: 'node-a' },
        ],
        groups: [
          {
            id: 'zone-0',
            name: 'Zone-0',
            style: 'group-zone',
            nodes: ['a'],
          },
          {
            id: 'zone-1',
            name: 'Zone-1',
            style: 'group-zone',
            nodes: ['b'],
          },
        ],
        edges: [],
      },
      styles: new Map([
        ...styles.map((s) => [s.id, s] as const),
        [
          'group-zone',
          {
            id: 'group-zone',
            kind: 'group',
            colors: styles[2].colors,
            box: {
              text: { location: 'out', align: 'bottom', justify: 'center' },
            },
          },
        ],
      ]),
      theme: 'light',
      width: 400,
      height: 300,
    });
    const zone = handle.svg.querySelector('[data-id="zone-0"]');
    const rect = zone?.querySelector('rect');
    const text = zone?.querySelector('text');
    const tspan = zone?.querySelector('tspan');
    expect(text?.getAttribute('text-anchor')).toBe('middle');
    const boxY = Number(rect?.getAttribute('y'));
    const boxH = Number(rect?.getAttribute('height'));
    const boxX = Number(rect?.getAttribute('x'));
    const boxW = Number(rect?.getAttribute('width'));
    expect(Number(tspan?.getAttribute('y'))).toBeGreaterThan(boxY + boxH);
    expect(Number(tspan?.getAttribute('x'))).toBeCloseTo(boxX + boxW / 2, 5);
    handle.destroy();
    container.remove();
  });
});
