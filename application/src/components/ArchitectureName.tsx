import { parseArchitectureName } from '../data/architectureName';

export interface ArchitectureNameProps {
  name: string;
  className?: string;
  /** Stack each token on its own centered line (list cards). */
  stacked?: boolean;
}

/** Renders `technology:product:instance` as visually separated tokens. */
export function ArchitectureName({
  name,
  className,
  stacked = false,
}: ArchitectureNameProps) {
  const { tokens } = parseArchitectureName(name);
  const classes = [
    'app-architecture-name',
    stacked ? 'app-architecture-name--stacked' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} data-testid="architecture-name">
      {tokens.map((token, index) => (
        <span key={`${index}-${token}`} className="app-architecture-name-token">
          {!stacked && index > 0 ? (
            <span className="app-architecture-name-sep" aria-hidden="true">
              :
            </span>
          ) : null}
          <span className="app-architecture-name-part">{token}</span>
        </span>
      ))}
    </span>
  );
}
