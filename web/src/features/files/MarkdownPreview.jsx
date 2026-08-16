import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '../i18n/LanguageProvider.jsx';

export function MarkdownPreview({ content }) {
  const { t } = useLanguage();
  const { frontmatter, body } = splitFrontmatter(content || '');

  if (!content) {
    return <p className="muted empty-preview">{t('selectFile')}</p>;
  }

  return (
    <article className="markdown-preview">
      {frontmatter ? (
        <section className="markdown-frontmatter" aria-label={t('frontmatter')}>
          <h4>{t('frontmatter')}</h4>
          <pre>{frontmatter}</pre>
        </section>
      ) : null}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkFrontmatter]}
        rehypePlugins={[rehypeHighlight]}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}

function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: '', body: content };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return { frontmatter: '', body: content };
  }
  const frontmatter = content.slice(4, end).trim();
  const bodyStart = content.indexOf('\n', end + 4);
  return {
    frontmatter,
    body: bodyStart === -1 ? '' : content.slice(bodyStart + 1)
  };
}
