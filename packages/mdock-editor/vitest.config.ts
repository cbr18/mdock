import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mdock/editor': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    deps: {
      external: [
        '@codemirror/state',
        '@codemirror/view',
        '@codemirror/lang-markdown',
        '@codemirror/language',
        '@codemirror/commands',
        '@codemirror/autocomplete',
        '@codemirror/search',
        '@codemirror/lint',
        '@codemirror/theme-one-dark',
        '@lezer/markdown',
        '@lezer/highlight',
        '@lezer/common',
        '@uiw/react-codemirror',
        'react',
        'react-dom',
      ],
    },
    globals: true,
  },
});