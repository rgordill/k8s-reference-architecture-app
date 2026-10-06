import type { Plugin } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadYamlTexts } from './src/data/local/fixtureLoader';

const ARCH_ID = 'virtual:architecture-fixtures';
const STYLE_ID = 'virtual:style-fixtures';
const ARCH_RESOLVED = '\0' + ARCH_ID;
const STYLE_RESOLVED = '\0' + STYLE_ID;

const applicationDir = path.dirname(fileURLToPath(import.meta.url));
/** Repository root: content/ and styles/ live next to application/. */
export const repoRoot = path.resolve(applicationDir, '..');

function emitModule(entries: Array<{ path: string; raw: string }>): string {
  const payload = entries.map(({ path: p, raw }) => ({
    path: p,
    raw,
  }));
  return `export default ${JSON.stringify(payload)};`;
}

export function fixturesPlugin(): Plugin {
  const contentDir = path.resolve(repoRoot, 'content');
  const stylesDir = path.resolve(repoRoot, 'styles');

  return {
    name: 'architecture-fixtures',
    resolveId(id) {
      if (id === ARCH_ID) return ARCH_RESOLVED;
      if (id === STYLE_ID) return STYLE_RESOLVED;
      return null;
    },
    load(id) {
      if (id === ARCH_RESOLVED) {
        return emitModule(loadYamlTexts(contentDir));
      }
      if (id === STYLE_RESOLVED) {
        return emitModule(loadYamlTexts(stylesDir));
      }
      return null;
    },
    configureServer(server) {
      server.watcher.add(contentDir);
      server.watcher.add(stylesDir);
      server.watcher.on('change', (file) => {
        if (file.startsWith(contentDir) || file.startsWith(stylesDir)) {
          const mod = server.moduleGraph.getModuleById(
            file.startsWith(contentDir) ? ARCH_RESOLVED : STYLE_RESOLVED,
          );
          if (mod) {
            void server.reloadModule(mod);
          }
        }
      });
    },
  };
}
