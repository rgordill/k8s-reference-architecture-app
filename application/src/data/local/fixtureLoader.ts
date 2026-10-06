import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Recursively collect YAML files. Used by the Vite plugin and by tests so
 * filenames containing ':' (e.g. hashicorp-vault:dev.yaml) work — Vite's
 * module graph rejects those IDs when imported via import.meta.glob.
 */
export function collectYamlFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (/\.ya?ml$/i.test(entry)) {
        results.push(full);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

export function loadYamlTexts(rootDir: string): Array<{ path: string; raw: string }> {
  return collectYamlFiles(rootDir).map((full) => ({
    path: relative(rootDir, full).replace(/\\/g, '/'),
    raw: readFileSync(full, 'utf8'),
  }));
}
