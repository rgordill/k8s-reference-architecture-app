import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GitHub Pages serves 404.html for unknown paths. Copy index.html so the
 * SPA (and URLs like /application/) load instead of an empty folder listing.
 */
export function spaFallbackPlugin(): Plugin {
  let outDir = 'dist';

  return {
    name: 'spa-github-pages-fallback',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const index = path.join(outDir, 'index.html');
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(outDir, '404.html'));
      }
    },
  };
}
