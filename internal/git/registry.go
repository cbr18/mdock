package git

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type QueueRegistry struct {
	client   *Client
	debounce time.Duration
	mu       sync.Mutex
	queues   map[int64]*Queue
}

func NewQueueRegistry(client *Client, debounce time.Duration) *QueueRegistry {
	return &QueueRegistry{client: client, debounce: debounce, queues: map[int64]*Queue{}}
}

func (r *QueueRegistry) For(vaultID int64, repoPath string) *Queue {
	r.mu.Lock()
	defer r.mu.Unlock()
	if queue, ok := r.queues[vaultID]; ok {
		return queue
	}
	queue := NewQueue(r.client, repoPath, r.debounce)
	r.queues[vaultID] = queue
	return queue
}

func (r *QueueRegistry) CloseAll(ctx context.Context) error {
	r.mu.Lock()
	queues := make(map[int64]*Queue, len(r.queues))
	for vaultID, queue := range r.queues {
		queues[vaultID] = queue
	}
	r.mu.Unlock()

	var firstErr error
	for vaultID, queue := range queues {
		if err := queue.Close(ctx); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("close git queue for vault %d: %w", vaultID, err)
		}
	}
	return firstErr
}
