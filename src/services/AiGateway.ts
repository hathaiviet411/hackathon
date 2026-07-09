import { checkWebGpuSupport, getDeviceMemoryGB } from '@/composables/useNetworkStatus'
import { useAiEngineStore } from '@/stores/aiEngine'
import type { AiBackend, AiRoutingMode } from '@/types'
import { DEFAULT_MODEL_ID } from '@/workers/ai-worker.types'
import type { WorkerInboundMessage, WorkerOutboundMessage } from '@/workers/ai-worker.types'
import { streamCloudInference } from '@/services/mockCloudApi'

type GenerateCallbacks = {
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

class AiGatewayService {
  private worker: Worker | null = null
  private workerReady = false
  private modelId = DEFAULT_MODEL_ID

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

    const store = useAiEngineStore()
    store.setEngineState('loading')
    store.setActiveBackend('edge')
    store.setModelProgress(0)

    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/ai-worker.ts', import.meta.url), {
        type: 'module',
      })
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error('Worker unavailable'))

      const handler = (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data
        if (msg.type === 'PROGRESS') {
          store.setModelProgress(Math.round(msg.progress * 100))
        } else if (msg.type === 'READY') {
          this.workerReady = true
          store.setEngineState('ready')
          store.setModelProgress(100)
          this.worker?.removeEventListener('message', handler)
          resolve()
        } else if (msg.type === 'ERROR') {
          store.setError(msg.message)
          this.worker?.removeEventListener('message', handler)
          reject(new Error(msg.message))
        }
      }

      this.worker.addEventListener('message', handler)
      this.worker.postMessage({ type: 'INIT', modelId: this.modelId } satisfies WorkerInboundMessage)
    })
  }

  async init(options?: { modelId?: string; mode?: AiRoutingMode }) {
    if (options?.modelId) this.modelId = options.modelId

    const store = useAiEngineStore()
    const mode = options?.mode ?? store.routingMode
    const backend = await this.resolveBackend(mode)
    store.setActiveBackend(backend)

    if (backend === 'edge') {
      await this.ensureWorker()
    } else {
      store.setEngineState('ready')
    }
  }

  async generate(prompt: string, callbacks: GenerateCallbacks = {}, mode?: AiRoutingMode) {
    const store = useAiEngineStore()
    const backend = await this.resolveBackend(mode ?? store.routingMode)

    store.setEngineState('inferring')
    store.setActiveBackend(backend)
    store.setError(null)

    try {
      if (backend === 'edge') {
        await this.generateLocal(prompt, callbacks)
      } else {
        await this.generateCloud(prompt, callbacks)
      }
      store.setEngineState('ready')
      callbacks.onDone?.()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Inference failed'
      store.setError(message)
      callbacks.onError?.(message)
    }
  }

  private async generateLocal(prompt: string, callbacks: GenerateCallbacks) {
    await this.ensureWorker()
    if (!this.worker) throw new Error('Worker unavailable')

    const worker = this.worker
    return new Promise<void>((resolve, reject) => {
      const handler = (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data
        if (msg.type === 'TOKEN') callbacks.onToken?.(msg.token)
        else if (msg.type === 'DONE') {
          worker.removeEventListener('message', handler)
          resolve()
        } else if (msg.type === 'ERROR') {
          worker.removeEventListener('message', handler)
          reject(new Error(msg.message))
        }
      }

      worker.addEventListener('message', handler)
      worker.postMessage({ type: 'GENERATE', prompt } satisfies WorkerInboundMessage)
    })
  }

  private async generateCloud(prompt: string, callbacks: GenerateCallbacks) {
    await streamCloudInference(prompt, {
      onToken: callbacks.onToken,
      onDone: callbacks.onDone,
      onError: callbacks.onError,
    })
  }

  terminate() {
    this.worker?.postMessage({ type: 'TERMINATE' } satisfies WorkerInboundMessage)
    this.worker = null
    this.workerReady = false
    const store = useAiEngineStore()
    store.setEngineState('idle')
    store.setActiveBackend(null)
  }

  getEngineState() {
    return useAiEngineStore().engineState
  }

  getActiveBackend() {
    return useAiEngineStore().activeBackend
  }
}

export const AiGateway = new AiGatewayService()
