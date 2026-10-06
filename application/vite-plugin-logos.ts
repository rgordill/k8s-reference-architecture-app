import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './vite-plugin-fixtures';

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8',
};

/**
 * Serve / copy the repository-root `logo/` folder (sibling of `styles/`).
 */
export function logosPlugin(): Plugin {
  const logoDir = path.resolve(repoRoot, 'logo');
  let outDir = 'dist';

  const fileFromRequest = (pathname: string, base: string): string | null => {
    const prefixes = [`${base.replace(/\/$/, '')}/logo/`, '/logo/'];
    for (const prefix of prefixes) {
      if (pathname.startsWith(prefix)) {
        return pathname.slice(prefix.length);
      }
    }
    return null;
  };

  return {
    name: 'repo-logos',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? '').split('?')[0]);
        const rel = fileFromRequest(pathname, server.config.base);
        if (rel === null) {
          next();
          return;
        }
        const file = path.resolve(logoDir, rel);
        if (!file.startsWith(logoDir + path.sep) || !fs.existsSync(file)) {
          next();
          return;
        }
        const stat = fs.statSync(file);
        if (!stat.isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (fs.existsSync(logoDir)) {
        fs.cpSync(logoDir, path.join(outDir, 'logo'), { recursive: true });
      }
    },
  };
}
