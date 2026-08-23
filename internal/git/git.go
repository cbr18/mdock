package git

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Client struct {
	bin string
}

type CommitInfo struct {
	Hash      string `json:"hash"`
	Subject   string `json:"subject"`
	Author    string `json:"author"`
	CreatedAt string `json:"created_at"`
}

type ChangedFile struct {
	Path    string `json:"path"`
	OldPath string `json:"old_path,omitempty"`
	Status  string `json:"status"`
	Binary  bool   `json:"binary"`
	Adds    int    `json:"adds"`
	Deletes int    `json:"deletes"`
}

type CommitDetails struct {
	CommitInfo
	Files []ChangedFile `json:"files"`
	Diff  string        `json:"diff"`
}

func NewClient(bin string) *Client {
	if bin == "" {
		bin = "git"
	}
	return &Client{bin: bin}
}

func (c *Client) InitIfNeeded(ctx context.Context, repoPath string) error {
	if err := os.MkdirAll(repoPath, 0o755); err != nil {
		return fmt.Errorf("create repo path: %w", err)
	}
	if _, err := os.Stat(filepath.Join(repoPath, ".git")); err == nil {
		return nil
	}
	if _, err := c.run(ctx, repoPath, "init", "-b", "main"); err != nil {
		return err
	}
	return nil
}

func (c *Client) EnsureMainBranch(ctx context.Context, repoPath string) error {
	branch, err := c.run(ctx, repoPath, "symbolic-ref", "--short", "HEAD")
	if err == nil && strings.TrimSpace(branch) == "main" {
		return nil
	}
	if _, err := c.run(ctx, repoPath, "checkout", "-B", "main"); err != nil {
		return err
	}
	return nil
}

func (c *Client) StatusPorcelain(ctx context.Context, repoPath string) (string, error) {
	return c.run(ctx, repoPath, "status", "--porcelain")
}

func (c *Client) Log(ctx context.Context, repoPath string, limit int) ([]CommitInfo, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	out, err := c.run(ctx, repoPath, "log", fmt.Sprintf("-%d", limit), "--date=iso-strict", "--pretty=format:%H%x1f%an%x1f%aI%x1f%s")
	if err != nil {
		if strings.Contains(err.Error(), "does not have any commits yet") || strings.Contains(err.Error(), "your current branch") {
			return nil, nil
		}
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	commits := make([]CommitInfo, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.SplitN(line, "\x1f", 4)
		if len(parts) != 4 {
			return nil, fmt.Errorf("parse git log line: %q", line)
		}
		commits = append(commits, CommitInfo{
			Hash:      parts[0],
			Author:    parts[1],
			CreatedAt: parts[2],
			Subject:   parts[3],
		})
	}
	return commits, nil
}

func (c *Client) CommitDetails(ctx context.Context, repoPath, hash string) (CommitDetails, error) {
	if !validCommitHash(hash) {
		return CommitDetails{}, fmt.Errorf("invalid commit hash")
	}
	out, err := c.run(ctx, repoPath, "show", "--date=iso-strict", "--format=%H%x1f%an%x1f%aI%x1f%s", "--no-patch", hash)
	if err != nil {
		return CommitDetails{}, err
	}
	parts := strings.SplitN(strings.TrimSpace(out), "\x1f", 4)
	if len(parts) != 4 {
		return CommitDetails{}, fmt.Errorf("parse git show metadata: %q", out)
	}
	files, err := c.commitFiles(ctx, repoPath, hash)
	if err != nil {
		return CommitDetails{}, err
	}
	diff, err := c.run(ctx, repoPath, "show", "--format=", "--patch", "--find-renames", "--no-ext-diff", "--no-color", hash)
	if err != nil {
		return CommitDetails{}, err
	}
	return CommitDetails{
		CommitInfo: CommitInfo{
			Hash:      parts[0],
			Author:    parts[1],
			CreatedAt: parts[2],
			Subject:   parts[3],
		},
		Files: files,
		Diff:  diff,
	}, nil
}

func (c *Client) commitFiles(ctx context.Context, repoPath, hash string) ([]ChangedFile, error) {
	out, err := c.run(ctx, repoPath, "show", "--format=", "--numstat", "--name-status", "--find-renames", hash)
	if err != nil {
		return nil, err
	}
	stats := map[string]ChangedFile{}
	statusLines := []string{}
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		if len(fields) >= 3 && (isInt(fields[0]) || fields[0] == "-") && (isInt(fields[1]) || fields[1] == "-") {
			path := fields[len(fields)-1]
			entry := stats[path]
			entry.Path = path
			if fields[0] == "-" || fields[1] == "-" {
				entry.Binary = true
			} else {
				entry.Adds = atoi(fields[0])
				entry.Deletes = atoi(fields[1])
			}
			stats[path] = entry
			continue
		}
		statusLines = append(statusLines, line)
	}
	files := make([]ChangedFile, 0, len(statusLines))
	for _, line := range statusLines {
		fields := strings.Split(line, "\t")
		if len(fields) < 2 {
			continue
		}
		status := fields[0]
		path := fields[len(fields)-1]
		oldPath := ""
		if strings.HasPrefix(status, "R") && len(fields) >= 3 {
			oldPath = fields[1]
		}
		entry := stats[path]
		entry.Path = path
		entry.OldPath = oldPath
		entry.Status = status
		files = append(files, entry)
	}
	return files, nil
}

