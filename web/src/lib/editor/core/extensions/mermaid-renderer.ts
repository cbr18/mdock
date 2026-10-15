/**
 * Client-side Mermaid renderer
 * Handles dynamic import, rendering, pan/zoom, copy SVG/PNG, and fullscreen
 */

let mermaidInstance: any = null;
let mermaidInitialized = false;
let currentTheme: 'light' | 'dark' = 'dark';
let mermaidVersion = '10.9.1';

/**
 * Initialize mermaid with theme configuration
 */
export async function initMermaid(theme?: 'light' | 'dark', version?: string): Promise<void> {
  if (mermaidInitialized && mermaidInstance) return;

  if (version) {
    mermaidVersion = version;
  }

  if (theme) {
    currentTheme = theme;
  }

  try {
    // Dynamic import to avoid bundle bloat
    const mermaidModule = await import('mermaid');
    mermaidInstance = mermaidModule.default || mermaidModule;

    // Configure mermaid
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: currentTheme === 'light' ? 'default' : 'dark',
      themeVariables: getThemeVariables(currentTheme),
      securityLevel: 'loose',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 50,
        diagramMarginY: 10,
      },
      gantt: {
        useMaxWidth: true,
      },
    });

    mermaidInitialized = true;
  } catch (error) {
    console.error('Failed to load mermaid:', error);
    throw error;
  }
}

/**
 * Get theme variables for mermaid based on current CSS theme
 */
function getThemeVariables(theme: 'light' | 'dark'): Record<string, string> {
  if (theme === 'light') {
    return {
      primaryColor: '#1e3a5f',
      primaryTextColor: '#1a1a2e',
      primaryBorderColor: '#d0d7e4',
      lineColor: '#4a5568',
      secondaryColor: '#e8eef8',
      tertiaryColor: '#ffffff',
      background: '#f8fafc',
      mainBkg: '#ffffff',
      secondBkg: '#f1f5f9',
      tertiaryBkg: '#e2e8f0',
      textColor: '#1a1a2e',
      nodeBorder: '#4a5568',
      nodeTextColor: '#1a1a2e',
      clusterBorder: '#4a5568',
      clusterTextColor: '#1a1a2e',
      edgeLabelBackground: '#ffffff',
      actorBorder: '#4a5568',
      actorTextColor: '#1a1a2e',
      actorBkg: '#e8eef8',
      signalColor: '#4a5568',
      signalTextColor: '#1a1a2e',
      labelBoxBkgColor: '#ffffff',
      labelBoxBorderColor: '#4a5568',
      labelTextColor: '#1a1a2e',
      loopTextColor: '#1a1a2e',
      noteBkgColor: '#fffbeb',
      noteTextColor: '#1a1a2e',
      noteBorderColor: '#f59e0b',
      activationBorderColor: '#4a5568',
      activationBkgColor: '#e8eef8',
      sequenceNumberColor: '#4a5568',
      sectionBkgColor: '#f1f5f9',
      altSectionBkgColor: '#e2e8f0',
      sectionBkgColor2: '#dbeafe',
      gridColor: '#e2e8f0',
      doneTaskBkgColor: '#dcfce7',
      doneTaskBorderColor: '#16a34a',
      activeTaskBkgColor: '#dbeafe',
      activeTaskBorderColor: '#2563eb',
      taskTextColor: '#1a1a2e',
      taskTextLightColor: '#ffffff',
      taskTextDarkColor: '#1a1a2e',
      taskBorderColor: '#4a5568',
      todayLineColor: '#ef4444',
    };
  }

  return {
    primaryColor: '#8b9cf0',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#3a4a6b',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    secondBkg: '#334155',
    tertiaryBkg: '#475569',
    textColor: '#e2e8f0',
    nodeBorder: '#64748b',
    nodeTextColor: '#e2e8f0',
    clusterBorder: '#64748b',
    clusterTextColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b',
    actorBorder: '#64748b',
    actorTextColor: '#e2e8f0',
    actorBkg: '#1e293b',
    signalColor: '#94a3b8',
    signalTextColor: '#e2e8f0',
    labelBoxBkgColor: '#1e293b',
    labelBoxBorderColor: '#64748b',
    labelTextColor: '#e2e8f0',
    loopTextColor: '#e2e8f0',
    noteBkgColor: '#451a03',
    noteTextColor: '#e2e8f0',
    noteBorderColor: '#f59e0b',
    activationBorderColor: '#64748b',
    activationBkgColor: '#1e293b',
    sequenceNumberColor: '#94a3b8',
    sectionBkgColor: '#1e293b',
    altSectionBkgColor: '#334155',
    sectionBkgColor2: '#1e3a5f',
    gridColor: '#334155',
    doneTaskBkgColor: '#14532d',
    doneTaskBorderColor: '#16a34a',
    activeTaskBkgColor: '#1e3a5f',
    activeTaskBorderColor: '#60a5fa',
    taskTextColor: '#e2e8f0',
    taskTextLightColor: '#ffffff',
    taskTextDarkColor: '#0f172a',
    taskBorderColor: '#64748b',
    todayLineColor: '#ef4444',
  };
}

