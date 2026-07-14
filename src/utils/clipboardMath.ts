import TurndownService from 'turndown'
import { sanitizePastedText } from './textSanitize'

let turndownService: TurndownService | null = null

function getTurndownService(): TurndownService {
  if (turndownService) return turndownService

  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  })

  service.addRule('katexAnnotation', {
    filter: (node) =>
      node.nodeName === 'ANNOTATION' &&
      (node as Element).getAttribute('encoding') === 'application/x-tex',
    replacement: (_content, node) => {
      const tex = (node as HTMLElement).textContent?.trim() ?? ''
      if (!tex) return ''
      return tex.includes('\n') || tex.includes('\\begin') ? `\n$$${tex}$$\n` : `$${tex}$`
    },
  })

  service.addRule('mathTexClass', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false
      return node.classList.contains('tex') || node.classList.contains('latex')
    },
    replacement: (_content, node) => {
      const tex = (node as HTMLElement).textContent?.trim() ?? ''
      return tex ? `$${tex}$` : ''
    },
  })

  turndownService = service
  return service
}

/** Replace KaTeX/MathML nodes in HTML with plain LaTeX delimiters before Turndown. */
function injectLatexFromMathHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('annotation[encoding="application/x-tex"]').forEach((ann) => {
    const tex = ann.textContent?.trim()
    if (!tex) return
    const root =
      ann.closest('.katex, math, [class*="katex"], semantics') ??
      ann.parentElement ??
      ann
    const text = doc.createTextNode(tex.includes('\n') ? `$$${tex}$$` : `$${tex}$`)
    root.replaceWith(text)
  })

  doc.querySelectorAll('.katex, span.katex').forEach((el) => {
    if (el.querySelector('annotation[encoding="application/x-tex"]')) return
    const tex = el.querySelector('.katex-mathml annotation')?.textContent?.trim()
    if (tex) {
      el.replaceWith(doc.createTextNode(`$${tex}$`))
    }
  })

  return doc.body.innerHTML
}

function hasMathHtml(html: string): boolean {
  return /katex|application\/x-tex|class="tex"|class='tex'|<math[\s>]/i.test(html)
}

/**
 * Convert clipboard HTML (Gemini, ChatGPT, etc.) to clean Markdown/LaTeX string.
 * Falls back to sanitized plain text when HTML is absent or not math-related.
 */
export function convertClipboardRichText(html: string, plain: string): string {
  const cleanPlain = sanitizePastedText(plain)

  if (!html?.trim()) return cleanPlain

  try {
    const prepared = hasMathHtml(html) ? injectLatexFromMathHtml(html) : html
    const markdown = getTurndownService().turndown(prepared).trim()
    if (markdown) return sanitizePastedText(markdown)
  } catch (error) {
    console.warn('Rich-text clipboard conversion failed, using plain text:', error)
  }

  return cleanPlain
}

export function extractClipboardContent(event: ClipboardEvent): string {
  const clipboard = event.clipboardData
  if (!clipboard) return ''

  const html = clipboard.getData('text/html')
  const plain = clipboard.getData('text/plain')

  return convertClipboardRichText(html, plain)
}
