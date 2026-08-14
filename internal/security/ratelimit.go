package security

import (
	"sync"
	"time"
)

type RateLimiter struct {
	mu       sync.Mutex
	attempts map[string]attemptState
	limit    int
	window   time.Duration
	now      func() time.Time
}

type attemptState struct {
	count      int
	windowEnd  time.Time
	lastAccess time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	if limit <= 0 {
		limit = 20
	}
	if window <= 0 {
		window = time.Minute
	}
	return &RateLimiter{
		attempts: make(map[string]attemptState),
		limit:    limit,
		window:   window,
		now:      time.Now,
	}
}

func (l *RateLimiter) Allow(key string) bool {
	if key == "" {
		key = "unknown"
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	l.cleanup(now)
	state := l.attempts[key]
	if state.windowEnd.IsZero() || now.After(state.windowEnd) {
		return true
	}
	state.lastAccess = now
	l.attempts[key] = state
	return state.count < l.limit
}

func (l *RateLimiter) RecordFailure(key string) {
	if key == "" {
		key = "unknown"
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	l.cleanup(now)
	state := l.attempts[key]
	if state.windowEnd.IsZero() || now.After(state.windowEnd) {
		l.attempts[key] = attemptState{count: 1, windowEnd: now.Add(l.window), lastAccess: now}
		return
	}
	state.count++
	state.lastAccess = now
	l.attempts[key] = state
}

func (l *RateLimiter) Reset(key string) {
	if key == "" {
		key = "unknown"
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

func (l *RateLimiter) cleanup(now time.Time) {
	for key, state := range l.attempts {
		if now.After(state.windowEnd.Add(l.window)) || now.Sub(state.lastAccess) > 2*l.window {
			delete(l.attempts, key)
		}
	}
}
