package webdist

import "embed"

// Assets contains production frontend files. Vite builds into webdist/dist.
//
//go:embed all:dist
var Assets embed.FS
