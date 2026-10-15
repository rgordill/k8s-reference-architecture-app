import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

const STORAGE_KEY = 'k8s-reference-architecture-app-theme';

function Probe() {
  const { theme, preference, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="preference">{preference}</span>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('pf-v6-theme-dark');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  it('defaults to browser preference and resolves navigator theme', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('browser');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('browser');
    expect(document.documentElement.classList.contains('pf-v6-theme-dark')).toBe(
      true,
    );
  });

  it('cycles light → dark → browser', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('light');

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('preference')).toHaveTextContent('browser');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('browser');
  });

  it('migrates legacy system storage value to browser', () => {
    window.localStorage.setItem(STORAGE_KEY, 'system');

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('browser');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('browser');
  });

  it('follows browser changes while preference is browser', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          listeners.add(listener);
        },
        removeEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          listeners.delete(listener);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    act(() => {
      listeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent),
      );
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });
});
