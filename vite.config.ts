/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Versionsnummer aus package.json: steckt in der App und als docs/version.json daneben.
// Die App vergleicht beim Öffnen und beim Zurückkehren beides und lädt bei einer neuen Version selbst neu (wie in der Film-App).
const VERSION: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

const versionsDatei = (): Plugin => ({
  name: 'versions-datei',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION }) });
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), versionsDatei()],
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  // Veröffentlichte Fassung landet in docs/ (GitHub Pages: Branch main, Ordner /docs)
  build: { outDir: 'docs', emptyOutDir: true },
  test: { environment: 'node' },
});
