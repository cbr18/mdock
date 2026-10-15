import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * PDF Viewer Page - renders PDF.js viewer in an iframe-friendly page
 * Accessed via /embed/pdf?file=...&page=...
 * Lazy-loads PDF.js to avoid bundle bloat
 */
export function PdfViewerPage() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfJsRef = useRef(null);
  const fileUrlRef = useRef(null);

  // Parse URL parameters
  const getFileUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('file');
  }, []);

  const getInitialPage = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get('page') || '1', 10);
    return isNaN(page) ? 1 : page;
  }, []);

  // Initialize PDF.js
  useEffect(() => {
    let mounted = true;

    async function initPdfJs() {
      const fileUrl = getFileUrl();
      if (!fileUrl) {
        if (mounted) setError('No file URL provided');
        return;
      }

      fileUrlRef.current = fileUrl;

      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configure worker
        const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.8.69'}/build/pdf.worker.min.mjs`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

        pdfJsRef.current = pdfjsLib;

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
        loadingTask.onProgress = (progress) => {
          if (mounted) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            // Could show progress here
          }
        };

        const doc = await loadingTask.promise;
        
        if (!mounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(getInitialPage());
        setLoading(false);
      } catch (err) {
        if (mounted) {
          console.error('PDF loading error:', err);
          setError(`Failed to load PDF: ${err.message}`);
          setLoading(false);
        }
      }
    }

    initPdfJs();

    return () => {
      mounted = false;
      // Cleanup
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {});
      }
    };
  }, [getFileUrl, getInitialPage]);

  // Render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || loading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    pdfDoc.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page
      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      page.render(renderContext).promise.then(() => {
        // Page rendered
      });
    }).catch((err) => {
      console.error('Page render error:', err);
    });
  }, [pdfDoc, currentPage, scale, loading]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || !containerRef.current) return;
      // Auto-fit to container width
      const containerWidth = containerRef.current.clientWidth;
      const pageViewport = pdfDoc.getPage(currentPage).then(page => 
        page.getViewport({ scale: 1 })
      ).then(viewport => {
        const newScale = (containerWidth - 20) / viewport.width; // 20px padding
        setScale(Math.min(newScale, 2.0)); // Cap at 2x
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage]);

  // Navigation handlers
  const goToPage = useCallback((pageNum) => {
    if (!pdfDoc) return;
    const clamped = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(clamped);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('page', clamped.toString());
    window.history.replaceState(null, '', url);
  }, [pdfDoc, totalPages]);

  const goPrev = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goNext = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  const zoomIn = useCallback(() => setScale(s => Math.min(s * 1.2, 3.0)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s / 1.2, 0.5)), []);
  const zoomFitWidth = useCallback(() => {
    if (!pdfDoc || !containerRef.current) return;
    pdfDoc.getPage(currentPage).then(page => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth;
      const newScale = (containerWidth - 40) / viewport.width;
      setScale(Math.max(0.5, Math.min(newScale, 3.0)));
    });
  }, [pdfDoc, currentPage]);

  const zoomFitPage = useCallback(() => {
    if (!pdfDoc || !containerRef.current) return;
    pdfDoc.getPage(currentPage).then(page => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = window.innerHeight - 120; // Account for toolbar
      const scaleX = (containerWidth - 40) / viewport.width;
      const scaleY = (containerHeight - 40) / viewport.height;
      setScale(Math.max(0.5, Math.min(scaleX, scaleY, 3.0)));
    });
  }, [pdfDoc, currentPage]);

  // Search functionality
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!pdfDoc || !searchQuery.trim()) return;

    const results = [];
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      
      if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ page: i, text: text.substring(0, 200) });
      }
    }

    setSearchResults(results);
    if (results.length > 0) {
      setCurrentSearchIndex(0);
      goToPage(results[0].page);
    }
  }, [pdfDoc, searchQuery, totalPages, goToPage]);

  const searchNext = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex(i => (i + 1) % searchResults.length);
    goToPage(searchResults[(currentSearchIndex + 1) % searchResults.length].page);
  }, [searchResults, currentSearchIndex, goToPage]);

  const searchPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex(i => (i - 1 + searchResults.length) % searchResults.length);
    goToPage(searchResults[(currentSearchIndex - 1 + searchResults.length) % searchResults.length].page);
  }, [searchResults, currentSearchIndex, goToPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere with input fields
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomFitWidth();
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.getElementById('pdf-search-input')?.focus();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, goToPage, totalPages, zoomIn, zoomOut, zoomFitWidth]);

  if (loading) {
    return (
      <div className="pdf-viewer pdf-loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pdf-loading-spinner" style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', height: '40px', border: '3px solid var(--border)', 
            borderTopColor: 'var(--accent)', borderRadius: '50%', 
            animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading PDF...</p>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer pdf-error" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="pdf-error-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--danger)' }}>Failed to Load PDF</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>{error}</p>
          <a href={fileUrlRef.current} target="_blank" rel="noopener noreferrer" 
             style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-contrast)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
            Open PDF Directly
          </a>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return null;
  }

  return (
    <div className="pdf-viewer" ref={containerRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div className="pdf-toolbar" style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', minHeight: '44px'
      }}>
        {/* Navigation */}
        <div className="pdf-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '12px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
          <button onClick={goPrev} disabled={currentPage <= 1} aria-label="Previous page"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text)', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>
            ◀
          </button>
          <input
            id="pdf-page-input"
            type="number"
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
            min={1}
            max={totalPages}
            style={{ width: '50px', textAlign: 'center', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }}
            aria-label="Page number"
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>of {totalPages}</span>
          <button onClick={goNext} disabled={currentPage >= totalPages} aria-label="Next page"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>
            ▶
          </button>
        </div>

        {/* Zoom */}
        <div className="pdf-zoom" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '12px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
          <button onClick={zoomOut} aria-label="Zoom out"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>−</button>
          <span style={{ minWidth: '50px', textAlign: 'center', fontSize: '13px', color: 'var(--text-soft)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={zoomIn} aria-label="Zoom in"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>+</button>
          <button onClick={zoomFitWidth} aria-label="Fit width" title="Fit Width (Ctrl+0)"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px' }}>⛶</button>
          <button onClick={zoomFitPage} aria-label="Fit page" title="Fit Page"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '12px' }}>☐</button>
        </div>

        {/* Search */}
        <div className="pdf-search" style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, maxWidth: '300px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '4px', width: '100%' }}>
            <input
              id="pdf-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search (Ctrl+F)"
              style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)' }}
              aria-label="Search in PDF"
            />
            {searchResults.length > 0 && (
              <>
                <button type="button" onClick={searchPrev} aria-label="Previous result"
                  style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>▲</button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {currentSearchIndex + 1} / {searchResults.length}
                </span>
                <button type="button" onClick={searchNext} aria-label="Next result"
                  style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>▼</button>
              </>
            )}
          </form>
        </div>

        {/* Download/External link */}
        <div className="pdf-actions" style={{ display: 'flex', gap: '4px' }}>
          <a href={fileUrlRef.current} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none', fontSize: '14px' }}>⤢</a>
          <a href={fileUrlRef.current} download aria-label="Download PDF"
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none', fontSize: '14px' }}>⬇</a>
        </div>
      </div>

      {/* Canvas area */}
      <div className="pdf-canvas-container" style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', padding: '20px' }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
            background: 'white',
            maxWidth: '100%',
            height: 'auto'
          }} 
        />
      </div>
    </div>
  );
}

export default PdfViewerPage;