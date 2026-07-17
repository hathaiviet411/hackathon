import type { LlmMessage } from '@/workers/ai-worker.types'

const LOG_PREFIX = '[AI payload]'

let workerBusy = false

/** Acquire worker lock before postMessage GENERATE. Returns false if worker is busy. */
export function tryAcquireWorkerLock(): boolean {
  if (workerBusy) {
    if (import.meta.env.DEV) {
      console.warn(`${LOG_PREFIX} Worker đang bận — bỏ qua yêu cầu generate trùng lặp`)
    }
    return false
  }
  workerBusy = true
  return true
}

/** Release worker lock after DONE / ERROR from worker. Idempotent. */
export function releaseWorkerLock() {
  workerBusy = false
}

export function isWorkerBusy() {
  return workerBusy
}

/** Release only when a generate request is in flight (avoids clearing lock on unrelated worker errors). */
export function releaseWorkerLockIfBusy() {
  if (workerBusy) workerBusy = false
}

export function logAiPayload(stage: string, payload: unknown) {
  if (!import.meta.env.DEV) return
  console.groupCollapsed(`${LOG_PREFIX} ${stage}`)
  console.log(payload)
  console.groupEnd()
}

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

/** WebLLM LLM models require plain string content on user/assistant only — no system role, no undefined. */
export function prepareWebLlmMessages(messages: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  const normalized = normalizeMessages(messages)
  const systemParts: string[] = []
  const conversation: LlmMessage[] = []

  for (const message of normalized) {
    if (message.role === 'system') {
      systemParts.push(message.content)
      continue
    }
    conversation.push(message)
  }

  const systemPrefix = systemParts.join('\n\n').trim()
  const prepared: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const message of conversation) {
    if (message.role !== 'user' && message.role !== 'assistant') continue

    let content = normalizeMessageContent(message.content).trim()
    if (!content) {
      throw new Error(`Empty ${message.role} message content after normalization`)
    }

    if (message.role === 'user' && systemPrefix && prepared.length === 0) {
      content = `${systemPrefix}\n\n${content}`
    }

    prepared.push({ role: message.role, content })
  }

  const last = prepared[prepared.length - 1]
  if (!last || last.role !== 'user') {
    throw new Error('Last message must be a non-empty user message')
  }

  for (const message of prepared) {
    if (typeof message.content !== 'string' || message.content.length === 0) {
      throw new Error(`Invalid WebLLM message: role=${message.role}`)
    }
    if (message.content === 'undefined' || message.content === 'null') {
      throw new Error(`Corrupted message content for role=${message.role}`)
    }
  }

  return prepared
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

export function toApiMessages(messages: LlmMessage[]): LlmMessage[] {
  return normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: normalizeMessageContent(message.content).trim(),
  }))
}

export function serializeMessages(messages: LlmMessage[]): LlmMessage[] {
  return JSON.parse(JSON.stringify(toApiMessages(messages))) as LlmMessage[]
}

/** Plain objects safe for structured clone / postMessage (no undefined, no proxies). */
export function toPlainWebLlmMessages(
  messages: Array<LlmMessage | { role: 'user' | 'assistant'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return prepareWebLlmMessages(messages).map((message) => ({
    role: message.role,
    content: String(message.content),
  }))
}

export function serializeWebLlmMessages(messages: LlmMessage[]) {
  return JSON.parse(JSON.stringify(toPlainWebLlmMessages(messages))) as Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

/** Hard sanitize before postMessage — every content must be a non-empty string. */
export function sanitizeWorkerMessages(
  messages: unknown,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(messages)) return []

  return messages
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null
      const role = (raw as { role?: unknown }).role
      if (role !== 'user' && role !== 'assistant') return null
      const content = normalizeMessageContent((raw as { content?: unknown }).content).trim()
      if (!content) return null
      return { role, content }
    })
    .filter((m): m is { role: 'user' | 'assistant'; content: string } => m !== null)
}

export function buildWorkerGeneratePacket(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: { temperature: number; maxTokens: number },
) {
  const sanitized = sanitizeWorkerMessages(messages)
  if (!sanitized.length) {
    throw new Error('No valid messages for worker')
  }

  const last = sanitized[sanitized.length - 1]
  if (last.role !== 'user') {
    throw new Error('Last worker message must be from user')
  }

  // Single-turn: send plain prompt string — bypasses chat messages API entirely
  if (sanitized.length === 1) {
    return {
      type: 'GENERATE' as const,
      prompt: last.content,
      options,
    }
  }

  return {
    type: 'GENERATE' as const,
    messages: sanitized,
    options,
  }
}
