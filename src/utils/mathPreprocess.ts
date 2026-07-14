/** Heuristic: content inside brackets is likely LaTeX, not a markdown link label. */
export function looksLikeLatex(content: string): boolean {
  const inner = content.trim()
  if (!inner) return false
  return /\\[a-zA-Z@]+|[\^_{}]|\\frac|\\sqrt|\\text|\\begin\{/.test(inner)
}

/**
 * Normalize model / paste output so markdown-it-katex can render display math reliably.
 */
export function preprocessMathMarkdown(text: string): string {
  let out = text

  // Standard display math \[ ... \] → $$ ... $$ (some parsers are picky)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `$$${inner.trim()}$$`)

  // Standard inline math \( ... \) → $ ... $
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)

  // Bare [ ... ] blocks that look like LaTeX (e.g. "[ c = \sqrt{100} ]")
  out = out.replace(/\[([\s\S]*?)\]/g, (match, inner: string) => {
    if (!looksLikeLatex(inner)) return match
    return `$$${inner.trim()}$$`
  })

  // Preserve intentional LaTeX line breaks inside display blocks
  out = out.replace(/\\\\\s*\n/g, '\\\\\n')

  // Common small-model mistake: x_2 meant as x^2 (only single-digit exponent)
  out = out.replace(/(\b[a-zA-Z])_(\d)\b/g, '$1^$2')

  return out
}
