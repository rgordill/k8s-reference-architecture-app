export interface MarkdownStyle {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
  sub: boolean;
  sup: boolean;
}

export interface MarkdownSpan {
  text: string;
  style: MarkdownStyle;
}

const DEFAULT_STYLE: MarkdownStyle = {
  bold: false,
  italic: false,
  code: false,
  strike: false,
  sub: false,
  sup: false,
};

function cloneStyle(style: MarkdownStyle): MarkdownStyle {
  return { ...style };
}

function isWordChar(ch: string | undefined): boolean {
  return Boolean(ch && /[A-Za-z0-9]/.test(ch));
}

/**
 * Parse CommonMark-style inline formatting used in node names:
 * **bold**, *italic*, `code`, ~~strike~~, ~sub~, ^sup^, plus backslash escapes.
 */
export function parseInlineMarkdown(input: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  const style = cloneStyle(DEFAULT_STYLE);
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (!buffer) {
      return;
    }
    spans.push({ text: buffer, style: cloneStyle(style) });
    buffer = '';
  };

  const startsWith = (marker: string): boolean => input.startsWith(marker, i);

  const findCloser = (marker: string, from: number): number => {
    let j = from;
    while (j < input.length) {
      if (input[j] === '\\' && j + 1 < input.length) {
        j += 2;
        continue;
      }
      if (input.startsWith(marker, j)) {
        return j;
      }
      j += 1;
    }
    return -1;
  };

  while (i < input.length) {
    if (input[i] === '\\' && i + 1 < input.length) {
      buffer += input[i + 1];
      i += 2;
      continue;
    }

    if (startsWith('**') || startsWith('__')) {
      flush();
      style.bold = !style.bold;
      i += 2;
      continue;
    }
    if (startsWith('~~')) {
      flush();
      style.strike = !style.strike;
      i += 2;
      continue;
    }
    if (startsWith('`')) {
      const close = findCloser('`', i + 1);
      if (close !== -1) {
        flush();
        const prevCode = style.code;
        style.code = true;
        buffer = input.slice(i + 1, close);
        flush();
        style.code = prevCode;
        i = close + 1;
        continue;
      }
    }
    if (input[i] === '~' && !startsWith('~~')) {
      const close = findCloser('~', i + 1);
      if (close !== -1 && !input.startsWith('~~', close)) {
        flush();
        const prev = style.sub;
        style.sub = true;
        buffer = input.slice(i + 1, close);
        flush();
        style.sub = prev;
        i = close + 1;
        continue;
      }
    }
    if (input[i] === '^') {
      const close = findCloser('^', i + 1);
      if (close !== -1) {
        flush();
        const prev = style.sup;
        style.sup = true;
        buffer = input.slice(i + 1, close);
        flush();
        style.sup = prev;
        i = close + 1;
        continue;
      }
    }
    if (input[i] === '*' || input[i] === '_') {
      const marker = input[i];
      const prev = input[i - 1];
      const next = input[i + 1];
      const canOpen = !isWordChar(prev) && next !== undefined && next !== ' ' && next !== marker;
      const canClose = style.italic && !isWordChar(next) && prev !== ' ';
      if ((style.italic && canClose) || (!style.italic && canOpen)) {
        flush();
        style.italic = !style.italic;
        i += 1;
        continue;
      }
    }

    buffer += input[i];
    i += 1;
  }

  flush();
  return spans.filter((span) => span.text.length > 0);
}

export function markdownPlainText(input: string): string {
  return parseInlineMarkdown(input)
    .map((span) => span.text)
    .join('');
}

function sliceSpans(
  spans: MarkdownSpan[],
  start: number,
  end: number,
): MarkdownSpan[] {
  let offset = 0;
  const sliced: MarkdownSpan[] = [];
  for (const span of spans) {
    const spanEnd = offset + span.text.length;
    if (spanEnd <= start) {
      offset = spanEnd;
      continue;
    }
    if (offset >= end) {
      break;
    }
    const from = Math.max(0, start - offset);
    const to = Math.min(span.text.length, end - offset);
    const text = span.text.slice(from, to);
    if (text) {
      sliced.push({ text, style: span.style });
    }
    offset = spanEnd;
  }
  return sliced;
}

function wrapPlainRanges(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
): Array<{ start: number; end: number }> {
  const words = [...text.matchAll(/\S+/g)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  if (words.length === 0) {
    return text ? [{ start: 0, end: Math.min(text.length, maxCharsPerLine) }] : [];
  }

  const ranges: Array<{ start: number; end: number }> = [];
  let lineStart = -1;
  let lineEnd = -1;

  const emitLine = () => {
    if (lineStart >= 0 && ranges.length < maxLines) {
      ranges.push({ start: lineStart, end: lineEnd });
    }
    lineStart = -1;
    lineEnd = -1;
  };

  const splitLongWord = (start: number, end: number) => {
    let cursor = start;
    while (cursor < end && ranges.length < maxLines) {
      const next = Math.min(end, cursor + maxCharsPerLine);
      ranges.push({ start: cursor, end: next });
      cursor = next;
    }
  };

  for (const word of words) {
    if (ranges.length >= maxLines) {
      break;
    }
    const wordLen = word.end - word.start;
    if (lineStart >= 0 && word.end - lineStart <= maxCharsPerLine) {
      lineEnd = word.end;
      continue;
    }
    if (lineStart >= 0) {
      emitLine();
      if (ranges.length >= maxLines) {
        break;
      }
    }
    if (wordLen <= maxCharsPerLine) {
      lineStart = word.start;
      lineEnd = word.end;
      continue;
    }
    splitLongWord(word.start, word.end);
  }
  emitLine();
  return ranges.slice(0, maxLines);
}

export function wrapMarkdownLabel(
  source: string,
  maxCharsPerLine = 11,
  maxLines = 3,
): MarkdownSpan[][] {
  const spans = parseInlineMarkdown(source);
  const plain = spans.map((span) => span.text).join('');
  const ranges = wrapPlainRanges(plain, maxCharsPerLine, maxLines);
  if (ranges.length === 0) {
    return spans.length ? [spans] : [[{ text: source, style: cloneStyle(DEFAULT_STYLE) }]];
  }
  return ranges.map((range) => sliceSpans(spans, range.start, range.end));
}
