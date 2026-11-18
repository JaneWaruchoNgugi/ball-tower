import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the built game works from any folder or static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022' },
});
