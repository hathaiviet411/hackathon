/** Strip hidden formatting artifacts from pasted or model text. */
export function sanitizePastedText(raw: unknown): string {
  if (raw == null) return ''
  const text = typeof raw === 'string' ? raw : String(raw)

  return (
    text
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2028\u2029]/g, '\n')
      .replace(/\u2212/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
  )
}

export function toSafePromptText(value: unknown): string {
  return sanitizePastedText(value).trim()
}
