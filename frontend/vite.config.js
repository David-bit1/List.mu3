import { defineConfig } from 'vite';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5050';

export default defineConfig({
  server: {
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
});
