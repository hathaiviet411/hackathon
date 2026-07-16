import { useTraceStore } from '@/stores/trace'
import { pinia } from '@/stores/pinia'
import type { AiBackend, AiRoutingMode, TraceEvent, TraceStatus } from '@/types'

function createEvent(
  partial: Omit<TraceEvent, 'id' | 'timestamp'>,
): TraceEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...partial,
  }
}

function push(event: TraceEvent) {
  const store = useTraceStore(pinia)
  store.addEvent(event)
  store.setConnectionStatus('connected')
}

function updateEvent(id: string, patch: Partial<Omit<TraceEvent, 'id'>>) {
  const store = useTraceStore(pinia)
  return store.updateEvent(id, patch)
}

function truncate(text: string, max = 120) {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export class InferenceTrace {
  private readonly routerId: string
  private readonly plannerId: string
  private toolId: string | null = null
  private runningToolTitle: string | null = null
  private finalized = false

  constructor(backend: AiBackend, mode: AiRoutingMode, prompt: string, modelId: string) {
    const router = createEvent({
      type: 'ROUTER',
      status: 'SUCCESS',
      title: `Routed to ${backend === 'edge' ? 'Edge (WebLLM)' : 'Cloud'}`,
      detail: `mode=${mode}`,
      payload: { backend, mode, modelId },
    })
    this.routerId = router.id
    push(router)

    const planner = createEvent({
      type: 'PLANNER',
      status: 'SUCCESS',
      title: 'Prepare conversation context',
      detail: truncate(prompt),
      parentId: this.routerId,
      payload: { promptLength: prompt.length },
    })
    this.plannerId = planner.id
    push(planner)
  }

  startInference(backend: AiBackend, historyLength: number) {
    const title = backend === 'edge' ? 'webllm.chat.completions' : 'cloud.inference'
    const tool = createEvent({
      type: 'TOOL_CALL',
      status: 'RUNNING',
      title,
      detail: backend === 'edge' ? 'Streaming tokens from local model' : 'Streaming tokens from cloud API',
      parentId: this.plannerId,
      payload: { backend, historyLength },
    })
    this.toolId = tool.id
    this.runningToolTitle = title
    push(tool)
  }

  complete(backend: AiBackend, responseLength: number, tokenCount: number) {
    if (this.finalized) return
    this.finalized = true

    if (this.toolId) {
      updateEvent(this.toolId, {
        status: 'SUCCESS',
        title: this.runningToolTitle ?? (backend === 'edge' ? 'webllm.chat.completions' : 'cloud.inference'),
        detail: `Generated ${tokenCount} tokens (${responseLength} chars)`,
        payload: { backend, responseLength, tokenCount },
      })
    }

    push(
      createEvent({
        type: 'PLANNER',
        status: 'SUCCESS',
        title: 'Inference complete',
        parentId: this.routerId,
      }),
    )
  }

  fail(message: string, status: TraceStatus = 'ERROR') {
    if (this.finalized) return
    this.finalized = true

    if (this.toolId) {
      updateEvent(this.toolId, {
        status,
        title: 'Inference failed',
        detail: message,
        payload: { error: message },
      })
      return
    }

    push(
      createEvent({
        type: 'TOOL_CALL',
        status,
        title: 'Inference failed',
        detail: message,
        parentId: this.plannerId,
        payload: { error: message },
      }),
    )
  }

  /**
   * Safety net — ensures no RUNNING step survives after stream/worker/SSE ends.
   * Called from AiGateway `finally` when complete/fail did not run.
   */
  abort(message = 'Inference stopped') {
    if (this.finalized) return
    this.finalized = true

    if (this.toolId) {
      updateEvent(this.toolId, {
        status: 'ERROR',
        title: 'Inference interrupted',
        detail: message,
        payload: { error: message },
      })
    }

    const store = useTraceStore(pinia)
    store.finalizeRunningSteps('ERROR', message)
  }
}

export function clearLiveTrace() {
  const store = useTraceStore(pinia)
  store.clearEvents()
  store.setConnectionStatus('disconnected')
}

export function finalizeLiveTrace(
  status: Extract<TraceStatus, 'SUCCESS' | 'ERROR'> = 'SUCCESS',
  detail?: string,
) {
  const store = useTraceStore(pinia)
  store.finalizeRunningSteps(status, detail)
}
