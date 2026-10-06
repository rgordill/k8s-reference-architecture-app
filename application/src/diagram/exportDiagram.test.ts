import { describe, expect, it, vi } from 'vitest';
import {
  downloadTextFile,
  inlineSvgImages,
  serializeSvg,
} from './exportDiagram';

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
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    const click = vi.fn();
    const originalCreateEl = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateEl(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    downloadTextFile('demo.svg', '<svg />', 'image/svg+xml');
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreate,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevoke,
    });
    vi.restoreAllMocks();
  });

  it('inlines external image hrefs as data URIs', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', '/logo/vault/mark.png');
    image.setAttribute('width', '24');
    image.setAttribute('height', '24');
    svg.appendChild(image);
    document.body.appendChild(svg);

    const png = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
      0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
      156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
      174, 66, 96, 130,
    ]);
    const fetchFn: typeof fetch = async () =>
      new Response(png, { headers: { 'Content-Type': 'image/png' } });

    await inlineSvgImages(svg, fetchFn);
    expect(image.getAttribute('href')).toMatch(/^data:image\/png/);
    svg.remove();
  });
});
