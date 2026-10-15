import type { Diagram, StyleDefinition, ThemeMode } from '../data/types';
import { collectNodeLegendEntries } from './diagramLegend';

export interface DiagramLegendProps {
  diagram: Diagram;
  styles: StyleDefinition[];
  theme: ThemeMode;
}

export function DiagramLegend({ diagram, styles, theme }: DiagramLegendProps) {
  const entries = collectNodeLegendEntries(diagram, styles, theme);
  if (entries.length === 0) {
    return null;
  }

  return (
    <aside className="app-diagram-legend" data-testid="diagram-legend" aria-label="Diagram legend">
      <ul className="app-diagram-legend-list">
        {entries.map((entry) => (
          <li key={entry.styleId} className="app-diagram-legend-item" data-style={entry.styleId}>
            <svg
              className="app-diagram-legend-swatch"
              width="40"
              height="14"
              viewBox="0 0 40 14"
              aria-hidden
            >
              <line
                x1="2"
                y1="7"
                x2="38"
                y2="7"
                stroke={entry.stroke}
                strokeWidth={entry.strokeWidth}
                strokeDasharray={entry.dashArray}
                strokeLinecap="round"
              />
            </svg>
            <span className="app-diagram-legend-text">{entry.text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
