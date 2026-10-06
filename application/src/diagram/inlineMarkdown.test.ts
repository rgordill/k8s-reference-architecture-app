import { describe, expect, it } from 'vitest';
import {
  markdownPlainText,
  parseInlineMarkdown,
  wrapMarkdownLabel,
} from './inlineMarkdown';

describe('parseInlineMarkdown', () => {
  it('keeps plain text unchanged', () => {
    expect(markdownPlainText('Controller-0')).toBe('Controller-0');
    expect(parseInlineMarkdown('Controller-0')).toEqual([
      {
        text: 'Controller-0',
        style: {
          bold: false,
          italic: false,
          code: false,
          strike: false,
          sub: false,
          sup: false,
        },
      },
    ]);
  });

  it('parses bold, italic, code, strike, sub, and sup', () => {
    const spans = parseInlineMarkdown('**Ctl***x*`id`~~old~~v~0~^2^');
    expect(markdownPlainText('**Ctl***x*`id`~~old~~v~0~^2^')).toBe('Ctlxidoldv02');
    expect(spans.find((s) => s.text === 'Ctl')?.style.bold).toBe(true);
    expect(spans.find((s) => s.text === 'x')?.style.italic).toBe(true);
    expect(spans.find((s) => s.text === 'id')?.style.code).toBe(true);
    expect(spans.find((s) => s.text === 'old')?.style.strike).toBe(true);
    expect(spans.find((s) => s.text === '0')?.style.sub).toBe(true);
    expect(spans.find((s) => s.text === '2')?.style.sup).toBe(true);
  });

  it('treats unmatched markers as literal', () => {
    expect(markdownPlainText('Controller~0')).toBe('Controller~0');
  });

  it('honors backslash escapes', () => {
    expect(markdownPlainText('\\*star\\*')).toBe('*star*');
  });
});

describe('wrapMarkdownLabel', () => {
  it('keeps short formatted names on one line', () => {
    const lines = wrapMarkdownLabel('Controller~0~');
    expect(lines).toHaveLength(1);
    expect(lines[0].map((s) => s.text).join('')).toBe('Controller0');
    expect(lines[0][1]?.style.sub).toBe(true);
  });

  it('wraps visible text without breaking style runs across the wrong offsets', () => {
    const lines = wrapMarkdownLabel('**Vault Agent Injector**');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.flat().every((s) => s.style.bold)).toBe(true);
    expect(lines.flat().map((s) => s.text).join(' ')).toContain('Vault');
  });
});
