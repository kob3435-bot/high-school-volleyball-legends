import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: process.env.VITE_BASE || './',
  build: { outDir: 'dist', sourcemap: true },
  server: { port: 5173, strictPort: true },
});
