const XLINK_NS = 'http://www.w3.org/1999/xlink';

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

function applyExportSize(clone: SVGSVGElement, source: SVGSVGElement): void {
  const bbox = safeBBox(source);
  const width = Math.max(source.clientWidth || 0, bbox.width + 40, 320);
  const height = Math.max(source.clientHeight || 0, bbox.height + 40, 240);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
}

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  applyExportSize(clone, svg);
  return new XMLSerializer().serializeToString(clone);
}

function imageHref(el: Element): string {
  return (
    el.getAttribute('href') ||
    el.getAttributeNS(XLINK_NS, 'href') ||
    ''
  );
}

function setImageHref(el: Element, value: string): void {
  el.setAttribute('href', value);
  el.setAttributeNS(XLINK_NS, 'href', value);
}

function absoluteUrl(href: string): string {
  if (
    href.startsWith('data:') ||
    href.startsWith('blob:') ||
    /^(https?:)?\/\//i.test(href)
  ) {
    return href;
  }
  return new URL(href, window.location.href).href;
}

function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function ensureSvgSize(markup: string, width: number, height: number): string {
  if (/\s(width|height)\s*=/i.test(markup)) {
    return markup;
  }
  return markup.replace(
    /<svg\b/i,
    `<svg width="${width}" height="${height}"`,
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = url;
  });
}

async function svgMarkupToPngDataUri(
  markup: string,
  width: number,
  height: number,
): Promise<string> {
  const sized = ensureSvgSize(markup, width, height);
  const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function hrefToEmbeddedData(
  href: string,
  displayWidth: number,
  displayHeight: number,
  fetchFn: typeof fetch,
): Promise<string> {
  if (href.startsWith('data:')) {
    return href;
  }
  const url = absoluteUrl(href);
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const mime = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim();
  const head = new TextDecoder().decode(bytes.slice(0, 64));
  const looksSvg =
    mime.includes('svg') ||
    /\.svg(\?|$)/i.test(url) ||
    head.includes('<svg');
  if (looksSvg) {
    const markup = new TextDecoder().decode(bytes);
    const rasterW = Math.max(128, Math.round(displayWidth * 4));
    const rasterH = Math.max(128, Math.round(displayHeight * 4));
    try {
      return await svgMarkupToPngDataUri(markup, rasterW, rasterH);
    } catch {
      return bytesToDataUri(bytes, 'image/svg+xml');
    }
  }
  return bytesToDataUri(bytes, mime || 'application/octet-stream');
}

/** Fetch `<image>` hrefs and rewrite them to data URIs so canvas PNG export can paint logos. */
export async function inlineSvgImages(
  root: SVGSVGElement,
  fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init),
): Promise<void> {
  const images = Array.from(root.getElementsByTagName('image'));
  await Promise.all(
    images.map(async (el) => {
      const href = imageHref(el);
      if (!href || href.startsWith('data:')) {
        return;
      }
      const displayWidth = Number(el.getAttribute('width')) || 32;
      const displayHeight = Number(el.getAttribute('height')) || 32;
      try {
        const data = await hrefToEmbeddedData(
          href,
          displayWidth,
          displayHeight,
          fetchFn,
        );
        setImageHref(el, data);
      } catch {
        // Keep the original href; export still proceeds without that logo.
      }
    }),
  );
}

export async function serializeSvgForExport(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  applyExportSize(clone, svg);
  await inlineSvgImages(clone);
  return new XMLSerializer().serializeToString(clone);
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

export async function exportSvg(svg: SVGSVGElement, filename: string): Promise<void> {
  const content = await serializeSvgForExport(svg);
  downloadTextFile(filename, content, 'image/svg+xml;charset=utf-8');
}

export async function exportPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const content = await serializeSvgForExport(svg);
  const width = Number(svg.getAttribute('width')) || svg.clientWidth || 800;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight || 600;

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
