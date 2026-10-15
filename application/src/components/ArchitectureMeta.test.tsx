import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Architecture } from '../data';
import { ThemeProvider } from '../theme/ThemeContext';
import { ArchitectureMeta } from './ArchitectureMeta';

const sample = (overrides: Partial<Architecture> = {}): Architecture => ({
  name: 'sample:dev',
  description: 'Sample architecture',
  characteristics: ['One characteristic'],
  usage: ['Development'],
  dependencies: {},
  diagram: { nodes: [], edges: [] },
  ...overrides,
});

function renderMeta(architecture: Architecture) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <ArchitectureMeta architecture={architecture} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('ArchitectureMeta', () => {
  it('renders documentation links when present', () => {
    renderMeta(
      sample({
        documentation: [
          'https://example.com/docs',
          'https://example.com/guide',
        ],
      }),
    );

    expect(screen.getByText('Documentation')).toBeInTheDocument();
    const docs = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(docs).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByRole('link', { name: 'https://example.com/guide' })).toBeInTheDocument();
  });

  it('omits documentation when the list is missing', () => {
    renderMeta(sample());
    expect(screen.queryByText('Documentation')).not.toBeInTheDocument();
  });

  it('renders the architecture icon when present', () => {
    renderMeta(
      sample({
        icon: {
          type: 'url',
          value: 'https://example.com/arch.svg',
        },
      }),
    );

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://example.com/arch.svg',
    );
  });
});
