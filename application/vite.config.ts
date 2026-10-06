import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixturesPlugin, repoRoot } from './vite-plugin-fixtures';
import { logosPlugin } from './vite-plugin-logos';
import { spaFallbackPlugin } from './vite-plugin-spa-fallback';

const applicationDir = path.dirname(fileURLToPath(import.meta.url));
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'k8s-reference-architecture-app';
const base =
  process.env.VITE_BASE ??
  (process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/');

export default defineConfig({
  base,
  plugins: [react(), fixturesPlugin(), logosPlugin(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(applicationDir, 'src'),
    },
  },
  server: {
    fs: {
      allow: [applicationDir, repoRoot],
    },
  },
});