func (c *Client) Push(ctx context.Context, repoPath, remoteURL string) error {
	remoteURL = strings.TrimSpace(remoteURL)
	if remoteURL == "" {
		return fmt.Errorf("remote url is required")
	}
	if _, err := c.run(ctx, repoPath, "remote", "get-url", "backup"); err != nil {
		if _, addErr := c.run(ctx, repoPath, "remote", "add", "backup", remoteURL); addErr != nil {
			return addErr
		}
	} else if _, err := c.run(ctx, repoPath, "remote", "set-url", "backup", remoteURL); err != nil {
		return err
	}
	if _, err := c.run(ctx, repoPath, "push", "backup", "main"); err != nil {
		return err
	}
	return nil
}

func (c *Client) HasChanges(ctx context.Context, repoPath string) (bool, error) {
	status, err := c.StatusPorcelain(ctx, repoPath)
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(status) != "", nil
}

func (c *Client) Add(ctx context.Context, repoPath string, paths []string) error {
	args := []string{"add", "--"}
	if len(paths) == 0 {
		args = []string{"add", "-A"}
	} else {
		args = append(args, paths...)
	}
	_, err := c.run(ctx, repoPath, args...)
	return err
}

func (c *Client) Commit(ctx context.Context, repoPath, message string) (bool, error) {
	changed, err := c.HasChanges(ctx, repoPath)
	if err != nil {
		return false, err
	}
	if !changed {
		return false, nil
	}
	_, err = c.run(ctx, repoPath,
		"-c", "user.name=mdock",
		"-c", "user.email=mdock@local",
		"commit", "-m", message,
	)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (c *Client) RecoveryCommit(ctx context.Context, repoPath string) (bool, error) {
	if err := c.Add(ctx, repoPath, nil); err != nil {
		return false, err
	}
	return c.Commit(ctx, repoPath, "recovery: uncommitted changes on startup")
}

func (c *Client) run(ctx context.Context, repoPath string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, c.bin, args...)
	cmd.Dir = repoPath
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("git %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}
	return stdout.String(), nil
}

func validCommitHash(hash string) bool {
	if len(hash) < 7 || len(hash) > 40 {
		return false
	}
	for _, char := range hash {
		if (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F') {
			continue
		}
		return false
	}
	return true
}

func isInt(value string) bool {
	if value == "" {
		return false
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func atoi(value string) int {
	result := 0
	for _, char := range value {
		result = result*10 + int(char-'0')
	}
	return result
}

type Task struct {
	Source  string
	Message string
	Paths   []string
}

type Queue struct {
	client   *Client
	repoPath string
	debounce time.Duration

	runMu   sync.Mutex
	mu      sync.Mutex
	pending map[string]string
	timer   *time.Timer
	closed  bool
	lastErr error
}

func NewQueue(client *Client, repoPath string, debounce time.Duration) *Queue {
	if debounce <= 0 {
		debounce = time.Second
	}
	return &Queue{client: client, repoPath: repoPath, debounce: debounce, pending: map[string]string{}}
}

func (q *Queue) Enqueue(_ context.Context, task Task) error {
	if task.Source == "" {
		return fmt.Errorf("git task source is required")
	}
	if task.Message == "" {
		return fmt.Errorf("git task message is required")
	}
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.closed {
		return fmt.Errorf("git queue is closed")
	}
	for _, path := range task.Paths {
		q.pending[path] = task.Source
	}
	if len(task.Paths) == 0 {
		q.pending[""] = task.Source
	}
	if q.timer != nil {
		q.timer.Stop()
	}
	q.timer = time.AfterFunc(q.debounce, func() {
		q.flush(context.Background())
	})
	return nil
}

func (q *Queue) Flush(ctx context.Context) error {
	return q.flush(ctx)
}

func (q *Queue) Close(ctx context.Context) error {
	q.mu.Lock()
	q.closed = true
	if q.timer != nil {
		q.timer.Stop()
	}
	q.mu.Unlock()
	return q.flush(ctx)
}

func (q *Queue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.pending)
}

func (q *Queue) LastError() error {
	q.mu.Lock()
	defer q.mu.Unlock()
	return q.lastErr
}

func (q *Queue) RunExclusive(ctx context.Context, fn func(context.Context) error) error {
	q.runMu.Lock()
	defer q.runMu.Unlock()
	err := fn(ctx)
	q.setLastErr(err)
	return err
}

func (q *Queue) flush(ctx context.Context) error {
	q.mu.Lock()
	paths := make([]string, 0, len(q.pending))
	sources := map[string]struct{}{}
	for path, source := range q.pending {
		if path != "" {
			paths = append(paths, path)
		}
		if source != "" {
			sources[source] = struct{}{}
		}
	}
	q.pending = map[string]string{}
	q.mu.Unlock()

	q.runMu.Lock()
	defer q.runMu.Unlock()

	if err := q.client.Add(ctx, q.repoPath, nil); err != nil {
		q.setLastErr(err)
		return err
	}
	message := syncCommitMessage(sources, len(paths))
	_, err := q.client.Commit(ctx, q.repoPath, message)
	if err != nil {
		q.setLastErr(err)
		return err
	}
	q.setLastErr(nil)
	return nil
}

func syncCommitMessage(sources map[string]struct{}, files int) string {
	source := "mixed"
	if len(sources) == 1 {
		for item := range sources {
			source = item
		}
	}
	if strings.TrimSpace(source) == "" {
		source = "unknown"
	}
	unit := "files"
	if files == 1 {
		unit = "file"
	}
	return fmt.Sprintf("sync(%s): update %d %s", source, files, unit)
}

func (q *Queue) setLastErr(err error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.lastErr = err
}
