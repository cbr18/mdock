package search

import (
	"encoding/json"
	"strings"

	"github.com/yuin/goldmark/v2/ast"
	"github.com/yuin/goldmark/v2/extension"
	"github.com/yuin/goldmark/v2/parser"
)

// PageMetadata represents extracted metadata from a markdown page
type PageMetadata struct {
	Title       string
	Aliases     []string
	Tags        []string
	Headings    []Heading
	Blocks      []BlockRef
	ContentHash string
}

// Heading represents a heading in a page
type Heading struct {
	Level  int    `json:"level"`
	Text   string `json:"text"`
	Anchor string `json:"anchor"`
	Line   int    `json:"line"`
}

// BlockRef represents a block reference in a page
type BlockRef struct {
	ID      string `json:"id"`
	Heading string `json:"heading"`
	Line    int    `json:"line"`
}

var mdParser = parser.New(
	parser.WithExtensions(extension.GFMParser),
	parser.WithAutoHeadingID(),
)

// ParsePage extracts metadata from markdown content
func ParsePage(content string) PageMetadata {
	var meta PageMetadata

	// Extract frontmatter first (before parsing with goldmark)
	meta.Title, meta.Aliases, meta.Tags = extractFrontmatter(content)

	// Parse with goldmark for headings and blocks
	doc := mdParser.Parse([]byte(content))

	// Walk the AST to extract headings and block refs
	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}

		switch n.Kind() {
		case ast.KindHeading:
			heading := n.(*ast.Heading)
			meta.Headings = append(meta.Headings, Heading{
				Level:  heading.Level,
				Text:   headingText(n, content),
				Anchor: headingAnchor(heading),
				Line:   headingLine(n, content),
			})
		case ast.KindCodeSpan:
			// Check for block refs like ^block-id
			if text := codeSpanText(n, content); strings.HasPrefix(text, "^") {
				meta.Blocks = append(meta.Blocks, BlockRef{
					ID:      text,
					Heading: nearestHeading(meta.Headings, headingLine(n, content)),
					Line:    headingLine(n, content),
				})
			}
		}
		return ast.WalkContinue, nil
	})

	// If no title from frontmatter, use first heading or fallback
	if meta.Title == "" {
		if len(meta.Headings) > 0 {
			meta.Title = meta.Headings[0].Text
		}
	}

	return meta
}

// extractFrontmatter parses YAML frontmatter from content
func extractFrontmatter(content string) (title string, aliases []string, tags []string) {
	content = strings.TrimSpace(content)
	if !strings.HasPrefix(content, "---") {
		return "", nil, nil
	}

	end := strings.Index(content[3:], "---")
	if end == -1 {
		return "", nil, nil
	}

	fmContent := content[3 : end+3]
	lines := strings.Split(fmContent, "\n")

	var inAliases, inTags bool

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "- ") && (inAliases || inTags) {
			val := strings.TrimSpace(line[2:])
			val = strings.Trim(val, `"'`)
			if inAliases {
				aliases = append(aliases, val)
			} else if inTags {
				tags = append(tags, val)
			}
			continue
		}

		inAliases = false
		inTags = false

		if strings.Contains(line, ":") {
			parts := strings.SplitN(line, ":", 2)
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)

			switch strings.ToLower(key) {
			case "title":
				title = val
			case "aliases":
				inAliases = true
				if val != "" && val != "[" && val != "]" {
					val = strings.Trim(val, `[]`)
					for _, a := range strings.Split(val, ",") {
						aliases = append(aliases, strings.TrimSpace(strings.Trim(a, `"'`)))
					}
				}
			case "tags":
				inTags = true
				if val != "" && val != "[" && val != "]" {
					val = strings.Trim(val, `[]`)
					for _, t := range strings.Split(val, ",") {
						tags = append(tags, strings.TrimSpace(strings.Trim(t, `"'`)))
					}
				}
			}
		}
	}

	return title, aliases, tags
}

func headingText(n ast.Node, source string) string {
	var buf strings.Builder
	ast.Walk(n, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if entering {
			if n.Kind() == ast.KindText {
				if t, ok := n.(*ast.Text); ok {
					buf.WriteString(t.Value.Value([]byte(source)))
				}
			}
		}
		return ast.WalkContinue, nil
	})
	return strings.TrimSpace(buf.String())
}

func headingAnchor(h *ast.Heading) string {
	if val, ok := h.Attribute("id"); ok {
		return val.Value([]byte(""))
	}
	// Generate anchor from text (simplified)
	text := headingText(h, "")
	text = strings.ToLower(text)
	text = strings.ReplaceAll(text, " ", "-")
	text = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, text)
	return text
}

func headingLine(n ast.Node, source string) int {
	// Get position from the node
	if pos := n.Pos(); pos >= 0 {
		lines := strings.Split(source[:pos], "\n")
		return len(lines)
	}
	return 0
}

func codeSpanText(n ast.Node, source string) string {
	if cs, ok := n.(*ast.CodeSpan); ok {
		return cs.Value.Value([]byte(source))
	}
	return ""
}

func nearestHeading(headings []Heading, line int) string {
	var nearest string
	for _, h := range headings {
		if h.Line <= line {
			nearest = h.Text
		} else {
			break
		}
	}
	return nearest
}

// MarshalAliases marshals aliases to JSON
func MarshalAliases(aliases []string) string {
	if len(aliases) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(aliases)
	return string(b)
}

// MarshalTags marshals tags to JSON
func MarshalTags(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(tags)
	return string(b)
}

// MarshalHeadings marshals headings to JSON
func MarshalHeadings(headings []Heading) string {
	if len(headings) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(headings)
	return string(b)
}

// MarshalBlocks marshals blocks to JSON
func MarshalBlocks(blocks []BlockRef) string {
	if len(blocks) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(blocks)
	return string(b)
}