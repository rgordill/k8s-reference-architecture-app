import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Diagram, StyleDefinition } from '../data/types';
import { DiagramLegend } from './DiagramLegend';

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
    id: 'standby',
    kind: 'node',
    colors: {
      light: { fill: '#f3e8ff', stroke: '#7c3aed', text: '#151515' },
      dark: { fill: '#2e1065', stroke: '#c4b5fd', text: '#f0f0f0' },
    },
    edge: { strokeWidth: 2, dashArray: '6 4' },
    legend: { text: 'Application Standby' },
  },
];

const diagram: Diagram = {
  nodes: [
    { id: 'op', name: 'Operator', style: 'operator' },
    { id: 's', name: 'Standby', style: 'standby' },
  ],
  edges: [],
};

describe('DiagramLegend', () => {
  it('renders a line sample and label for each node style', () => {
    const { container } = render(
      <DiagramLegend diagram={diagram} styles={styles} theme="light" />,
    );

    expect(screen.getByTestId('diagram-legend')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Application Standby')).toBeInTheDocument();

    const lines = container.querySelectorAll('.app-diagram-legend-swatch line');
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute('stroke')).toBe('#7c3aed');
    expect(lines[0].getAttribute('stroke-width')).toBe('4');
    expect(lines[1].getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('renders nothing when no node styles have legend text', () => {
    const { container } = render(
      <DiagramLegend
        diagram={{ nodes: [{ id: 'a', name: 'A', style: 'missing' }], edges: [] }}
        styles={styles}
        theme="light"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
