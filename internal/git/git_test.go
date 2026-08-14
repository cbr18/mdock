package git

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestClientInitCommitAndRecovery(t *testing.T) {
	ctx := context.Background()
	repo := t.TempDir()
	client := NewClient("git")

	if err := client.InitIfNeeded(ctx, repo); err != nil {
		t.Fatalf("InitIfNeeded() error = %v", err)
	}
	if err := client.EnsureMainBranch(ctx, repo); err != nil {
		t.Fatalf("EnsureMainBranch() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, "note.md"), []byte("hello"), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	if err := client.Add(ctx, repo, []string{"note.md"}); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
	committed, err := client.Commit(ctx, repo, "sync: update 1 file")
	if err != nil {
		t.Fatalf("Commit() error = %v", err)
	}
	if !committed {
		t.Fatal("Commit() committed = false")
	}
	committed, err = client.Commit(ctx, repo, "sync: update 1 file")
	if err != nil {
		t.Fatalf("Commit(clean) error = %v", err)
	}
	if committed {
		t.Fatal("Commit(clean) committed = true")
	}

	if err := os.WriteFile(filepath.Join(repo, "dirty.md"), []byte("dirty"), 0o644); err != nil {
		t.Fatalf("WriteFile(dirty) error = %v", err)
	}
	committed, err = client.RecoveryCommit(ctx, repo)
	if err != nil {
		t.Fatalf("RecoveryCommit() error = %v", err)
	}
	if !committed {
		t.Fatal("RecoveryCommit() committed = false")
	}
	status, err := client.StatusPorcelain(ctx, repo)
	if err != nil {
		t.Fatalf("StatusPorcelain() error = %v", err)
	}
	if strings.TrimSpace(status) != "" {
		t.Fatalf("status = %q, want clean", status)
	}
	commits, err := client.Log(ctx, repo, 5)
	if err != nil {
		t.Fatalf("Log() error = %v", err)
	}
	if len(commits) != 2 {
		t.Fatalf("commit count = %d, want 2", len(commits))
	}
	if commits[0].Subject != "recovery: commit dirty startup state" || commits[1].Subject != "sync: update 1 file" {
		t.Fatalf("unexpected commits: %+v", commits)
	}
}

func TestClientPushToBareRemote(t *testing.T) {
	ctx := context.Background()
	repo := t.TempDir()
	remote := filepath.Join(t.TempDir(), "backup.git")
	client := NewClient("git")
	if err := client.InitIfNeeded(ctx, repo); err != nil {
		t.Fatalf("InitIfNeeded() error = %v", err)
	}
	if _, err := client.run(ctx, t.TempDir(), "init", "--bare", remote); err != nil {
		t.Fatalf("init bare remote error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, "note.md"), []byte("hello"), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	if err := client.Add(ctx, repo, nil); err != nil {
		t.Fatalf("Add() error = %v", err)
	}
	if _, err := client.Commit(ctx, repo, "sync: update 1 file"); err != nil {
		t.Fatalf("Commit() error = %v", err)
	}
	if err := client.Push(ctx, repo, remote); err != nil {
		t.Fatalf("Push() error = %v", err)
	}
	out, err := client.run(ctx, remote, "rev-parse", "--verify", "main")
	if err != nil {
		t.Fatalf("remote main rev-parse error = %v", err)
	}
	if strings.TrimSpace(out) == "" {
		t.Fatal("remote main hash is empty")
	}
}

func TestQueueFlushCommitsPendingFiles(t *testing.T) {
	ctx := context.Background()
	repo := t.TempDir()
	client := NewClient("git")
	if err := client.InitIfNeeded(ctx, repo); err != nil {
		t.Fatalf("InitIfNeeded() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, "note.md"), []byte("hello"), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
	queue := NewQueue(client, repo, time.Hour)
	if err := queue.Enqueue(ctx, Task{Source: "test", Message: "changed", Paths: []string{"note.md"}}); err != nil {
		t.Fatalf("Enqueue() error = %v", err)
	}
	if queue.Len() != 1 {
		t.Fatalf("Len() = %d, want 1", queue.Len())
	}
	if err := queue.Flush(ctx); err != nil {
		t.Fatalf("Flush() error = %v", err)
	}
	status, err := client.StatusPorcelain(ctx, repo)
	if err != nil {
		t.Fatalf("StatusPorcelain() error = %v", err)
	}
	if strings.TrimSpace(status) != "" {
		t.Fatalf("status = %q, want clean", status)
	}
}

func TestQueueFlushCommitsFinalStateWhenPendingPathsWereRemoved(t *testing.T) {
	ctx := context.Background()
	repo := t.TempDir()
	client := NewClient("git")
	if err := client.InitIfNeeded(ctx, repo); err != nil {
		t.Fatalf("InitIfNeeded() error = %v", err)
	}
	if err := os.MkdirAll(filepath.Join(repo, "notes"), 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, "notes", "today.md"), []byte("temp"), 0o644); err != nil {
		t.Fatalf("WriteFile(today) error = %v", err)
	}
	if err := os.Rename(filepath.Join(repo, "notes", "today.md"), filepath.Join(repo, "notes", "tomorrow.md")); err != nil {
		t.Fatalf("Rename() error = %v", err)
	}
	if err := os.Remove(filepath.Join(repo, "notes", "tomorrow.md")); err != nil {
		t.Fatalf("Remove() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, "notes", "keep.md"), []byte("keep"), 0o644); err != nil {
		t.Fatalf("WriteFile(keep) error = %v", err)
	}

	queue := NewQueue(client, repo, time.Hour)
	if err := queue.Enqueue(ctx, Task{Source: "test", Message: "changed", Paths: []string{"notes/today.md", "notes/tomorrow.md", "notes/keep.md"}}); err != nil {
		t.Fatalf("Enqueue() error = %v", err)
	}
	if err := queue.Flush(ctx); err != nil {
		t.Fatalf("Flush() error = %v", err)
	}
	status, err := client.StatusPorcelain(ctx, repo)
	if err != nil {
		t.Fatalf("StatusPorcelain() error = %v", err)
	}
	if strings.TrimSpace(status) != "" {
		t.Fatalf("status = %q, want clean", status)
	}
}
