import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../webdist/dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/healthz': 'http://localhost:8080',
      '/webdav': 'http://localhost:8080'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js'
  }
});
