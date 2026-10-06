import { describe, expect, it } from 'vitest';
import type { StyleDefinition } from '../data/types';
import { resolveAssetUrl, resolveBoxText, resolveLogoHref } from './styleResolve';

const style: StyleDefinition = {
  id: 'vault',
  kind: 'node',
  logo: {
    type: 'url',
    value: 'logo/vault/Vault-Community_onLight.svg',
    valueDark: 'logo/vault/Vault-Community_onDark.svg',
  },
  colors: {
    light: { fill: '#fff', stroke: '#000', text: '#000' },
    dark: { fill: '#000', stroke: '#fff', text: '#fff' },
  },
};

describe('resolveLogoHref', () => {
  it('prefixes relative logo URLs with the Vite base path', () => {
    const href = resolveLogoHref(style, 'light');
    expect(href.type).toBe('url');
    expect(href.value).toBe(resolveAssetUrl('logo/vault/Vault-Community_onLight.svg'));
    expect(href.value).toContain('Vault-Community_onLight.svg');
  });

  it('uses valueDark in dark theme', () => {
    const href = resolveLogoHref(style, 'dark');
    expect(href.value).toContain('Vault-Community_onDark.svg');
  });

  it('leaves absolute URLs unchanged', () => {
    const href = resolveLogoHref(
      {
        ...style,
        logo: {
          type: 'url',
          value: 'https://example.com/icon.svg',
        },
      },
      'light',
    );
    expect(href.value).toBe('https://example.com/icon.svg');
  });
});

describe('resolveBoxText', () => {
  it('defaults to outside on the orientation side', () => {
    expect(resolveBoxText(undefined, 'horizontal')).toEqual({
      location: 'out',
      align: 'top',
      justify: 'left',
    });
    expect(resolveBoxText(undefined, 'vertical')).toEqual({
      location: 'out',
      align: 'left',
      justify: 'left',
    });
  });

  it('reads box.text from the style', () => {
    const styled: StyleDefinition = {
      ...style,
      kind: 'group',
      box: { text: { location: 'out', align: 'bottom', justify: 'center' } },
    };
    expect(resolveBoxText(styled, 'vertical')).toEqual({
      location: 'out',
      align: 'bottom',
      justify: 'center',
    });
  });
});
