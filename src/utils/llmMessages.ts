import type { LlmMessage } from '@/workers/ai-worker.types'

export function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (content == null) return ''
  if (Array.isArray(content)) {
    const textPart = content.find(
      (part): part is { type: string; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    return textPart?.text ?? ''
  }
  return String(content)
}

export function normalizeMessages(messages: unknown): LlmMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array')
  }

  const normalized = messages
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const role = (raw as LlmMessage).role
      if (role !== 'system' && role !== 'user' && role !== 'assistant') return null
      const content = normalizeMessageContent((raw as LlmMessage).content).trim()
      if (!content) return null
      return { role, content }
    })
    .filter((m): m is LlmMessage => m !== null)

  if (!normalized.length) {
    throw new Error('No valid messages after normalization')
  }

  const last = normalized[normalized.length - 1]
  if (last.role !== 'user') {
    throw new Error('Last message must be from user')
  }

  return normalized
}

export function toApiMessages(messages: LlmMessage[]): Array<{ role: LlmMessage['role']; content: string }> {
  return normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: String(message.content),
  }))
}

export function serializeMessages(messages: LlmMessage[]): LlmMessage[] {
  return JSON.parse(JSON.stringify(toApiMessages(messages))) as LlmMessage[]
}
