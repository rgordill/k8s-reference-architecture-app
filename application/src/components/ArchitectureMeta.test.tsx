import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Architecture } from '../data';
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

describe('ArchitectureMeta', () => {
  it('renders documentation links when present', () => {
    render(
      <MemoryRouter>
        <ArchitectureMeta
          architecture={sample({
            documentation: [
              'https://example.com/docs',
              'https://example.com/guide',
            ],
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Documentation')).toBeInTheDocument();
    const docs = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(docs).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByRole('link', { name: 'https://example.com/guide' })).toBeInTheDocument();
  });

  it('omits documentation when the list is missing', () => {
    render(
      <MemoryRouter>
        <ArchitectureMeta architecture={sample()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Documentation')).not.toBeInTheDocument();
  });
});
