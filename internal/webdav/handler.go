package webdav

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	appgit "github.com/cbr/mdock/internal/git"
	"github.com/cbr/mdock/internal/locks"
	"github.com/cbr/mdock/internal/store"
	"github.com/cbr/mdock/internal/vault"
)

type Store interface {
	Authenticate(ctx context.Context, login, password string) (store.User, error)
	VaultForUserBySlug(ctx context.Context, userID int64, slug string) (store.Vault, error)
}

type VaultService interface {
	Stat(vaultPath, relPath string) (vault.Info, error)
	List(vaultPath, relPath string) ([]vault.Entry, error)
	ReadFile(vaultPath, relPath string) ([]byte, error)
	WriteFile(vaultPath, relPath string, data []byte) error
	Mkdir(vaultPath, relPath string) error
	Rename(vaultPath, oldRelPath, newRelPath string) error
	Delete(vaultPath, relPath string) error
}

type LockService interface {
	Acquire(ctx context.Context, vaultID int64, path, owner, source string, ttl time.Duration) (locks.Lock, error)
	Release(ctx context.Context, vaultID int64, path, owner string) error
}

type Config struct {
	Store        Store
	VaultService VaultService
	LockService  LockService
	QueueFor     func(store.Vault) (*appgit.Queue, error)
	LockTTL      time.Duration
	Logger       *slog.Logger
}

type Handler struct {
	store        Store
	vaultService VaultService
	lockService  LockService
	queueFor     func(store.Vault) (*appgit.Queue, error)
	lockTTL      time.Duration
	logger       *slog.Logger
}

