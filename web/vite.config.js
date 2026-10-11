import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to mark the editor library as external during transform
function externalizeLibrary() {
  return {
    name: 'externalize-editor-library',
    resolveId(id, importer) {
      if (id.startsWith('../packages/mdock-editor/') || id.includes('/packages/mdock-editor/')) {
        return { id, external: true };
      }
      return null;
    },
    load(id) {
      if (id.startsWith('../packages/mdock-editor/') || id.includes('/packages/mdock-editor/')) {
        return { code: '', moduleSideEffects: false, external: true };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), externalizeLibrary()],
  resolve: {
    alias: {
      '@mdock/editor': path.resolve(__dirname, 'src/lib/editor'),
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  ssr: {
    external: [
      '@codemirror/basic-setup',
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
    ],
  },
  build: {
    outDir: '../webdist/dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        '@codemirror/basic-setup',
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
        'react-dom/client',
      ],
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@codemirror/view')) return 'codemirror-view';
          if (id.includes('@codemirror/state')) return 'codemirror-state';
          if (id.includes('@codemirror/lang-markdown')) return 'codemirror-markdown';
          if (id.includes('@codemirror/language')) return 'codemirror-language';
          if (id.includes('@lezer/markdown')) return 'lezer-markdown';
          if (id.includes('@lezer/highlight')) return 'lezer-highlight';
          if (id.includes('@lezer')) return 'lezer-core';
          if (
            id.includes('@uiw/react-codemirror') ||
            id.includes('@codemirror/commands') ||
            id.includes('@codemirror/autocomplete') ||
            id.includes('@codemirror/search') ||
            id.includes('@codemirror/lint') ||
            id.includes('@codemirror/theme-one-dark')
          ) {
            return 'codemirror-tools';
          }
          return undefined;
        }
      }
    }
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
    setupFiles: './src/setupTests.js',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['src/lib/editor/**'],
    deps: {
      external: [
        '@codemirror/basic-setup',
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
        'react-dom/client',
      ],
    },
    optimizeDeps: {
      exclude: [
        '../packages/mdock-editor',
        '@codemirror/basic-setup',
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
      ],
    },
    ssr: {
      external: [
        '../packages/mdock-editor',
        '@codemirror/basic-setup',
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
      ],
    },
    alias: {
      '@mdock/editor': path.resolve(__dirname, '../packages/mdock-editor'),
    },
  }
});