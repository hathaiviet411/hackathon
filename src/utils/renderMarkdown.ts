import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import markdownItKatex from 'markdown-it-katex'
import { preprocessMathMarkdown } from './mathPreprocess'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
}).use(markdownItKatex)

/** Close unbalanced $ / $$ while streaming so KaTeX does not crash mid-formula. */
export function stabilizeMathDelimiters(text: string): string {
  let out = text

  const displayCount = (out.match(/\$\$/g) || []).length
  if (displayCount % 2 !== 0) {
    out += '$$'
  }

  const withoutDisplay = out.replace(/\$\$/g, '')
  const inlineCount = (withoutDisplay.match(/\$/g) || []).length
  if (inlineCount % 2 !== 0) {
    out += '$'
  }

  return out
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdownHtml(
  content: string,
  options: { streaming?: boolean; plainText?: boolean } = {},
): string {
  const raw = content ?? ''
  if (!raw) return ''

  if (options.plainText) {
    return DOMPurify.sanitize(escapeHtml(raw))
  }

  const normalized = preprocessMathMarkdown(raw)
  const source = options.streaming ? stabilizeMathDelimiters(normalized) : normalized

  try {
    const html = markdown.render(source)
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['style', 'class', 'aria-hidden', 'role', 'xmlns', 'encoding'],
      ADD_TAGS: [
        'math',
        'semantics',
        'annotation',
        'mrow',
        'mi',
        'mn',
        'mo',
        'msup',
        'msub',
        'mfrac',
        'mroot',
        'msqrt',
        'mtext',
        'mspace',
        'mtable',
        'mtr',
        'mtd',
        'menclose',
        'mstyle',
        'mpadded',
      ],
    })
  } catch (error) {
    console.error('Markdown render error:', error)
    return DOMPurify.sanitize(`<pre class="whitespace-pre-wrap">${escapeHtml(raw)}</pre>`)
  }
}
