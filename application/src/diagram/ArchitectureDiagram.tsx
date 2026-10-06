import { useEffect, useRef, useState } from 'react';
import type { Diagram, StyleDefinition, ThemeMode } from '../data/types';
import { ExportToolbar } from '../components/ExportToolbar';
import { exportPng, exportSvg } from './exportDiagram';
import { renderDiagram, type DiagramRenderHandle } from './renderDiagram';

export interface ArchitectureDiagramProps {
  diagram: Diagram;
  styles: StyleDefinition[];
  theme: ThemeMode;
  exportBasename: string;
}

export function ArchitectureDiagram({
  diagram,
  styles,
  theme,
  exportBasename,
}: ArchitectureDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DiagramRenderHandle | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const styleMap = new Map(styles.map((s) => [s.id, s]));
    const handle = renderDiagram({
      container: host,
      diagram,
      styles: styleMap,
      theme,
      width: host.clientWidth,
      height: host.clientHeight,
    });
    handleRef.current = handle;
    setReady(true);

    const observer = new ResizeObserver(() => {
      handle.destroy();
      const next = renderDiagram({
        container: host,
        diagram,
        styles: styleMap,
        theme,
        width: host.clientWidth,
        height: host.clientHeight,
      });
      handleRef.current = next;
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      handle.destroy();
      handleRef.current = null;
      setReady(false);
    };
  }, [diagram, styles, theme]);

  const onExportSvg = () => {
    const svg = handleRef.current?.svg;
    if (!svg) return;
    exportSvg(svg, `${exportBasename}.svg`);
  };

  const onExportPng = () => {
    const svg = handleRef.current?.svg;
    if (!svg) return;
    void exportPng(svg, `${exportBasename}.png`);
  };

  return (
    <div>
      <ExportToolbar
        onExportSvg={onExportSvg}
        onExportPng={onExportPng}
        disabled={!ready}
      />
      <div className="app-diagram-host" ref={hostRef} data-testid="diagram-host" />
    </div>
  );
}
