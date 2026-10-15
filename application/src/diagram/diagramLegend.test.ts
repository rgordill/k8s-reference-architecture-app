import { describe, expect, it } from 'vitest';
import type { Diagram, StyleDefinition } from '../data/types';
import { collectNodeLegendEntries } from './diagramLegend';

const styles: StyleDefinition[] = [
  {
    id: 'operator',
    kind: 'node',
    colors: {
      light: { fill: '#f3e8ff', stroke: '#7c3aed', text: '#151515' },
      dark: { fill: '#2e1065', stroke: '#c4b5fd', text: '#f0f0f0' },
    },
    edge: { strokeWidth: 4 },
    legend: { text: 'Operator' },
  },
  {
    id: 'application',
    kind: 'node',
    colors: {
      light: { fill: '#f3e8ff', stroke: '#7c3aed', text: '#151515' },
      dark: { fill: '#2e1065', stroke: '#c4b5fd', text: '#f0f0f0' },
    },
    legend: { text: 'Application Active' },
  },
  {
    id: 'standby',
    kind: 'node',
    colors: {
      light: { fill: '#f3e8ff', stroke: '#7c3aed', text: '#151515' },
      dark: { fill: '#2e1065', stroke: '#c4b5fd', text: '#f0f0f0' },
    },
    edge: { strokeWidth: 2, dashArray: '6 4' },
    legend: { text: 'Application Standby' },
  },
  {
    id: 'no-legend',
    kind: 'node',
    colors: {
      light: { fill: '#eee', stroke: '#333', text: '#111' },
      dark: { fill: '#333', stroke: '#eee', text: '#fff' },
    },
  },
];

const diagram: Diagram = {
  nodes: [
    { id: 'op', name: 'Operator', style: 'operator' },
    { id: 'a', name: 'A', style: 'application' },
    { id: 'b', name: 'B', style: 'application' },
    { id: 's', name: 'Standby', style: 'standby' },
    { id: 'x', name: 'Other', style: 'no-legend' },
  ],
  edges: [],
};

describe('collectNodeLegendEntries', () => {
  it('returns unique node styles with legend text in first-appearance order', () => {
    const entries = collectNodeLegendEntries(diagram, styles, 'light');
    expect(entries.map((e) => e.styleId)).toEqual([
      'operator',
      'application',
      'standby',
    ]);
    expect(entries.map((e) => e.text)).toEqual([
      'Operator',
      'Application Active',
      'Application Standby',
    ]);
  });

  it('uses theme stroke and node edge options for the sample line', () => {
    const [operator, , standby] = collectNodeLegendEntries(diagram, styles, 'dark');
    expect(operator.stroke).toBe('#c4b5fd');
    expect(operator.strokeWidth).toBe(4);
    expect(standby.dashArray).toBe('6 4');
    expect(standby.strokeWidth).toBe(2);
  });
});
