/**
 * Remark plugin for parsing Mermaid code blocks
 * Transforms ```mermaid fenced code blocks into mermaid AST nodes
 */

import { visit } from 'unist-util-visit';

/**
 * Remark plugin to transform mermaid code blocks
 */
export function remarkMermaid() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index: number, parent: any) => {
      if (!parent || index === undefined) return;

      // Check if this is a mermaid code block
      if (node.lang !== 'mermaid') return;

      // Transform code block to mermaid node
      const mermaidNode = {
        type: 'mermaid',
        data: {
          hName: 'div',
          hProperties: {
            className: ['mermaid'],
            'data-mermaid-code': node.value.trim(),
          },
        },
        value: node.value.trim(),
      };

      // Replace code block with mermaid node
      parent.children[index] = mermaidNode;
    });
  };
}

export default remarkMermaid;