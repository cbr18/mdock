package server

import (
	"log/slog"
	"net/http"

	"github.com/cbr/mdock/internal/app"
	"github.com/cbr/mdock/internal/config"
	"github.com/cbr/mdock/internal/httpapi"
	"github.com/cbr/mdock/internal/store"
)

type Server struct {
	router http.Handler
}

func New(cfg config.Config, st *store.Store, logger *slog.Logger) (*Server, error) {
	service, err := app.New(cfg, st, logger)
	if err != nil {
		return nil, err
	}
	router, err := httpapi.New(service, logger)
	if err != nil {
		return nil, err
	}
	return &Server{router: router}, nil
}

func (s *Server) Handler() http.Handler {
	return s.router
}
