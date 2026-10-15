/**
 * Icon components for editor toolbar
 */

import {
  Bold,
  Braces,
  CheckSquare,
  Code2,
  Heading,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  Pilcrow,
  Quote,
  Rows2,
  Save,
  Sigma,
  Strikethrough,
  GitBranch,
} from 'lucide-react';

export function getGroupIcon(name) {
  const icons = {
    paragraph: <Pilcrow size={16} aria-hidden="true" />,
    inline: <Bold size={16} aria-hidden="true" />,
    lists: <List size={16} aria-hidden="true" />,
    insert: <Rows2 size={16} aria-hidden="true" />,
  };
  return icons[name] || null;
}

export function getCommandIcon(id) {
  const icons = {
    paragraph: <Pilcrow size={16} aria-hidden="true" />,
    heading1: <Heading size={16} aria-hidden="true" />,
    heading2: <Heading size={16} aria-hidden="true" />,
    heading3: <Heading size={16} aria-hidden="true" />,
    heading4: <Heading size={16} aria-hidden="true" />,
    heading5: <Heading size={16} aria-hidden="true" />,
    heading6: <Heading size={16} aria-hidden="true" />,
    quote: <Quote size={16} aria-hidden="true" />,
    codeBlock: <Code2 size={16} aria-hidden="true" />,
    bold: <Bold size={16} aria-hidden="true" />,
    italic: <Italic size={16} aria-hidden="true" />,
    strikethrough: <Strikethrough size={16} aria-hidden="true" />,
    highlight: <Highlighter size={16} aria-hidden="true" />,
    inlineCode: <Code2 size={16} aria-hidden="true" />,
    comment: <MessageSquare size={16} aria-hidden="true" />,
    bulletList: <List size={16} aria-hidden="true" />,
    orderedList: <ListOrdered size={16} aria-hidden="true" />,
    taskList: <CheckSquare size={16} aria-hidden="true" />,
    taskDone: <CheckSquare size={16} aria-hidden="true" />,
    indent: null,
    outdent: null,
    link: <Link size={16} aria-hidden="true" />,
    image: <Image size={16} aria-hidden="true" />,
    wikilink: null,
    embed: null,
    table: <Rows2 size={16} aria-hidden="true" />,
    callout: <Quote size={16} aria-hidden="true" />,
    horizontalRule: <Minus size={16} aria-hidden="true" />,
    inlineMath: <Sigma size={16} aria-hidden="true" />,
    blockMath: <Sigma size={16} aria-hidden="true" />,
    footnote: null,
    metadata: <Braces size={16} aria-hidden="true" />,
    mermaid: <GitBranch size={16} aria-hidden="true" />,
  };
  return icons[id] || null;
}