import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeContext';
import { ArchitectureIcon } from './ArchitectureIcon';

describe('ArchitectureIcon', () => {
  it('renders a url icon when present', () => {
    render(
      <ThemeProvider>
        <ArchitectureIcon
          icon={{
            type: 'url',
            value: 'https://example.com/icon.svg',
          }}
          alt="Cert Manager"
        />
      </ThemeProvider>,
    );

    const image = screen.getByRole('img', { name: 'Cert Manager' });
    expect(image).toHaveAttribute('src', 'https://example.com/icon.svg');
  });

  it('renders nothing when icon is missing', () => {
    const { container } = render(
      <ThemeProvider>
        <ArchitectureIcon alt="Missing" />
      </ThemeProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
