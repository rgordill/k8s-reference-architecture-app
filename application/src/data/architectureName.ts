export interface ArchitectureNameParts {
  /** Full original name, e.g. `certificates:cert-manager:minimal-olm`. */
  name: string;
  technology: string;
  product?: string;
  instance?: string;
  tokens: string[];
}

/**
 * Split `technology:product:instance` architecture names into tokens.
 * Extra colon segments are kept on the instance part.
 */
export function parseArchitectureName(name: string): ArchitectureNameParts {
  const tokens = name.split(':').map((part) => part.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { name, technology: name, tokens: name ? [name] : [] };
  }
  if (tokens.length === 1) {
    return { name, technology: tokens[0], tokens };
  }
  if (tokens.length === 2) {
    return {
      name,
      technology: tokens[0],
      product: tokens[1],
      tokens,
    };
  }
  return {
    name,
    technology: tokens[0],
    product: tokens[1],
    instance: tokens.slice(2).join(':'),
    tokens: [tokens[0], tokens[1], tokens.slice(2).join(':')],
  };
}
