package git

import (
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