func NewHandler(cfg Config) http.Handler {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	lockTTL := cfg.LockTTL
	if lockTTL <= 0 {
		lockTTL = 30 * time.Second
	}
	return &Handler{
		store:        cfg.Store,
		vaultService: cfg.VaultService,
		lockService:  cfg.LockService,
		queueFor:     cfg.QueueFor,
		lockTTL:      lockTTL,
		logger:       logger,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	h.applyCORS(recorder, r)
	defer func() {
		h.logger.Info("webdav request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"duration_ms", time.Since(started).Milliseconds(),
		)
	}()

	if r.Method == http.MethodOptions {
		h.options(recorder)
		return
	}
	target, ok := h.authenticate(recorder, r)
	if !ok {
		return
	}

	switch r.Method {
	case "PROPFIND":
		h.propfind(recorder, r, target)
	case http.MethodGet:
		h.get(recorder, target, false)
	case http.MethodHead:
		h.get(recorder, target, true)
	case http.MethodPut:
		h.put(recorder, r, target)
	case "MKCOL":
		h.mkcol(recorder, r, target)
	case http.MethodDelete:
		h.delete(recorder, r, target)
	case "MOVE":
		h.move(recorder, r, target)
	case "LOCK":
		h.lock(recorder, r, target)
	case "UNLOCK":
		h.unlock(recorder, r, target)
	default:
		recorder.Header().Set("Allow", "OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, LOCK, UNLOCK")
		http.Error(recorder, "method not allowed", http.StatusMethodNotAllowed)
	}
}

type target struct {
	user  store.User
	vault store.Vault
	rel   string
}

func (h *Handler) authenticate(w http.ResponseWriter, r *http.Request) (target, bool) {
	username, password, ok := r.BasicAuth()
	if !ok {
		w.Header().Set("WWW-Authenticate", `Basic realm="mdock"`)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return target{}, false
	}
	user, err := h.store.Authenticate(r.Context(), username, password)
	if errors.Is(err, store.ErrInvalidCredentials) {
		w.Header().Set("WWW-Authenticate", `Basic realm="mdock"`)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return target{}, false
	}
	if err != nil {
		h.logger.Error("webdav authenticate", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return target{}, false
	}
	slug, rel, err := parsePath(r.URL.Path)
	if err != nil {
		http.Error(w, "bad webdav path", http.StatusBadRequest)
		return target{}, false
	}
	item, err := h.store.VaultForUserBySlug(r.Context(), user.ID, slug)
	if err != nil {
		http.NotFound(w, r)
		return target{}, false
	}
	return target{user: user, vault: item, rel: rel}, true
}

func (h *Handler) options(w http.ResponseWriter) {
	w.Header().Set("DAV", "1, 2")
	w.Header().Set("Allow", "OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, LOCK, UNLOCK")
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) propfind(w http.ResponseWriter, r *http.Request, target target) {
	depth := r.Header.Get("Depth")
	if depth == "" {
		depth = "1"
	}
	if strings.EqualFold(depth, "infinity") {
		http.Error(w, "depth infinity is not supported; configure Remotely Save to use depth 1", http.StatusForbidden)
		return
	}
	responses := []responseXML{}
	info, err := h.vaultService.Stat(target.vault.Path, target.rel)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	responses = append(responses, makeResponse(target.vault.Slug, info.Path, info.IsDir, info.Size, info.ModTime))
	if info.IsDir && depth != "0" {
		entries, err := h.vaultService.List(target.vault.Path, target.rel)
		if err != nil {
			http.Error(w, "list directory", http.StatusInternalServerError)
			return
		}
		for _, entry := range entries {
			responses = append(responses, makeResponse(target.vault.Slug, entry.Path, entry.IsDir, entry.Size, entry.ModTime))
		}
	}
	writeXML(w, http.StatusMultiStatus, multistatusXML{XMLNS: "DAV:", Responses: responses})
}

func (h *Handler) get(w http.ResponseWriter, target target, head bool) {
	info, err := h.vaultService.Stat(target.vault.Path, target.rel)
	if err != nil || info.IsDir {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	data, err := h.vaultService.ReadFile(target.vault.Path, target.rel)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	setEntityHeaders(w, info.Size, info.ModTime)
	if head {
		return
	}
	_, _ = w.Write(data)
}

func (h *Handler) put(w http.ResponseWriter, r *http.Request, target target) {
	const maxPutBytes = 128 * 1024 * 1024
	_, statErr := h.vaultService.Stat(target.vault.Path, target.rel)
	status := http.StatusNoContent
	if statErr != nil {
		status = http.StatusCreated
	}
	data, err := io.ReadAll(io.LimitReader(r.Body, maxPutBytes+1))
	if err != nil {
		http.Error(w, "read body", http.StatusBadRequest)
		return
	}
	if len(data) > maxPutBytes {
		http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
		return
	}
	if ok := h.withMutationLock(w, r, target, target.rel, func() error {
		return h.vaultService.WriteFile(target.vault.Path, target.rel, data)
	}); !ok {
		return
	}
	h.enqueue(r.Context(), target, []string{target.rel})
	w.WriteHeader(status)
}

func (h *Handler) mkcol(w http.ResponseWriter, r *http.Request, target target) {
	if target.rel == "." {
		http.Error(w, "cannot create vault root", http.StatusMethodNotAllowed)
		return
	}
	if _, err := h.vaultService.Stat(target.vault.Path, target.rel); err == nil {
		http.Error(w, "collection already exists", http.StatusMethodNotAllowed)
		return
	}
	parent := path.Dir(target.rel)
	if parent != "." {
		info, err := h.vaultService.Stat(target.vault.Path, parent)
		if err != nil || !info.IsDir {
			http.Error(w, "parent collection does not exist", http.StatusConflict)
			return
		}
	}
	if ok := h.withMutationLock(w, r, target, target.rel, func() error {
		return h.vaultService.Mkdir(target.vault.Path, target.rel)
	}); !ok {
		return
	}
	h.enqueue(r.Context(), target, []string{target.rel})
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request, target target) {
	if target.rel == "." {
		http.Error(w, "cannot delete vault root", http.StatusForbidden)
		return
	}
	if _, err := h.vaultService.Stat(target.vault.Path, target.rel); err != nil {
		http.NotFound(w, r)
		return
	}
	if ok := h.withMutationLock(w, r, target, target.rel, func() error {
		return h.vaultService.Delete(target.vault.Path, target.rel)
	}); !ok {
		return
	}
	h.enqueue(r.Context(), target, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) move(w http.ResponseWriter, r *http.Request, target target) {
	destination := r.Header.Get("Destination")
	if destination == "" {
		http.Error(w, "destination required", http.StatusBadRequest)
		return
	}
	slug, rel, err := parseDestination(destination)
	if err != nil || slug != target.vault.Slug {
		http.Error(w, "invalid destination", http.StatusBadRequest)
		return
	}
	if target.rel == "." || rel == "." {
		http.Error(w, "cannot move vault root", http.StatusForbidden)
		return
	}
	if _, err := h.vaultService.Stat(target.vault.Path, target.rel); err != nil {
		http.NotFound(w, r)
		return
	}
	overwrite := !strings.EqualFold(r.Header.Get("Overwrite"), "F")
	destExists := false
	if _, err := h.vaultService.Stat(target.vault.Path, rel); err == nil {
		destExists = true
	}
	if destExists && !overwrite {
		http.Error(w, "destination exists", http.StatusPreconditionFailed)
		return
	}
	parent := path.Dir(rel)
	if parent != "." {
		info, err := h.vaultService.Stat(target.vault.Path, parent)
		if err != nil || !info.IsDir {
			http.Error(w, "destination parent does not exist", http.StatusConflict)
			return
		}
	}
	if destExists {
		if ok := h.withMutationLock(w, r, target, rel, func() error {
			return h.vaultService.Delete(target.vault.Path, rel)
		}); !ok {
			return
		}
	}
	if ok := h.withMutationLock(w, r, target, target.rel, func() error {
		return h.vaultService.Rename(target.vault.Path, target.rel, rel)
	}); !ok {
		return
	}
	h.enqueue(r.Context(), target, []string{target.rel, rel})
	if destExists {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) lock(w http.ResponseWriter, r *http.Request, target target) {
	token, err := randomToken()
	if err != nil {
		http.Error(w, "lock token", http.StatusInternalServerError)
		return
	}
	if _, err := h.lockService.Acquire(r.Context(), target.vault.ID, target.rel, token, "webdav", h.lockTTL); err != nil {
		if errors.Is(err, locks.ErrLocked) {
			http.Error(w, "locked", http.StatusLocked)
			return
		}
		h.logger.Error("webdav lock", "error", err, "vault_id", target.vault.ID)
		http.Error(w, "lock failed", http.StatusInternalServerError)
		return
	}
	lockToken := "<opaquelocktoken:" + token + ">"
	w.Header().Set("Lock-Token", lockToken)
	writeXML(w, http.StatusOK, propXML{
		XMLNS: "DAV:",
		LockDiscovery: lockDiscoveryXML{ActiveLock: activeLockXML{
			LockType:  emptyXML{XMLName: xml.Name{Local: "locktype"}, Inner: "<write/>"},
			LockScope: emptyXML{XMLName: xml.Name{Local: "lockscope"}, Inner: "<exclusive/>"},
			Depth:     "infinity",
			Timeout:   "Second-" + fmt.Sprintf("%d", int(h.lockTTL.Seconds())),
			LockToken: hrefXML{Href: "opaquelocktoken:" + token},
		}},
	})
}

func (h *Handler) unlock(w http.ResponseWriter, r *http.Request, target target) {
	token := cleanLockToken(r.Header.Get("Lock-Token"))
	if token == "" {
		http.Error(w, "lock token required", http.StatusBadRequest)
		return
	}
	if err := h.lockService.Release(r.Context(), target.vault.ID, target.rel, token); err != nil {
		h.logger.Error("webdav unlock", "error", err, "vault_id", target.vault.ID)
		http.Error(w, "unlock failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) withMutationLock(w http.ResponseWriter, r *http.Request, target target, rel string, fn func() error) bool {
	owner := requestLockToken(r)
	release := false
	if owner == "" {
		owner = "webdav:" + target.user.Login + ":" + r.Method
		release = true
	}
	if _, err := h.lockService.Acquire(r.Context(), target.vault.ID, rel, owner, "webdav", h.lockTTL); err != nil {
		if errors.Is(err, locks.ErrLocked) {
			http.Error(w, "locked", http.StatusLocked)
			return false
		}
		h.logger.Error("webdav acquire mutation lock", "error", err, "vault_id", target.vault.ID)
		http.Error(w, "lock failed", http.StatusInternalServerError)
		return false
	}
	defer func() {
		if !release {
			return
		}
		if err := h.lockService.Release(context.Background(), target.vault.ID, rel, owner); err != nil {
			h.logger.Error("webdav release mutation lock", "error", err, "vault_id", target.vault.ID)
		}
	}()
	if err := fn(); err != nil {
		http.Error(w, "file operation failed", http.StatusBadRequest)
		return false
	}
	return true
}

func (h *Handler) enqueue(ctx context.Context, target target, paths []string) {
	if h.queueFor == nil {
		return
	}
	queue, err := h.queueFor(target.vault)
	if err != nil {
		h.logger.Error("webdav git queue", "error", err, "vault_id", target.vault.ID)
		return
	}
	if err := queue.Enqueue(ctx, appgit.Task{Source: "webdav", Message: "webdav update", Paths: paths}); err != nil {
		h.logger.Error("webdav enqueue git task", "error", err, "vault_id", target.vault.ID)
	}
}

func parsePath(input string) (string, string, error) {
	clean := strings.TrimPrefix(input, "/webdav")
	clean = strings.TrimPrefix(clean, "/")
	if clean == "" {
		return "", "", fmt.Errorf("vault slug required")
	}
	parts := strings.SplitN(clean, "/", 2)
	slug, err := url.PathUnescape(parts[0])
	if err != nil || slug == "" {
		return "", "", fmt.Errorf("invalid vault slug")
	}
	rel := "."
	if len(parts) == 2 && parts[1] != "" {
		rel, err = url.PathUnescape(parts[1])
		if err != nil {
			return "", "", err
		}
	}
	return slug, rel, nil
}

func parseDestination(input string) (string, string, error) {
	parsed, err := url.Parse(input)
	if err == nil && parsed.Path != "" {
		input = parsed.Path
	}
	return parsePath(input)
}

func makeResponse(slug, rel string, isDir bool, size int64, modTime string) responseXML {
	href := webdavHref(slug, rel, isDir)
	displayName := path.Base(strings.TrimSuffix(rel, "/"))
	if rel == "." {
		displayName = slug
	}
	prop := propstatXML{
		Prop: propValueXML{
			DisplayName: displayName,
			LastMod:     webdavTime(modTime),
		},
		Status: "HTTP/1.1 200 OK",
	}
	if isDir {
		prop.Prop.ResourceType = collectionXML{Collection: &struct{}{}}
	} else {
		prop.Prop.ContentLen = &size
		prop.Prop.ETag = entityTag(size, modTime)
	}
	return responseXML{Href: href, PropStat: prop}
}

func webdavHref(slug, rel string, isDir bool) string {
	parts := []string{"", "webdav", slug}
	if rel != "." && rel != "" {
		for _, part := range strings.Split(path.Clean(rel), "/") {
			if part != "" && part != "." {
				parts = append(parts, part)
			}
		}
	}
	for i := 1; i < len(parts); i++ {
		parts[i] = url.PathEscape(parts[i])
	}
	href := strings.Join(parts, "/")
	if isDir && !strings.HasSuffix(href, "/") {
		href += "/"
	}
	return href
}

func (h *Handler) applyCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if !allowedOrigin(origin) {
		return
	}
	header := w.Header()
	header.Set("Access-Control-Allow-Origin", origin)
	header.Set("Access-Control-Allow-Methods", "OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, LOCK, UNLOCK")
	header.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Depth, Destination, Overwrite, If, Lock-Token, Timeout, Cache-Control, X-Requested-With, X-RS-Test")
	header.Set("Access-Control-Expose-Headers", "DAV, ETag, Last-Modified, Lock-Token")
	header.Add("Vary", "Origin")
}

func allowedOrigin(origin string) bool {
	switch origin {
	case "app://obsidian.md", "capacitor://localhost", "http://localhost":
		return true
	default:
		return false
	}
}

func setEntityHeaders(w http.ResponseWriter, size int64, modTime string) {
	w.Header().Set("ETag", entityTag(size, modTime))
	if parsed, err := time.Parse(time.RFC3339Nano, modTime); err == nil {
		w.Header().Set("Last-Modified", parsed.UTC().Format(http.TimeFormat))
	}
}

func entityTag(size int64, modTime string) string {
	return fmt.Sprintf(`"%x-%s"`, size, strings.ReplaceAll(modTime, `"`, ""))
}

func webdavTime(modTime string) string {
	parsed, err := time.Parse(time.RFC3339Nano, modTime)
	if err != nil {
		return ""
	}
	return parsed.UTC().Format(http.TimeFormat)
}

func requestLockToken(r *http.Request) string {
	if token := cleanLockToken(r.Header.Get("Lock-Token")); token != "" {
		return token
	}
	ifHeader := r.Header.Get("If")
	start := strings.Index(ifHeader, "<opaquelocktoken:")
	if start == -1 {
		return ""
	}
	rest := ifHeader[start:]
	end := strings.Index(rest, ">")
	if end == -1 {
		return ""
	}
	return cleanLockToken(rest[:end+1])
}

func cleanLockToken(input string) string {
	token := strings.TrimSpace(input)
	token = strings.TrimPrefix(token, "<")
	token = strings.TrimSuffix(token, ">")
	token = strings.TrimPrefix(token, "opaquelocktoken:")
	return strings.TrimSpace(token)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func writeXML(w http.ResponseWriter, status int, value any) {
	var buf bytes.Buffer
	buf.WriteString(xml.Header)
	_ = xml.NewEncoder(&buf).Encode(value)
	w.Header().Set("Content-Type", `application/xml; charset="utf-8"`)
	w.WriteHeader(status)
	_, _ = w.Write(buf.Bytes())
}

func randomToken() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

type multistatusXML struct {
	XMLName   xml.Name      `xml:"D:multistatus"`
	XMLNS     string        `xml:"xmlns:D,attr"`
	Responses []responseXML `xml:"D:response"`
}

type responseXML struct {
	Href     string      `xml:"D:href"`
	PropStat propstatXML `xml:"D:propstat"`
}

type propstatXML struct {
	Prop   propValueXML `xml:"D:prop"`
	Status string       `xml:"D:status"`
}

type propValueXML struct {
	DisplayName  string        `xml:"D:displayname,omitempty"`
	ResourceType collectionXML `xml:"D:resourcetype"`
	ContentLen   *int64        `xml:"D:getcontentlength,omitempty"`
	LastMod      string        `xml:"D:getlastmodified,omitempty"`
	ETag         string        `xml:"D:getetag,omitempty"`
}

type collectionXML struct {
	Collection *struct{} `xml:"D:collection,omitempty"`
}

type propXML struct {
	XMLName       xml.Name         `xml:"D:prop"`
	XMLNS         string           `xml:"xmlns:D,attr"`
	LockDiscovery lockDiscoveryXML `xml:"D:lockdiscovery"`
}

type lockDiscoveryXML struct {
	ActiveLock activeLockXML `xml:"D:activelock"`
}

type activeLockXML struct {
	LockType  emptyXML `xml:"D:locktype"`
	LockScope emptyXML `xml:"D:lockscope"`
	Depth     string   `xml:"D:depth"`
	Timeout   string   `xml:"D:timeout"`
	LockToken hrefXML  `xml:"D:locktoken"`
}

type hrefXML struct {
	Href string `xml:"D:href"`
}

type emptyXML struct {
	XMLName xml.Name
	Inner   string `xml:",innerxml"`
}
