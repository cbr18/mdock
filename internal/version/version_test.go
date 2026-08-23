package version

import (
	"os"
	"strings"
	"testing"
)

func TestCurrentMatchesRootVersionFile(t *testing.T) {
	raw, err := os.ReadFile("../../VERSION")
	if err != nil {
		t.Fatalf("read VERSION: %v", err)
	}
	if got := strings.TrimSpace(string(raw)); got != Current {
		t.Fatalf("Current = %q, VERSION = %q", Current, got)
	}
}
