import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { architectureRepository } from '../data';
import { ArchitectureListPage } from './ArchitectureListPage';

describe('ArchitectureListPage', () => {
  it('lists every architecture from the repository', async () => {
    const summaries = await architectureRepository.list();
    expect(summaries.length).toBeGreaterThan(0);

    render(
      <MemoryRouter>
        <ArchitectureListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      for (const item of summaries) {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      }
    });
  });

  it('filters by name query param substring', async () => {
    const summaries = await architectureRepository.list();
    const prefix = summaries[0].name.split(':')[0];
    const matching = summaries.filter((item) =>
      item.name.toLowerCase().includes(prefix.toLowerCase()),
    );
    const excluded = summaries.find((item) => !matching.some((m) => m.name === item.name));

    render(
      <MemoryRouter initialEntries={[`/?name=${encodeURIComponent(prefix)}`]}>
        <ArchitectureListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      for (const item of matching) {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      }
    });
    if (excluded) {
      expect(screen.queryByText(excluded.name)).not.toBeInTheDocument();
    }
  });

  it('updates name filter from the search input', async () => {
    const summaries = await architectureRepository.list();
    expect(summaries.length).toBeGreaterThan(1);
    const selected = summaries[0];
    const other = summaries[1];
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ArchitectureListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(selected.name)).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Filter by name');
    await user.clear(input);
    await user.type(input, selected.name);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: selected.name })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: other.name })).not.toBeInTheDocument();
    });
  });
});
