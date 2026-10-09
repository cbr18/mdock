package httpapi

import (
	"context"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cbr/mdock/internal/version"
	appgit "github.com/cbr/mdock/internal/git"
)

type Metrics struct {
	mu sync.RWMutex

	// Git queue metrics
	gitQueueLen       map[string]int
	gitQueuePending   map[string]int
	gitCommitDuration map[string]time.Duration
	gitDirty          map[string]bool
	gitLastError      map[string]string

	// Lock metrics
	lockWaitDuration time.Duration
	lockWaitCount    uint64

	// WebDAV metrics
	webdavErrors map[string]uint64

	// API metrics
	apiRequestDuration map[string]time.Duration
	apiRequestCount    map[string]uint64
	apiErrors          map[string]uint64
}

func NewMetrics() *Metrics {
	return &Metrics{
		gitQueueLen:       make(map[string]int),
		gitQueuePending:   make(map[string]int),
		gitCommitDuration: make(map[string]time.Duration),
		gitDirty:          make(map[string]bool),
		gitLastError:      make(map[string]string),
		webdavErrors:      make(map[string]uint64),
		apiRequestDuration: make(map[string]time.Duration),
		apiRequestCount:    make(map[string]uint64),
		apiErrors:          make(map[string]uint64),
	}
}

func (m *Metrics) RecordGitQueueLen(vaultSlug string, len int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gitQueueLen[vaultSlug] = len
}

func (m *Metrics) RecordGitQueuePending(vaultSlug string, len int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gitQueuePending[vaultSlug] = len
}

func (m *Metrics) RecordGitCommitDuration(vaultSlug string, duration time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gitCommitDuration[vaultSlug] = duration
}

func (m *Metrics) RecordGitDirty(vaultSlug string, dirty bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gitDirty[vaultSlug] = dirty
}

func (m *Metrics) RecordGitLastError(vaultSlug string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err != nil {
		m.gitLastError[vaultSlug] = err.Error()
	} else {
		delete(m.gitLastError, vaultSlug)
	}
}

func (m *Metrics) RecordLockWait(duration time.Duration) {
	atomic.AddUint64(&m.lockWaitCount, 1)
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lockWaitDuration += duration
}

func (m *Metrics) RecordWebDAVError(method string, status int) {
	key := method + "_" + string(rune(status))
	m.mu.Lock()
	defer m.mu.Unlock()
	m.webdavErrors[key]++
}

func (m *Metrics) RecordAPIRequest(method, path string, status int, duration time.Duration) {
	key := method + " " + path
	m.mu.Lock()
	defer m.mu.Unlock()
	m.apiRequestCount[key]++
	m.apiRequestDuration[key] = duration
	if status >= 400 {
		m.apiErrors[key]++
	}
}

func (m *Metrics) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m.mu.RLock()
		defer m.mu.RUnlock()

		w.Header().Set("Content-Type", "text/plain; version=0.0.4")

		// Git queue metrics
		for slug, l := range m.gitQueueLen {
			writeMetric(w, "mdock_git_queue_len", map[string]string{"vault": slug}, float64(l))
		}
		for slug, l := range m.gitQueuePending {
			writeMetric(w, "mdock_git_queue_pending", map[string]string{"vault": slug}, float64(l))
		}
		for slug, d := range m.gitCommitDuration {
			writeMetric(w, "mdock_git_commit_duration_seconds", map[string]string{"vault": slug}, d.Seconds())
		}
		for slug, dirty := range m.gitDirty {
			val := 0.0
			if dirty {
				val = 1.0
			}
			writeMetric(w, "mdock_git_dirty", map[string]string{"vault": slug}, val)
		}
		for slug, err := range m.gitLastError {
			writeMetric(w, "mdock_git_last_error", map[string]string{"vault": slug, "error": err}, 1.0)
		}

		// Lock metrics
		writeMetric(w, "mdock_lock_wait_duration_seconds_total", nil, m.lockWaitDuration.Seconds())
		writeMetric(w, "mdock_lock_wait_count_total", nil, float64(atomic.LoadUint64(&m.lockWaitCount)))

		// WebDAV metrics
		for key, count := range m.webdavErrors {
			writeMetric(w, "mdock_webdav_errors_total", map[string]string{"method_status": key}, float64(count))
		}

		// API metrics
		for key, count := range m.apiRequestCount {
			writeMetric(w, "mdock_api_requests_total", map[string]string{"endpoint": key}, float64(count))
		}
		for key, d := range m.apiRequestDuration {
			writeMetric(w, "mdock_api_request_duration_seconds", map[string]string{"endpoint": key}, d.Seconds())
		}
		for key, count := range m.apiErrors {
			writeMetric(w, "mdock_api_errors_total", map[string]string{"endpoint": key}, float64(count))
		}

		// Build info
		writeMetric(w, "mdock_build_info", map[string]string{"version": version.Version()}, 1.0)
	})
}

func writeMetric(w http.ResponseWriter, name string, labels map[string]string, value float64) {
	w.Write([]byte(name))
	if len(labels) > 0 {
		w.Write([]byte("{"))
		first := true
		for k, v := range labels {
			if !first {
				w.Write([]byte(","))
			}
			w.Write([]byte(k + `="` + v + `"`))
			first = false
		}
		w.Write([]byte("}"))
	}
	w.Write([]byte(" " + formatFloat(value) + "\n"))
}

func formatFloat(f float64) string {
	// Simple formatting to avoid scientific notation for small values
	if f == float64(int64(f)) {
		return string(rune(int64(f)))
	}
	return string(rune(int64(f*1000)) / 1000.0) // rough approximation
}

// Wrappers for integrating with existing components

type MetricsMiddleware struct {
	metrics *Metrics
	next    http.Handler
}

func (m *MetricsMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	ww := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
	m.next.ServeHTTP(ww, r)
	duration := time.Since(start)

	m.metrics.RecordAPIRequest(r.Method, r.URL.Path, ww.statusCode, duration)
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Git queue metrics collector - called from Queue after flush
type GitQueueMetricsCollector struct {
	metrics    *Metrics
	vaultSlug  string
}

func NewGitQueueMetricsCollector(metrics *Metrics, vaultSlug string) *GitQueueMetricsCollector {
	return &GitQueueMetricsCollector{metrics: metrics, vaultSlug: vaultSlug}
}

func (c *GitQueueMetricsCollector) RecordFlush(ctx context.Context, queue *appgit.Queue, duration time.Duration, err error) {
	c.metrics.RecordGitCommitDuration(c.vaultSlug, duration)
	c.metrics.RecordGitLastError(c.vaultSlug, err)
	if queue != nil {
		c.metrics.RecordGitQueueLen(c.vaultSlug, queue.Len())
	}
}

// Lock service metrics collector
type LockMetricsCollector struct {
	metrics *Metrics
}

func NewLockMetricsCollector(metrics *Metrics) *LockMetricsCollector {
	return &LockMetricsCollector{metrics: metrics}
}

func (c *LockMetricsCollector) RecordWait(duration time.Duration) {
	c.metrics.RecordLockWait(duration)
}

// WebDAV metrics collector
type WebDAVMetricsCollector struct {
	metrics *Metrics
}

func NewWebDAVMetricsCollector(metrics *Metrics) *WebDAVMetricsCollector {
	return &WebDAVMetricsCollector{metrics: metrics}
}

func (c *WebDAVMetricsCollector) RecordError(method string, status int) {
	c.metrics.RecordWebDAVError(method, status)
}