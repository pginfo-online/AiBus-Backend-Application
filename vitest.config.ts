import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, './src/config'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@jobs': path.resolve(__dirname, './src/jobs'),
    },
  },
});
