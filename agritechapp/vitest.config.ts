import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // @/db → db/ à la racine (doit être avant @/ pour éviter la collision)
      { find: /^@\/db(\/.*)?$/, replacement: path.resolve(__dirname, './db') + '$1' },
      // @/ → src/ (comme dans tsconfig paths)
      { find: /^@\//, replacement: path.resolve(__dirname, './src') + '/' },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
  },
});
