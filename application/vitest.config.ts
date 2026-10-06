import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixturesPlugin } from './vite-plugin-fixtures';

const applicationDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), fixturesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(applicationDir, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
