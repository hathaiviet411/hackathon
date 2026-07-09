/// <reference lib="webworker" />

import type { MLCEngineInterface, InitProgressReport } from '@mlc-ai/web-llm'
import type { WorkerInboundMessage, WorkerOutboundMessage } from './ai-worker.types'

let engine: MLCEngineInterface | null = null
let isReady = false

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg)
}

async function initEngine(modelId: string) {
  const { CreateMLCEngine } = await import('@mlc-ai/web-llm')

  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report: InitProgressReport) => {
      post({ type: 'PROGRESS', progress: report.progress, text: report.text })
    },
  })

  isReady = true
  post({ type: 'READY' })
}

async function generate(prompt: string, options?: { temperature?: number; maxTokens?: number }) {
  if (!engine || !isReady) {
    post({ type: 'ERROR', message: 'Engine not initialized' })
    return
  }

  try {
    const stream = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
      stream: true,
    })

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? ''
      if (token) post({ type: 'TOKEN', token })
    }

    post({ type: 'DONE' })
  } catch (e) {
    post({ type: 'ERROR', message: e instanceof Error ? e.message : 'Generation failed' })
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
      await generate(msg.prompt, msg.options)
      break
    case 'TERMINATE':
      engine = null
      isReady = false
      self.close()
      break
  }
}
