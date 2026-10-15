import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { architectureRepository } from '../data';
import { ThemeProvider } from '../theme/ThemeContext';
import { ArchitectureListPage } from './ArchitectureListPage';

function renderList(initialEntries?: string[]) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <ArchitectureListPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('ArchitectureListPage', () => {
  it('lists every architecture from the repository', async () => {
    const summaries = await architectureRepository.list();
    expect(summaries.length).toBeGreaterThan(0);

    renderList();

    await waitFor(() => {
      for (const item of summaries) {
        expect(screen.getByRole('link', { name: item.name })).toBeInTheDocument();
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

    renderList([`/?name=${encodeURIComponent(prefix)}`]);

    await waitFor(() => {
      for (const item of matching) {
        expect(screen.getByRole('link', { name: item.name })).toBeInTheDocument();
      }
    });
    if (excluded) {
      expect(screen.queryByRole('link', { name: excluded.name })).not.toBeInTheDocument();
    }
  });

  it('updates name filter from the search input', async () => {
    const summaries = await architectureRepository.list();
    expect(summaries.length).toBeGreaterThan(1);
    const selected = summaries[0];
    const other = summaries[1];
    const user = userEvent.setup();

    renderList();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: selected.name })).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Filter by name');
    await user.clear(input);
    await user.type(input, selected.name);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: selected.name })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: other.name })).not.toBeInTheDocument();
    });
  });

  it('shows icons for architectures that define one', async () => {
    const summaries = await architectureRepository.list();
    const withIcon = summaries.find((item) => item.icon?.type === 'url' && item.icon.value);
    expect(withIcon).toBeDefined();

    renderList();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: withIcon!.name })).toBeInTheDocument();
    });

    const icons = screen.getAllByRole('presentation');
    expect(icons.some((img) => img.getAttribute('src') === withIcon!.icon!.value)).toBe(
      true,
    );
  });

  it('renders architecture name tokens separately', async () => {
    const summaries = await architectureRepository.list();
    const named = summaries.find((item) => item.name.split(':').length >= 3);
    expect(named).toBeDefined();
    const [technology, product, instance] = named!.name.split(':');

    renderList();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: named!.name })).toBeInTheDocument();
    });

    const nameEl = screen
      .getByRole('link', { name: named!.name })
      .querySelector('[data-testid="architecture-name"]');
    expect(nameEl).not.toBeNull();
    expect(nameEl).toHaveTextContent(technology);
    expect(nameEl).toHaveTextContent(product);
    expect(nameEl).toHaveTextContent(instance);
    expect(nameEl?.querySelectorAll('.app-architecture-name-part')).toHaveLength(3);
    expect(nameEl).toHaveClass('app-architecture-name--stacked');
  });
});
