/**
 * Serialize an SVG element for download, inlining width/height from the
 * rendered bounding box so exports are self-contained.
 */
function safeBBox(svg: SVGSVGElement): { width: number; height: number } {
  try {
    if (typeof svg.getBBox === 'function') {
      const bbox = svg.getBBox();
      return { width: bbox.width, height: bbox.height };
    }
  } catch {
    // jsdom and detached SVGs may throw
  }
  return {
    width: Number(svg.getAttribute('width')) || svg.clientWidth || 0,
    height: Number(svg.getAttribute('height')) || svg.clientHeight || 0,
  };
}

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bbox = safeBBox(svg);
  const width = Math.max(svg.clientWidth || 0, bbox.width + 40, 320);
  const height = Math.max(svg.clientHeight || 0, bbox.height + 40, 240);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportSvg(svg: SVGSVGElement, filename: string): void {
  const content = serializeSvg(svg);
  downloadTextFile(filename, content, 'image/svg+xml;charset=utf-8');
}

export async function exportPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const content = serializeSvg(svg);
  const width = Number(svg.getAttribute('width')) || svg.clientWidth || 800;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight || 600;

  // Prefer dimensions from serialized clone
  const parsed = new DOMParser().parseFromString(content, 'image/svg+xml');
  const parsedSvg = parsed.documentElement;
  const w = Number(parsedSvg.getAttribute('width')) || width;
  const h = Number(parsedSvg.getAttribute('height')) || height;

  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, w, h);

    const pngUrl = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = pngUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load SVG for PNG export'));
    image.src = url;
  });
}
