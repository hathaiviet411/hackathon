import { nextTick, type Ref } from 'vue'
import { extractClipboardContent } from './clipboardMath'
import { sanitizePastedText, toSafePromptText } from './textSanitize'

export { sanitizePastedText, toSafePromptText }

export type RichTextPasteOptions = {
  /** Collapse newlines to spaces (for single-line inputs). */
  singleLine?: boolean
}

/** @deprecated Use RichTextPasteOptions */
export type PlainTextPasteOptions = RichTextPasteOptions

/**
 * Smart paste: HTML math (KaTeX/MathJax) → Markdown/LaTeX, else plain text.
 */
export function handleRichTextPaste(
  event: ClipboardEvent,
  modelValue: Ref<string>,
  options: RichTextPasteOptions = {},
): void {
  event.preventDefault()
  event.stopPropagation()

  let text = extractClipboardContent(event)

  if (options.singleLine) {
    text = text.replace(/\s*\n+\s*/g, ' ')
  }

  const target = event.target
  if (
    !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
    typeof target.selectionStart !== 'number'
  ) {
    modelValue.value = modelValue.value + text
    return
  }

  const start = target.selectionStart
  const end = target.selectionEnd ?? start
  const current = modelValue.value

  modelValue.value = current.slice(0, start) + text + current.slice(end)

  void nextTick(() => {
    const pos = start + text.length
    target.selectionStart = pos
    target.selectionEnd = pos
  })
}

/** @deprecated Alias for handleRichTextPaste */
export const handlePlainTextPaste = handleRichTextPaste

export function useRichTextPaste(modelValue: Ref<string>, options: RichTextPasteOptions = {}) {
  return (event: ClipboardEvent) => handleRichTextPaste(event, modelValue, options)
}

/** @deprecated Alias for usePlainTextPaste */
export const usePlainTextPaste = useRichTextPaste
