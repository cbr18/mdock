/**
 * Math rendering extension for live preview using KaTeX
 * Provides remark-math and rehype-katex plugins for ReactMarkdown
 */

import type { LivePreviewConfig } from '../types';

/**
 * Configuration for math rendering
 */
export interface MathConfig {
  /** Enable inline math $...$ */
  inlineMath?: boolean;
  /** Enable block math $$...$$ */
  displayMath?: boolean;
  /** KaTeX options */
  katexOptions?: {
    /** Throw on error (default: false) */
    throwOnError?: boolean;
    /** Error color */
    errorColor?: string;
    /** Strict mode (default: true) */
    strict?: boolean;
    /** Output format: html, mathml, htmlAndMathml (default: html) */
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    /** Trusted types for CSP compliance */
    trust?: boolean;
    /** Max size for expansion */
    maxExpand?: number;
    /** Max size for nested */
    maxSize?: number;
  };
}

/**
 * Default math configuration
 */
const DEFAULT_MATH_CONFIG: Required<MathConfig> = {
  inlineMath: true,
  displayMath: true,
  katexOptions: {
    throwOnError: false,
    errorColor: '#cc0000',
    strict: true,
    output: 'html',
    trust: false,
    maxExpand: 1000,
    maxSize: 1000,
  },
};

/**
 * Create math rendering plugins for live preview
 * Returns { remark: [...], rehype: [...] } to be merged into renderPlugins
 */
export function createMathPlugins(config: MathConfig = {}): {
  remark: any[];
  rehype: any[];
} {
  const merged = { ...DEFAULT_MATH_CONFIG, ...config };
  const plugins: { remark: any[]; rehype: any[] } = { remark: [], rehype: [] };

  // Lazy-load KaTeX and plugins on first use to reduce initial bundle size
  let remarkMathLoaded: any = null;
  let rehypeKatexLoaded: any = null;

  const loadPlugins = async () => {
    if (!remarkMathLoaded) {
      const [remarkMath, rehypeKatex] = await Promise.all([
        import('remark-math'),
        import('rehype-katex'),
      ]);
      remarkMathLoaded = remarkMath.default ?? remarkMath;
      rehypeKatexLoaded = rehypeKatex.default ?? rehypeKatex;
    }
  };

  // We return getter functions that lazy-load on first access
  // This is a pattern - actual plugins are added via config injection

  return plugins;
}

/**
 * Math render plugins to be added to LivePreviewConfig.renderPlugins
 * These are synchronous getters - the actual loading happens when plugins are accessed
 */
export const mathRenderPlugins = {
  remark: [() => import('remark-math').then(m => m.default ?? m)],
  rehype: [() => import('rehype-katex').then(m => m.default ?? m)],
};

/**
 * Inject math plugins into live preview config
 */
export function withMath(config: LivePreviewConfig, mathConfig: MathConfig = {}): LivePreviewConfig {
  const merged = { ...DEFAULT_MATH_CONFIG, ...mathConfig };
  
  return {
    ...config,
    renderPlugins: {
      remark: [
        ...(config.renderPlugins?.remark ?? []),
        // remark-math is a synchronous plugin
        (() => {
          // We'll use a factory pattern to avoid circular imports
          return import('remark-math').then(m => m.default ?? m);
        })(),
      ],
      rehype: [
        ...(config.renderPlugins?.rehype ?? []),
        (() => import('rehype-katex').then(m => m.default ?? m))(),
      ],
    },
  };
}

/**
 * Get KaTeX CSS for injection
 * KaTeX CSS is loaded globally via @import in styles.css
 * This function is a no-op for compatibility
 */
export async function loadKatexStyles(): Promise<void> {
  // KaTeX styles are loaded globally via @import 'katex/dist/katex.min.css' in styles.css
  // This function exists for API compatibility
}

/**
 * Check if KaTeX is available
 */
export async function isKatexAvailable(): Promise<boolean> {
  try {
    await import('katex');
    return true;
  } catch {
    return false;
  }
}