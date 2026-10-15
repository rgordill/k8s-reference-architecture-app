import { Button } from '@patternfly/react-core';
import { DesktopIcon, MoonIcon, SunIcon } from '@patternfly/react-icons';
import { useTheme, type ThemePreference } from '../theme/ThemeContext';

const NEXT_LABEL: Record<ThemePreference, string> = {
  light: 'Switch to dark theme',
  dark: 'Use browser default theme',
  browser: 'Switch to light theme',
};

const CURRENT_TITLE: Record<ThemePreference, string> = {
  light: 'Theme: light',
  dark: 'Theme: dark',
  browser: 'Theme: browser default',
};

export function ThemeToggle() {
  const { preference, toggleTheme } = useTheme();

  // Icon reflects the next preference in the light → dark → browser cycle.
  const icon =
    preference === 'light' ? (
      <MoonIcon />
    ) : preference === 'dark' ? (
      <DesktopIcon />
    ) : (
      <SunIcon />
    );

  return (
    <Button
      variant="plain"
      aria-label={NEXT_LABEL[preference]}
      title={CURRENT_TITLE[preference]}
      onClick={toggleTheme}
      icon={icon}
    />
  );
}
