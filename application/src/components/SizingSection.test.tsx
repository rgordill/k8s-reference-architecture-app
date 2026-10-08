import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Architecture } from '../data';
import { SizingSection } from './SizingSection';

const sample = (overrides: Partial<Architecture> = {}): Architecture => ({
  name: 'sample:dev',
  description: 'Sample architecture',
  characteristics: ['One characteristic'],
  usage: ['Development'],
  dependencies: {},
  diagram: { nodes: [], edges: [] },
  ...overrides,
});

describe('SizingSection', () => {
  it('renders sizing folded by default and expands on toggle', async () => {
    const user = userEvent.setup();
    render(
      <SizingSection
        architecture={sample({
          sizing: [
            {
              name: 'min',
              description: 'StartUp sizing',
              components: [
                {
                  'cert-manager-operator': {
                    replicas: 1,
                    memory: '100Mi',
                    cpu: '10m',
                  },
                },
                {
                  'cert-manager': {
                    replicas: 1,
                    memory: '50Mi',
                    cpu: '5m',
                  },
                },
              ],
            },
            {
              name: 'ha',
              components: [
                {
                  controller: { replicas: 2, memory: '50Mi', cpu: '5m' },
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByTestId('architecture-sizing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sizing/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByTestId('sizing-table-min')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sizing/i }));

    expect(screen.getByRole('button', { name: /sizing/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const components = screen.getByTestId('sizing-table-components');
    expect(components.textContent).toContain('cert-manager-operator');
    expect(components.textContent).toContain('controller');
    expect(components.textContent).not.toContain('CPU');

    const minTable = screen.getByTestId('sizing-table-min');
    expect(minTable).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'min' })).toBeInTheDocument();
    expect(minTable.textContent).not.toContain('StartUp sizing');
    expect(minTable.textContent).not.toContain('cert-manager-operator');
    expect(minTable.querySelector('tfoot')?.textContent).toContain('150Mi');
    expect(minTable.querySelector('tfoot')?.textContent).toContain('15m');
    const haTable = screen.getByTestId('sizing-table-ha');
    expect(haTable).toBeInTheDocument();
    expect(haTable.textContent).toContain('Replicas');
    expect(haTable.querySelector('tfoot')?.textContent).toContain('100Mi');
    expect(haTable.querySelector('tfoot')?.textContent).toContain('10m');
  });

  it('omits sizing when the field is missing', () => {
    render(<SizingSection architecture={sample()} />);
    expect(screen.queryByTestId('architecture-sizing')).not.toBeInTheDocument();
  });
});
