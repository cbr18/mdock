/**
 * Rehype plugin for rendering embeds to HTML
 * Transforms embed AST nodes to proper HTML based on type
 */

import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

/**
 * Rehype plugin to render embed nodes
 */
export function rehypeEmbed() {
  return (tree: any) => {
    visit(tree, 'element', (node: Element, index: number, parent: any) => {
      if (!node.properties || node.properties['data-embed-type'] === undefined) return;

      const embedType = node.properties['data-embed-type'];
      const embedPath = node.properties['data-embed-path'];
      const embedWidth = node.properties['data-embed-width'];
      const embedHeight = node.properties['data-embed-height'];

      if (!embedPath) return;

      // Build the API URL for the file
      // In live preview, we use a relative path that gets proxied
      const fileUrl = `/api/vaults/current/files/${encodeURIComponent(embedPath)}`;

      let replacement: Element;

      switch (embedType) {
        case 'image':
          replacement = createImageEmbed(fileUrl, embedPath, embedWidth, embedHeight);
          break;
        case 'pdf':
          replacement = createPdfEmbed(fileUrl, embedPath, embedWidth, embedHeight);
          break;
        case 'audio':
          replacement = createAudioEmbed(fileUrl, embedPath, embedWidth);
          break;
        case 'video':
          replacement = createVideoEmbed(fileUrl, embedPath, embedWidth, embedHeight);
          break;
        case 'note':
          replacement = createNoteEmbed(embedPath);
          break;
        default:
          replacement = createUnknownEmbed(embedPath, embedType);
      }

      // Replace the node
      Object.assign(node, replacement);
    });
  };
}

function createImageEmbed(src: string, alt: string, width?: string, height?: string): Element {
  const styleParts: string[] = [
    'max-width: 100%',
    'height: auto',
    'border-radius: var(--embed-radius, var(--radius))',
    'background: var(--embed-image-bg, var(--bg-subtle))',
    'transition: var(--embed-image-transition, transform 150ms ease-out)'
  ];

  if (width) styleParts.push(`width: ${width}`);
  if (height) styleParts.push(`height: ${height}`);

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-image'],
      'data-embed-type': 'image'
    },
    children: [
      {
        type: 'element',
        tagName: 'img',
        properties: {
          src,
          alt,
          loading: 'lazy',
          style: styleParts.join('; '),
          'data-embed-src': src
        },
        children: []
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-caption'],
          style: 'margin-top: var(--space-2); font-size: var(--font-size-sm, 13px); color: var(--text-muted); text-align: center;'
        },
        children: [{ type: 'text', value: alt }]
      }
    ]
  };
}

function createPdfEmbed(src: string, name: string, width?: string, height?: string): Element {
  // Use iframe with PDF.js viewer
  // The viewer URL will be handled by the web app
  // Pass width/height as params for initial view configuration
  const params = new URLSearchParams({ file: src });
  if (width) params.set('width', width);
  if (height) params.set('height', height);
  const viewerUrl = `/embed/pdf?${params.toString()}`;

  const containerStyleParts: string[] = [
    'border: 1px solid var(--embed-pdf-border, var(--border))',
    'border-radius: var(--embed-radius, var(--radius))',
    'background: var(--embed-pdf-bg, var(--bg))',
    'overflow: hidden',
    'display: flex',
    'flex-direction: column'
  ];

  if (width) containerStyleParts.push(`width: ${width}`);
  else containerStyleParts.push('width: 100%');

  if (height) containerStyleParts.push(`height: ${height}`);
  else containerStyleParts.push('height: var(--embed-pdf-height, 600px)');

  const iframeStyleParts: string[] = [
    'flex: 1',
    'border: none',
    'background: var(--embed-pdf-bg, var(--bg))',
    'width: 100%',
    'height: 100%'
  ];

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-pdf'],
      'data-embed-type': 'pdf',
      style: containerStyleParts.join('; ')
    },
    children: [
      {
        type: 'element',
        tagName: 'iframe',
        properties: {
          src: viewerUrl,
          style: iframeStyleParts.join('; '),
          frameBorder: '0',
          title: `PDF: ${name}`,
          allow: 'fullscreen',
          'data-embed-src': src
        },
        children: []
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-caption'],
          style: 'margin-top: 0; padding: var(--space-2); font-size: var(--font-size-sm, 13px); color: var(--text-muted); text-align: left; background: var(--embed-pdf-toolbar-bg, var(--surface-2)); border-top: 1px solid var(--embed-pdf-border, var(--border));'
        },
        children: [{ type: 'text', value: `📄 ${name}` }]
      }
    ]
  };
}

