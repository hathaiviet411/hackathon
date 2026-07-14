/// <reference lib="webworker" />

import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm'
import type { WorkerInboundMessage, WorkerOutboundMessage, LlmMessage } from './ai-worker.types'
import { toApiMessages } from '../utils/llmMessages'

let engine: MLCEngineInterface | null = null
let isReady = false
let generateInFlight = false

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg)
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

function resolveGenerateInput(msg: Extract<WorkerInboundMessage, { type: 'GENERATE' }>): LlmMessage[] {
  if (Array.isArray(msg.messages) && msg.messages.length > 0) {
    return toApiMessages(msg.messages)
  }

  if (typeof msg.prompt === 'string' && msg.prompt.trim()) {
    return toApiMessages([{ role: 'user', content: msg.prompt.trim() }])
  }

  throw new Error('GENERATE requires messages[] with string content or a prompt string')
}

async function generate(messages: LlmMessage[], options?: { temperature?: number; maxTokens?: number }) {
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
    const apiMessages = toApiMessages(messages)

    for (const message of apiMessages) {
      if (typeof message.content !== 'string' || message.content.length === 0) {
        throw new Error(`Invalid message content for role=${message.role}`)
      }
    }

    // WebLLM resets/reuses KV cache internally when conversation changes — no manual resetChat().
    const stream = await engine.chat.completions.create({
      messages: apiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (typeof content === 'string' && content.length > 0) {
        post({ type: 'TOKEN', token: content })
      }
    }

    post({ type: 'DONE' })
  } catch (e) {
    post({ type: 'ERROR', message: e instanceof Error ? e.message : 'Generation failed' })
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
        const messages = resolveGenerateInput(msg)
        await generate(messages, msg.options)
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
      break
  }
}
