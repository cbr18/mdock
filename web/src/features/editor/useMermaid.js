/**
 * Hook for initializing and managing mermaid diagrams in live preview
 * Handles theme sync, rendering, and toolbar interactions
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider.jsx';
import {
  initMermaid,
  updateMermaidTheme,
  autoRenderMermaid,
  rerenderAllDiagrams,
  copyMermaidAsSvg,
  copyMermaidAsPng,
  openMermaidFullscreen,
} from '@mdock/editor';

/**
 * Hook to initialize mermaid and sync with theme changes
 * Call this in any component that uses live preview with mermaid
 */
export function useMermaid() {
  const { theme } = useTheme();
  const initializedRef = useRef(false);

  // Initialize mermaid on mount and when theme changes
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await initMermaid(theme === 'light' ? 'light' : 'dark');
        if (mounted) {
          initializedRef.current = true;
          // Auto-render any existing diagrams
          await autoRenderMermaid();
        }
      } catch (error) {
        console.error('Failed to initialize mermaid:', error);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [theme]);

  // Update mermaid theme when theme changes
  useEffect(() => {
    if (!initializedRef.current) return;

    async function updateTheme() {
      await updateMermaidTheme(theme === 'light' ? 'light' : 'dark');
    }

    updateTheme();
  }, [theme]);

  // Provide functions for toolbar buttons
  const handlePanZoom = useCallback((container) => {
    const diagramEl = container.querySelector('.mermaid-diagram');
    if (diagramEl) {
      diagramEl.classList.toggle('pan-zoom-enabled');
    }
  }, []);

  const handleCopySvg = useCallback(async (container) => {
    await copyMermaidAsSvg(container);
  }, []);

  const handleCopyPng = useCallback(async (container) => {
    await copyMermaidAsPng(container);
  }, []);

  const handleFullscreen = useCallback((container) => {
    openMermaidFullscreen(container);
  }, []);

  return {
    initialized: initializedRef.current,
    handlePanZoom,
    handleCopySvg,
    handleCopyPng,
    handleFullscreen,
    rerenderAll: rerenderAllDiagrams,
  };
}

/**
 * Hook to set up mermaid toolbar event delegation
 * Attaches click handlers to the document for mermaid toolbar buttons
 */
export function useMermaidToolbar() {
  const { handlePanZoom, handleCopySvg, handleCopyPng, handleFullscreen } = useMermaid();

  useEffect(() => {
    function handleClick(event) {
      const target = event.target;
      if (!target) return;

      // Find the mermaid container
      const container = target.closest('.mermaid-container');
      if (!container) return;

      // Pan/zoom toggle
      if (target.closest('.mermaid-pan-zoom-btn')) {
        event.preventDefault();
        event.stopPropagation();
        handlePanZoom(container);
        return;
      }

      // Copy SVG
      if (target.closest('.mermaid-copy-svg-btn')) {
        event.preventDefault();
        event.stopPropagation();
        handleCopySvg(container);
        return;
      }

      // Copy PNG
      if (target.closest('.mermaid-copy-png-btn')) {
        event.preventDefault();
        event.stopPropagation();
        handleCopyPng(container);
        return;
      }

      // Fullscreen
      if (target.closest('.mermaid-fullscreen-btn')) {
        event.preventDefault();
        event.stopPropagation();
        handleFullscreen(container);
        return;
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handlePanZoom, handleCopySvg, handleCopyPng, handleFullscreen]);
}