/**
 * Update mermaid theme when CSS theme changes
 */
export async function updateMermaidTheme(theme: 'light' | 'dark'): Promise<void> {
  if (!mermaidInitialized || !mermaidInstance) return;

  currentTheme = theme;
  mermaidInstance.initialize({
    ...mermaidInstance.getConfig(),
    theme: theme === 'light' ? 'default' : 'dark',
    themeVariables: getThemeVariables(theme),
  });

  // Re-render all visible diagrams
  await rerenderAllDiagrams();
}

/**
 * Render a single mermaid diagram
 */
export async function renderMermaid(
  container: HTMLElement,
  code: string,
  id?: string
): Promise<SVGElement | null> {
  if (!mermaidInitialized || !mermaidInstance) {
    await initMermaid();
  }

  const diagramEl = container.querySelector('.mermaid-diagram') as HTMLElement;
  if (!diagramEl) return null;

  // Show loading state
  diagramEl.classList.add('mermaid-loading');
  diagramEl.innerHTML = '';

  try {
    const diagramId = id || `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { svg } = await mermaidInstance.render(diagramId, code);

    diagramEl.innerHTML = svg;
    diagramEl.classList.remove('mermaid-loading');
    diagramEl.classList.remove('mermaid-error');

    // Setup pan/zoom on the SVG
    setupPanZoom(diagramEl);

    return diagramEl.querySelector('svg');
  } catch (error) {
    diagramEl.classList.remove('mermaid-loading');
    diagramEl.classList.add('mermaid-error');
    diagramEl.innerHTML = `
      <div class="mermaid-error-content">
        <p>Failed to render diagram</p>
        <pre>${escapeHtml(String(error))}</pre>
      </div>
    `;
    console.error('Mermaid render error:', error);
    return null;
  }
}

/**
 * Setup pan/zoom functionality for a diagram
 */
function setupPanZoom(diagramEl: HTMLElement): void {
  const svg = diagramEl.querySelector('svg');
  if (!svg) return;

  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  const minScale = 0.1;
  const maxScale = 5;

  // Check if pan/zoom is already enabled
  if (diagramEl.classList.contains('pan-zoom-enabled')) {
    // Get current transform
    const transform = svg.style.transform;
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)\s*scale\(([^)]+)\)/);
    if (match) {
      translateX = parseFloat(match[1]);
      translateY = parseFloat(match[2]);
      scale = parseFloat(match[3]);
    }
    return;
  }

  diagramEl.classList.add('pan-zoom-enabled');

  const applyTransform = () => {
    svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  // Mouse wheel zoom
  diagramEl.addEventListener('wheel', (e) => {
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const rect = diagramEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));

    // Zoom towards mouse position
    const scaleRatio = newScale / scale;
    translateX = mouseX - (mouseX - translateX) * scaleRatio;
    translateY = mouseY - (mouseY - translateY) * scaleRatio;
    scale = newScale;

    applyTransform();
  }, { passive: false });

  // Pan with mouse
  diagramEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || (e.shiftKey && !e.altKey)) return;
    e.preventDefault();

    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    diagramEl.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      diagramEl.style.cursor = 'grab';
    }
  });

  // Touch support for pan/zoom
  let lastTouchDistance = 0;
  let lastTouchCenter = { x: 0, y: 0 };

  diagramEl.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, { passive: true });

  diagramEl.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      applyTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      if (lastTouchDistance > 0) {
        const scaleRatio = distance / lastTouchDistance;
        const newScale = Math.max(minScale, Math.min(maxScale, scale * scaleRatio));

        const rect = diagramEl.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;

        translateX = mouseX - (mouseX - translateX) * (newScale / scale);
        translateY = mouseY - (mouseY - translateY) * (newScale / scale);
        scale = newScale;
        applyTransform();
      }

      lastTouchDistance = distance;
      lastTouchCenter = { x: centerX, y: centerY };
    }
  }, { passive: false });

  diagramEl.addEventListener('touchend', () => {
    isPanning = false;
  });

  // Double-click to reset
  diagramEl.addEventListener('dblclick', () => {
    translateX = 0;
    translateY = 0;
    scale = 1;
    applyTransform();
  });
}

/**
 * Copy diagram as SVG to clipboard
 */
export async function copyMermaidAsSvg(container: HTMLElement): Promise<boolean> {
  const svg = container.querySelector('.mermaid-diagram svg');
  if (!svg) return false;

  try {
    const svgClone = svg.cloneNode(true) as SVGElement;
    // Ensure proper xmlns
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Remove transform from pan/zoom
    svgClone.style.transform = '';
    svgClone.style.transformOrigin = '';

    const svgData = new XMLSerializer().serializeToString(svgClone);
    await navigator.clipboard.writeText(svgData);
    showToast('SVG copied to clipboard');
    return true;
  } catch (error) {
    console.error('Failed to copy SVG:', error);
    showToast('Failed to copy SVG', true);
    return false;
  }
}

/**
 * Copy diagram as PNG to clipboard
 */
export async function copyMermaidAsPng(container: HTMLElement): Promise<boolean> {
  const svg = container.querySelector('.mermaid-diagram svg');
  if (!svg) return false;

  try {
    const svgClone = svg.cloneNode(true) as SVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.style.transform = '';
    svgClone.style.transformOrigin = '';

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Set canvas size to SVG's natural size
        const width = img.width || svgClone.width.baseVal.value || 800;
        const height = img.height || svgClone.height.baseVal.value || 600;
        canvas.width = width * 2; // 2x for retina
        canvas.height = height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      img.src = url;
    });

    canvas.toBlob(async (blob) => {
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('PNG copied to clipboard');
      }
    }, 'image/png');

    return true;
  } catch (error) {
    console.error('Failed to copy PNG:', error);
    showToast('Failed to copy PNG', true);
    return false;
  }
}

/**
 * Open diagram in fullscreen modal
 */
export function openMermaidFullscreen(container: HTMLElement): void {
  const svg = container.querySelector('.mermaid-diagram svg');
  if (!svg) return;

  const svgClone = svg.cloneNode(true) as SVGElement;
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.style.transform = '';
  svgClone.style.transformOrigin = '';
  svgClone.style.width = '100%';
  svgClone.style.height = '100%';
  svgClone.style.maxWidth = 'none';
  svgClone.style.maxHeight = 'none';

  const overlay = document.createElement('div');
  overlay.className = 'mermaid-fullscreen-overlay';
  overlay.innerHTML = `
    <div class="mermaid-fullscreen-content">
      <div class="mermaid-fullscreen-header">
        <span class="mermaid-fullscreen-title">Mermaid Diagram</span>
        <button class="mermaid-fullscreen-close" aria-label="Close fullscreen">×</button>
      </div>
      <div class="mermaid-fullscreen-body"></div>
    </div>
  `;

  const body = overlay.querySelector('.mermaid-fullscreen-body') as HTMLElement;
  body.appendChild(svgClone);

  const closeBtn = overlay.querySelector('.mermaid-fullscreen-close') as HTMLButtonElement;
  const close = () => {
    document.body.removeChild(overlay);
    document.removeEventListener('keydown', handleKeydown);
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', handleKeydown);

  document.body.appendChild(overlay);

  // Setup pan/zoom in fullscreen
  setupPanZoom(body);
}

/**
 * Re-render all mermaid diagrams on the page
 */
export async function rerenderAllDiagrams(): Promise<void> {
  const containers = document.querySelectorAll('.mermaid-container');
  for (const container of containers) {
    const diagramEl = container.querySelector('.mermaid-diagram') as HTMLElement;
    const code = container.getAttribute('data-mermaid-code');
    if (code && diagramEl) {
      await renderMermaid(container, code);
    }
  }
}

/**
 * Auto-initialize and render all mermaid diagrams on the page
 */
export async function autoRenderMermaid(): Promise<void> {
  await initMermaid();
  const containers = document.querySelectorAll('.mermaid-container');
  for (const container of containers) {
    const code = container.getAttribute('data-mermaid-code');
    if (code) {
      await renderMermaid(container as HTMLElement, code);
    }
  }
}

/**
 * Show toast notification
 */
function showToast(message: string, isError = false): void {
  const existingToast = document.querySelector('.mermaid-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `mermaid-toast ${isError ? 'mermaid-toast-error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('mermaid-toast-out');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get current mermaid version
 */
export function getMermaidVersion(): string {
  return mermaidVersion;
}

/**
 * Set mermaid version (for next initialization)
 */
export function setMermaidVersion(version: string): void {
  mermaidVersion = version;
  mermaidInitialized = false;
  mermaidInstance = null;
}