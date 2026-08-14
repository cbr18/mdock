package vault

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func SafeRelPath(input string) (string, error) {
	if input == "" || input == "." || input == "/" {
		return ".", nil
	}
	if filepath.IsAbs(input) {
		return "", fmt.Errorf("absolute paths are not allowed")
	}

	clean := filepath.Clean(input)
	if clean == "." {
		return ".", nil
	}
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path traversal is not allowed")
	}

	parts := strings.Split(clean, string(filepath.Separator))
	for _, part := range parts {
		if part == ".git" {
			return "", fmt.Errorf(".git access is not allowed")
		}
	}
	return clean, nil
}

type Entry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"is_dir"`
	Size    int64  `json:"size"`
	ModTime string `json:"mod_time"`
}

type Info struct {
	Path    string `json:"path"`
	IsDir   bool   `json:"is_dir"`
	Size    int64  `json:"size"`
	ModTime string `json:"mod_time"`
}

type Service struct {
	root string
}

func NewService(root string) (*Service, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("resolve vaults root: %w", err)
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, fmt.Errorf("create vaults root: %w", err)
	}
	return &Service{root: abs}, nil
}

func (s *Service) VaultRoot(vaultPath string) (string, error) {
	rel, err := SafeRelPath(vaultPath)
	if err != nil {
		return "", err
	}
	root := filepath.Join(s.root, rel)
	if err := ensureInside(s.root, root); err != nil {
		return "", err
	}
	return root, nil
}

func (s *Service) EnsureVault(vaultPath string) (string, error) {
	root, err := s.VaultRoot(vaultPath)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", fmt.Errorf("create vault root: %w", err)
	}
	return root, nil
}

func (s *Service) CheckRoot() error {
	info, err := os.Stat(s.root)
	if err != nil {
		return fmt.Errorf("stat vaults root: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("vaults root is not a directory")
	}
	return nil
}

func (s *Service) Resolve(vaultPath, relPath string) (string, string, error) {
	root, err := s.EnsureVault(vaultPath)
	if err != nil {
		return "", "", err
	}
	rel, err := SafeRelPath(relPath)
	if err != nil {
		return "", "", err
	}
	full := filepath.Join(root, rel)
	if err := ensureInside(root, full); err != nil {
		return "", "", err
	}
	if rel == "." {
		return root, full, nil
	}
	parent := filepath.Dir(full)
	parentEval, err := filepath.EvalSymlinks(parent)
	if err != nil && !os.IsNotExist(err) {
		return "", "", fmt.Errorf("resolve parent symlinks: %w", err)
	}
	if err == nil {
		if err := ensureInside(root, parentEval); err != nil {
			return "", "", err
		}
	}
	if eval, err := filepath.EvalSymlinks(full); err == nil {
		if err := ensureInside(root, eval); err != nil {
			return "", "", err
		}
	}
	return root, full, nil
}

func (s *Service) List(vaultPath, relPath string) ([]Entry, error) {
	root, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return nil, err
	}
	items, err := os.ReadDir(full)
	if err != nil {
		return nil, fmt.Errorf("list directory: %w", err)
	}
	entries := make([]Entry, 0, len(items))
	for _, item := range items {
		if item.Name() == ".git" {
			continue
		}
		info, err := item.Info()
		if err != nil {
			return nil, fmt.Errorf("stat directory entry: %w", err)
		}
		path, err := filepath.Rel(root, filepath.Join(full, item.Name()))
		if err != nil {
			return nil, fmt.Errorf("entry relative path: %w", err)
		}
		entries = append(entries, Entry{Name: item.Name(), Path: filepath.ToSlash(path), IsDir: item.IsDir(), Size: info.Size(), ModTime: info.ModTime().UTC().Format(time.RFC3339Nano)})
	}
	return entries, nil
}

func (s *Service) Stat(vaultPath, relPath string) (Info, error) {
	root, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return Info{}, err
	}
	info, err := os.Stat(full)
	if err != nil {
		return Info{}, fmt.Errorf("stat path: %w", err)
	}
	path, err := filepath.Rel(root, full)
	if err != nil {
		return Info{}, fmt.Errorf("stat relative path: %w", err)
	}
	return Info{Path: filepath.ToSlash(path), IsDir: info.IsDir(), Size: info.Size(), ModTime: info.ModTime().UTC().Format(time.RFC3339Nano)}, nil
}

func (s *Service) ReadFile(vaultPath, relPath string) ([]byte, error) {
	_, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(full)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}
	return data, nil
}

func (s *Service) WriteFile(vaultPath, relPath string, data []byte) error {
	_, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return fmt.Errorf("create file parent: %w", err)
	}
	if err := os.WriteFile(full, data, 0o644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	return nil
}

func (s *Service) Mkdir(vaultPath, relPath string) error {
	_, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(full, 0o755); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}
	return nil
}

func (s *Service) Rename(vaultPath, oldRelPath, newRelPath string) error {
	_, oldFull, err := s.Resolve(vaultPath, oldRelPath)
	if err != nil {
		return err
	}
	_, newFull, err := s.Resolve(vaultPath, newRelPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(newFull), 0o755); err != nil {
		return fmt.Errorf("create rename parent: %w", err)
	}
	if err := os.Rename(oldFull, newFull); err != nil {
		return fmt.Errorf("rename path: %w", err)
	}
	return nil
}

func (s *Service) Delete(vaultPath, relPath string) error {
	_, full, err := s.Resolve(vaultPath, relPath)
	if err != nil {
		return err
	}
	if err := os.RemoveAll(full); err != nil {
		return fmt.Errorf("delete path: %w", err)
	}
	return nil
}

func ensureInside(root, path string) error {
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return fmt.Errorf("resolve root: %w", err)
	}
	pathAbs, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve path: %w", err)
	}
	rel, err := filepath.Rel(rootAbs, pathAbs)
	if err != nil {
		return fmt.Errorf("relative path check: %w", err)
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return fmt.Errorf("path escapes vault root")
	}
	return nil
}
