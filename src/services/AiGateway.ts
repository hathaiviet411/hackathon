import { checkWebGpuSupport, getDeviceMemoryGB } from '@/composables/useNetworkStatus'
import {
  DEFAULT_INFERENCE_OPTIONS,
  DEFAULT_MODEL_ID,
  DEFAULT_SYSTEM_PROMPT,
  LOCAL_MODELS,
  MAX_HISTORY_TURNS,
} from '@/config/ai'
import type { LlmMessage, WorkerInboundMessage, WorkerOutboundMessage } from '@/workers/ai-worker.types'
import { serializeMessages } from '@/utils/llmMessages'
import { useAiEngineStore } from '@/stores/aiEngine'
import { pinia } from '@/stores/pinia'
import type { AiBackend, AiRoutingMode } from '@/types'
import { InferenceTrace, finalizeLiveTrace } from '@/services/TraceEmitter'
import { streamCloudInference } from '@/services/mockCloudApi'
import { useTraceStore } from '@/stores/trace'

type GenerateCallbacks = {
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

export type AiSessionId = 'chat' | 'engine'

export type GenerateOptions = {
  session?: AiSessionId
  systemPrompt?: string
}

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

type PendingGenerate = {
  accumulated: string
  callbacks: GenerateCallbacks
  resolve: (value: string) => void
  reject: (error: Error) => void
}

class AiGatewayService {
  private worker: Worker | null = null
  private workerReady = false
  private modelId: string = DEFAULT_MODEL_ID
  private systemPrompt = DEFAULT_SYSTEM_PROMPT
  private histories: Record<AiSessionId, HistoryMessage[]> = {
    chat: [],
    engine: [],
  }
  private initPromise: Promise<void> | null = null
  private initResolve: (() => void) | null = null
  private initReject: ((error: Error) => void) | null = null
  private pendingGenerate: PendingGenerate | null = null
  private generateChain: Promise<unknown> = Promise.resolve()

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt.trim() || DEFAULT_SYSTEM_PROMPT
  }

  getSystemPrompt() {
    return this.systemPrompt
  }

  getModelId() {
    return this.modelId
  }

  getAvailableModels() {
    return LOCAL_MODELS
  }

  setModelId(modelId: string) {
    if (this.modelId === modelId) return false
    this.modelId = modelId
    if (this.workerReady) {
      this.disposeWorker()
    }
    return true
  }

  clearHistory(session: AiSessionId = 'chat') {
    this.histories[session] = []
  }

  getHistory(session: AiSessionId) {
    return [...this.histories[session]]
  }

  private appendHistory(session: AiSessionId, userPrompt: string, assistantReply: string) {
    const user = (userPrompt ?? '').trim()
    const assistant = (assistantReply ?? '').trim()
    if (!user || !assistant) return

    const history = this.histories[session]
    history.push({ role: 'user', content: user })
    history.push({ role: 'assistant', content: assistant })

    const maxMessages = MAX_HISTORY_TURNS * 2
    if (history.length > maxMessages) {
      this.histories[session] = history.slice(-maxMessages)
    }
  }

  private buildMessages(session: AiSessionId, userPrompt: string, systemPrompt: string): LlmMessage[] {
    const prompt = (userPrompt ?? '').trim()
    if (!prompt) {
      throw new Error('Prompt cannot be empty')
    }

    const system = (systemPrompt ?? DEFAULT_SYSTEM_PROMPT).trim() || DEFAULT_SYSTEM_PROMPT

    const history = this.histories[session]
      .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content.trim() } as HistoryMessage))

    // Single-turn: one user string (system inlined) — avoids system-role edge cases on small LLMs.
    if (history.length === 0) {
      return serializeMessages([{ role: 'user', content: `${system}\n\n${prompt}` }])
    }

    return serializeMessages([
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: prompt },
    ])
  }

  private createWorker(): Worker {
    return new Worker(
      // rev=6: static string required by Vite worker bundler (busts stale worker cache)
      new URL('../workers/ai-worker.ts?rev=6', import.meta.url),
      { type: 'module' },
    )
  }

  private handleWorkerMessage = (event: MessageEvent<WorkerOutboundMessage>) => {
    const msg = event.data
    const store = useAiEngineStore(pinia)

    if (msg.type === 'PROGRESS') {
      store.setModelProgress(Math.round(msg.progress * 100))
      return
    }

    if (msg.type === 'TOKEN' && this.pendingGenerate) {
      if (!msg.token) return
      this.pendingGenerate.accumulated += msg.token
      this.pendingGenerate.callbacks.onToken?.(msg.token)
      return
    }

    if (msg.type === 'DONE' && this.pendingGenerate) {
      const pending = this.pendingGenerate
      this.pendingGenerate = null
      pending.resolve(pending.accumulated)
      return
    }

    if (msg.type === 'ERROR') {
      if (this.pendingGenerate) {
        const pending = this.pendingGenerate
        this.pendingGenerate = null
        pending.reject(new Error(msg.message))
        return
      }

      store.setError(msg.message)
      this.initReject?.(new Error(msg.message))
      return
    }

    if (msg.type === 'READY') {
      this.workerReady = true
      store.setEngineState('ready')
      store.setModelProgress(100)
      this.initResolve?.()
    }
  }

  private bindWorker(worker: Worker) {
    worker.addEventListener('message', this.handleWorkerMessage)
  }

  private unbindWorker(worker: Worker) {
    worker.removeEventListener('message', this.handleWorkerMessage)
  }

  private disposeWorker() {
    if (!this.worker) return

    this.pendingGenerate?.reject(new Error('Worker disposed'))
    this.pendingGenerate = null
    this.initReject?.(new Error('Worker disposed'))
    this.initPromise = null
    this.initResolve = null
    this.initReject = null

    try {
      this.worker.postMessage({ type: 'TERMINATE' } satisfies WorkerInboundMessage)
    } catch {
      // worker may already be dead
    }

    this.unbindWorker(this.worker)
    this.worker.terminate()
    this.worker = null
    this.workerReady = false
  }

  private isPayloadContentError(message: string) {
    return message.includes('user message only supports string content')
  }

  async resolveBackend(mode: AiRoutingMode): Promise<AiBackend> {
    if (mode === 'local') return 'edge'
    if (mode === 'cloud') return navigator.onLine ? 'cloud' : 'edge'

    if (!navigator.onLine) return 'edge'

    const hasWebGpu = await checkWebGpuSupport()
    const memory = getDeviceMemoryGB()

    if (!hasWebGpu) return 'cloud'
    if (memory !== null && memory < 4) return 'cloud'

    return 'edge'
  }

  private async ensureWorker(): Promise<void> {
    if (this.worker && this.workerReady) return
    if (this.initPromise) return this.initPromise

    const store = useAiEngineStore(pinia)
    store.setEngineState('loading')
    store.setActiveBackend('edge')
    store.setModelProgress(0)

    this.disposeWorker()
    this.worker = this.createWorker()
    this.bindWorker(this.worker)

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker unavailable'))
        return
      }

      this.initResolve = () => {
        this.initPromise = null
        this.initResolve = null
        this.initReject = null
        resolve()
      }
      this.initReject = (error) => {
        this.initPromise = null
        this.initResolve = null
        this.initReject = null
        reject(error)
      }

      this.worker.postMessage({ type: 'INIT', modelId: this.modelId } satisfies WorkerInboundMessage)
    })

    return this.initPromise
  }

  private runExclusiveGenerate<T>(task: () => Promise<T>): Promise<T> {
    const run = this.generateChain.then(task)
    this.generateChain = run.then(() => undefined, () => undefined)
    return run
  }

  async init(options?: { modelId?: string; mode?: AiRoutingMode; systemPrompt?: string }) {
    if (options?.modelId) this.modelId = options.modelId
    if (options?.systemPrompt) this.setSystemPrompt(options.systemPrompt)

    const store = useAiEngineStore(pinia)
    const mode = options?.mode ?? store.routingMode
    const backend = await this.resolveBackend(mode)
    store.setActiveBackend(backend)

    if (backend === 'edge') {
      await this.ensureWorker()
    } else {
      store.setEngineState('ready')
    }
  }

  async generate(
    prompt: string,
    callbacks: GenerateCallbacks = {},
    mode?: AiRoutingMode,
    options: GenerateOptions = {},
  ): Promise<string> {
    const store = useAiEngineStore(pinia)
    const session = options.session ?? 'chat'
    const systemPrompt = options.systemPrompt ?? this.systemPrompt
    const routingMode = mode ?? store.routingMode
    const backend = await this.resolveBackend(routingMode)
    const messages = this.buildMessages(session, prompt, systemPrompt)
    const trace = new InferenceTrace(backend, routingMode, prompt, this.modelId)

    store.setEngineState('inferring')
    store.setActiveBackend(backend)
    store.setError(null)

    let accumulated = ''
    let tokenCount = 0

    trace.startInference(backend, messages.length)

    let traceSettled = false

    try {
      if (backend === 'edge') {
        accumulated = await this.generateLocal(messages, callbacks)
      } else {
        accumulated = await this.generateCloud(prompt, callbacks)
      }

      tokenCount = accumulated.split(/\s+/).filter(Boolean).length
      if (accumulated) {
        this.appendHistory(session, prompt, accumulated)
      }

      trace.complete(backend, accumulated.length, tokenCount)
      traceSettled = true
      store.setEngineState('ready')
      callbacks.onDone?.()
      return accumulated
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Inference failed'
      trace.fail(message)
      traceSettled = true
      store.setError(message)
      callbacks.onError?.(message)
      return accumulated
    } finally {
      if (!traceSettled) {
        trace.abort('Stream ended before completion')
      }

      // Belt-and-suspenders: no RUNNING steps after chat stream closes
      const traceStore = useTraceStore(pinia)
      if (traceStore.isTracing) {
        traceStore.finalizeRunningSteps(
          store.engineState === 'error' ? 'ERROR' : 'SUCCESS',
          'Stream closed',
        )
      }

      if (store.engineState === 'inferring') {
        store.setEngineState('ready')
      }
    }
  }

  private async generateLocal(
    messages: LlmMessage[],
    callbacks: GenerateCallbacks,
    allowRetry = true,
  ): Promise<string> {
    return this.runExclusiveGenerate(async () => {
      await this.ensureWorker()
      if (!this.worker) throw new Error('Worker unavailable')

      const payload = serializeMessages(messages)

      try {
        return await this.postGenerateToWorker(payload, callbacks)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Generation failed'
        if (allowRetry && this.isPayloadContentError(message)) {
          this.disposeWorker()
          await this.ensureWorker()
          if (!this.worker) throw new Error('Worker unavailable after retry')
          return this.postGenerateToWorker(payload, callbacks)
        }
        throw e
      }
    })
  }

  private postGenerateToWorker(messages: LlmMessage[], callbacks: GenerateCallbacks): Promise<string> {
    if (!this.worker) return Promise.reject(new Error('Worker unavailable'))
    if (this.pendingGenerate) return Promise.reject(new Error('Generation already in progress'))

    const worker = this.worker
    const packet = JSON.parse(
      JSON.stringify({
        type: 'GENERATE',
        messages,
        options: {
          temperature: DEFAULT_INFERENCE_OPTIONS.temperature,
          maxTokens: DEFAULT_INFERENCE_OPTIONS.maxTokens,
        },
      }),
    ) satisfies WorkerInboundMessage

    return new Promise((resolve, reject) => {
      this.pendingGenerate = {
        accumulated: '',
        callbacks,
        resolve,
        reject,
      }
      worker.postMessage(packet)
    })
  }

  private async generateCloud(prompt: string, callbacks: GenerateCallbacks): Promise<string> {
    let accumulated = ''

    await streamCloudInference(prompt, {
      onToken: (token) => {
        accumulated += token
        callbacks.onToken?.(token)
      },
      onError: callbacks.onError,
    })

    return accumulated
  }

  terminate() {
    this.pendingGenerate?.reject(new Error('Generation cancelled'))
    this.pendingGenerate = null
    this.disposeWorker()
    this.histories.chat = []
    this.histories.engine = []
    const store = useAiEngineStore(pinia)
    store.setEngineState('idle')
    store.setActiveBackend(null)
    finalizeLiveTrace('ERROR', 'Engine unloaded')
  }

  getEngineState() {
    return useAiEngineStore(pinia).engineState
  }

  getActiveBackend() {
    return useAiEngineStore(pinia).activeBackend
  }
}

export const AiGateway = new AiGatewayService()
