/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Veröffentlichte Fassung landet in docs/ (GitHub Pages: Branch main, Ordner /docs)
  build: { outDir: 'docs', emptyOutDir: true },
  test: { environment: 'node' },
});