function createAudioEmbed(src: string, name: string, width?: string): Element {
  const styleParts: string[] = [
    'border-radius: var(--embed-radius, var(--radius))',
    'background: var(--embed-media-bg, var(--bg))'
  ];

  if (width) styleParts.push(`width: ${width}`);
  else styleParts.push('width: 100%');

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-audio'],
      'data-embed-type': 'audio'
    },
    children: [
      {
        type: 'element',
        tagName: 'audio',
        properties: {
          controls: true,
          src,
          style: styleParts.join('; '),
          'data-embed-src': src
        },
        children: [
          {
            type: 'element',
            tagName: 'track',
            properties: { kind: 'captions' },
            children: []
          },
          { type: 'text', value: `Your browser does not support the audio element. <a href="${src}">Download</a>` }
        ]
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-caption'],
          style: 'margin-top: var(--space-2); font-size: var(--font-size-sm, 13px); color: var(--text-muted); text-align: center;'
        },
        children: [{ type: 'text', value: `🔊 ${name}` }]
      }
    ]
  };
}

function createVideoEmbed(src: string, name: string, width?: string, height?: string): Element {
  const styleParts: string[] = [
    'max-width: 100%',
    'border-radius: var(--embed-radius, var(--radius))',
    'background: var(--embed-media-bg, var(--bg))'
  ];

  if (width) styleParts.push(`width: ${width}`);
  if (height) styleParts.push(`height: ${height}`);

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-video'],
      'data-embed-type': 'video'
    },
    children: [
      {
        type: 'element',
        tagName: 'video',
        properties: {
          controls: true,
          src,
          style: styleParts.join('; '),
          'data-embed-src': src
        },
        children: [
          { type: 'text', value: `Your browser does not support the video element. <a href="${src}">Download</a>` }
        ]
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-caption'],
          style: 'margin-top: var(--space-2); font-size: var(--font-size-sm, 13px); color: var(--text-muted); text-align: center;'
        },
        children: [{ type: 'text', value: `🎬 ${name}` }]
      }
    ]
  };
}

function createNoteEmbed(path: string): Element {
  // Note transclusion - will be hydrated client-side
  const displayName = path.replace(/\.md$/, '').split('/').pop() || path;

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-note', 'embed-note-pending'],
      'data-embed-type': 'note',
      'data-embed-path': path
    },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-note-header'],
          style: 'display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); background: var(--embed-note-title-bg, var(--bg-subtle)); border-bottom: 1px solid var(--embed-note-border, var(--border)); border-radius: var(--embed-radius, var(--radius)) var(--embed-radius, var(--radius)) 0 0;'
        },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['embed-note-icon'],
              style: 'color: var(--embed-note-icon, var(--text-muted));'
            },
            children: [{ type: 'raw', value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' }]
          },
          {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['embed-note-title'],
              style: 'font-weight: 500; color: var(--embed-note-title-text, var(--text-soft)); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
            },
            children: [{ type: 'text', value: displayName }]
          }
        ]
      },
      {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['embed-note-content'],
          style: 'padding: var(--space-3); min-height: 60px;',
          'data-embed-content': 'true'
        },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['embed-note-loading'],
              style: 'display: flex; align-items: center; justify-content: center; height: 60px; color: var(--text-muted); font-size: var(--font-size-sm, 13px);'
            },
            children: [{ type: 'text', value: 'Loading...' }]
          }
        ]
      }
    ]
  };
}

function createUnknownEmbed(path: string, type: string): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['embed', 'embed-error'],
      'data-embed-type': 'error',
      style: 'border: 1px solid var(--embed-error-border, var(--danger)); background: var(--embed-error-bg); border-radius: var(--embed-radius, var(--radius)); padding: var(--space-3); color: var(--embed-error-text, var(--danger));'
    },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: {
          style: 'display: flex; align-items: center; gap: var(--space-2);'
        },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: {
              'aria-hidden': 'true',
              style: 'font-size: 1.2em;'
            },
            children: [{ type: 'text', value: '⚠' }]
          },
          {
            type: 'element',
            tagName: 'div',
            children: [
              {
                type: 'element',
                tagName: 'div',
                properties: { style: 'font-weight: 500;' },
                children: [{ type: 'text', value: `Unsupported embed: ${path}` }]
              },
              {
                type: 'element',
                tagName: 'div',
                properties: { style: 'font-size: var(--font-size-sm, 13px); opacity: 0.8;' },
                children: [{ type: 'text', value: `Type "${type}" is not supported` }]
              }
            ]
          }
        ]
      }
    ]
  };
}

export default rehypeEmbed;