import type { StyleLogo } from '../data/types';
import { resolveAssetUrl } from '../diagram/styleResolve';
import { useTheme } from '../theme/ThemeContext';

export interface ArchitectureIconProps {
  icon?: StyleLogo;
  alt: string;
  /** CSS pixels; defaults to 32. */
  size?: number;
  className?: string;
}

export function ArchitectureIcon({
  icon,
  alt,
  size = 32,
  className = 'app-architecture-icon',
}: ArchitectureIconProps) {
  const { theme } = useTheme();

  if (!icon || icon.type !== 'url' || !icon.value) {
    return null;
  }

  const href = resolveAssetUrl(
    theme === 'dark' && icon.valueDark ? icon.valueDark : icon.value,
  );

  return (
    <img
      className={className}
      src={href}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
    />
  );
}
