import { describe, expect, it, vi } from 'vitest';
import { downloadTextFile, serializeSvg } from './exportDiagram';

describe('exportDiagram', () => {
  it('serializeSvg returns non-empty svg markup', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '80');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '10');
    circle.setAttribute('cy', '10');
    circle.setAttribute('r', '5');
    svg.appendChild(circle);
    document.body.appendChild(svg);

    // jsdom getBBox is not implemented; stub it
    (svg as SVGSVGElement & { getBBox: () => DOMRect }).getBBox = () =>
      ({
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        top: 0,
        left: 0,
        bottom: 80,
        right: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    const content = serializeSvg(svg);
    expect(content).toContain('svg');
    expect(content.length).toBeGreaterThan(20);
    svg.remove();
  });

  it('downloadTextFile creates an object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    downloadTextFile('demo.svg', '<svg />', 'image/svg+xml');
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
