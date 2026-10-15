/**
 * Remark plugin for parsing Obsidian-style embeds
 * Handles: ![[path]], ![[path|size]], ![[Note]], ![[Note.md]]
 */

import { visit } from 'unist-util-visit';

/**
 * Supported image extensions
 */
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'];

/**
 * Supported PDF extension
 */
const PDF_EXTS = ['pdf'];

/**
 * Supported audio extensions
 */
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];

/**
 * Supported video extensions
 */
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'mkv', 'avi'];

/**
 * Supported note extensions
 */
const NOTE_EXTS = ['md', 'markdown'];

/**
 * Detect embed type from file extension
 */
function detectEmbedType(path: string): 'image' | 'pdf' | 'audio' | 'video' | 'note' | 'unknown' {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (PDF_EXTS.includes(ext)) return 'pdf';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (NOTE_EXTS.includes(ext) || !ext) return 'note';
  return 'unknown';
}

/**
 * Parse size from embed syntax: ![[path|size]]
 * Returns { width, height, raw }
 */
function parseEmbedSize(sizeStr: string): { width?: string; height?: string; raw: string } | null {
  if (!sizeStr) return null;
  
  // Format: 100, 100x200, 50%, 100px, 100x
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)(?:px|%)?(?:x(\d+(?:\.\d+)?)(?:px|%)?)?$/);
  if (!match) return { width: sizeStr, raw: sizeStr };
  
  return {
    width: match[1] + (match[1].includes('.') || match[2] ? '' : 'px'),
    height: match[2] ? match[2] + 'px' : undefined,
    raw: sizeStr
  };
}

/**
 * Parse embed marker from text
 * Returns { path, size, type } or null
 */
function parseEmbedMarker(text: string): { path: string; size: ReturnType<typeof parseEmbedSize>; type: string } | null {
  // Match: ![[path]] or ![[path|size]]
  const match = text.match(/^!\[\[([^\|\]]+)(\|([^\]]+))?\]\]$/);
  if (!match) return null;

  const path = match[1].trim();
  const sizeStr = match[3]?.trim();
  const size = sizeStr ? parseEmbedSize(sizeStr) : null;
  const type = detectEmbedType(path);

  return { path, size, type };
}

/**
 * Remark plugin to transform embed syntax
 */
export function remarkEmbed() {
  return (tree: any) => {
    visit(tree, 'paragraph', (node: any, index: number, parent: any) => {
      if (!parent || index === undefined) return;

      // Check if paragraph has single text child with embed syntax
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;

      const text = node.children[0].value;
      const embed = parseEmbedMarker(text);
      if (!embed) return;

      // Transform paragraph to embed node
      const embedNode = {
        type: 'embed',
        data: {
          embedPath: embed.path,
          embedSize: embed.size,
          embedType: embed.type,
          hName: 'div',
          hProperties: {
            className: ['embed', `embed-${embed.type}`],
            'data-embed-path': embed.path,
            'data-embed-type': embed.type,
            ...(embed.size?.width && { 'data-embed-width': embed.size.width }),
            ...(embed.size?.height && { 'data-embed-height': embed.size.height })
          }
        },
        children: []
      };

      // Replace paragraph with embed
      parent.children[index] = embedNode;
    });
  };
}

export default remarkEmbed;