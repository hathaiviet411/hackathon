/// <reference lib="webworker" />

import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm'
import type { WorkerInboundMessage, WorkerOutboundMessage } from './ai-worker.types'
import { logAiPayload, sanitizeWorkerMessages } from '../utils/llmMessages'

let engine: MLCEngineInterface | null = null
let isReady = false
let generateInFlight = false

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg)
}

function debug(stage: string, payload: unknown) {
  logAiPayload(stage, payload)
  post({ type: 'DEBUG', stage, payload })
}

async function initEngine(modelId: string) {
  if (engine) {
    try {
      await engine.unload()
    } catch {
      // ignore unload errors during re-init
    }
    engine = null
    isReady = false
  }

  const { CreateMLCEngine } = await import('@mlc-ai/web-llm')

  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report: InitProgressReport) => {
      post({ type: 'PROGRESS', progress: report.progress, text: report.text })
    },
  })

  isReady = true
  post({ type: 'READY' })
}

function resolvePrompt(raw: WorkerInboundMessage & { type: 'GENERATE' }): string | null {
  if (typeof raw.prompt === 'string') {
    const prompt = raw.prompt.trim()
    return prompt.length > 0 ? prompt : null
  }
  return null
}

function resolveChatMessages(raw: WorkerInboundMessage & { type: 'GENERATE' }) {
  if (!Array.isArray(raw.messages) || raw.messages.length === 0) return null

  const messages = sanitizeWorkerMessages(raw.messages)
  if (!messages.length) return null

  const last = messages[messages.length - 1]
  if (last.role !== 'user') {
    throw new Error('Last message must be from user')
  }

  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : String(message.content ?? ''),
  }))
}

async function streamTokens(
  stream: AsyncIterable<{
    choices: Array<{ delta?: { content?: string | null }; text?: string }>
  }>,
) {
  for await (const chunk of stream) {
    const choice = chunk.choices[0]
    const content = choice?.delta?.content ?? choice?.text
    if (typeof content === 'string' && content.length > 0) {
      post({ type: 'TOKEN', token: content })
    }
  }
}

async function generate(
  raw: WorkerInboundMessage & { type: 'GENERATE' },
  options?: { temperature?: number; maxTokens?: number },
) {
  if (!engine || !isReady) {
    post({ type: 'ERROR', message: 'Engine not initialized' })
    return
  }

  if (generateInFlight) {
    post({ type: 'ERROR', message: 'Generation already in progress' })
    return
  }

  generateInFlight = true

  try {
    const inferenceOptions = {
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
      stream: true as const,
    }

    await engine.resetChat()

    const prompt = resolvePrompt(raw)
    if (prompt) {
      debug('worker → engine.completions.create', { promptPreview: prompt.slice(0, 160) })

      const stream = await engine.completions.create({
        prompt,
        ...inferenceOptions,
      })
      await streamTokens(stream)
      post({ type: 'DONE' })
      return
    }

    const chatMessages = resolveChatMessages(raw)
    if (!chatMessages) {
      throw new Error('GENERATE requires a prompt string or messages[] with string content')
    }

    for (const message of chatMessages) {
      if (typeof message.content !== 'string' || message.content.length === 0) {
        throw new Error(`Invalid message content for role=${message.role}`)
      }
    }

    debug('worker → engine.chat.completions.create', chatMessages)

    const stream = await engine.chat.completions.create({
      messages: chatMessages,
      ...inferenceOptions,
    })
    await streamTokens(stream)
    post({ type: 'DONE' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed'
    debug('worker error', { message })
    post({ type: 'ERROR', message })
  } finally {
    generateInFlight = false
  }
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data

  switch (msg.type) {
    case 'INIT':
      try {
        await initEngine(msg.modelId)
      } catch (e) {
        post({ type: 'ERROR', message: e instanceof Error ? e.message : 'Init failed' })
      }
      break
    case 'GENERATE':
      try {
        debug('worker received', {
          hasPrompt: typeof msg.prompt === 'string',
          messageCount: Array.isArray(msg.messages) ? msg.messages.length : 0,
        })
        await generate(msg, msg.options)
      } catch (e) {
        post({ type: 'ERROR', message: e instanceof Error ? e.message : 'Invalid generate payload' })
      }
      break
    case 'TERMINATE':
      engine = null
      isReady = false
      self.close()
      break
    case 'RESET_HISTORY':
      if (engine) {
        try {
          await engine.resetChat()
        } catch {
          // ignore if pipeline not ready
        }
      }
      break
  }
}
