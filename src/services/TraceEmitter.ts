import { useTraceStore } from '@/stores/trace'
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
  const store = useTraceStore()
  store.addEvent(event)
  store.setConnectionStatus('connected')
}

function truncate(text: string, max = 120) {
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export class InferenceTrace {
  private readonly routerId: string
  private readonly plannerId: string
  private toolId: string | null = null

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
    const tool = createEvent({
      type: 'TOOL_CALL',
      status: 'RUNNING',
      title: backend === 'edge' ? 'webllm.chat.completions' : 'cloud.inference',
      detail: backend === 'edge' ? 'Streaming tokens from local model' : 'Streaming tokens from cloud API',
      parentId: this.plannerId,
      payload: { backend, historyLength },
    })
    this.toolId = tool.id
    push(tool)
  }

  complete(backend: AiBackend, responseLength: number, tokenCount: number) {
    push(
      createEvent({
        type: 'TOOL_CALL',
        status: 'SUCCESS',
        title: backend === 'edge' ? 'webllm.chat.completions' : 'cloud.inference',
        detail: `Generated ${tokenCount} tokens (${responseLength} chars)`,
        parentId: this.plannerId,
        payload: { backend, responseLength, tokenCount },
      }),
    )

    if (this.toolId) {
      push(
        createEvent({
          type: 'PLANNER',
          status: 'SUCCESS',
          title: 'Inference complete',
          parentId: this.routerId,
        }),
      )
    }
  }

  fail(message: string, status: TraceStatus = 'ERROR') {
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
}

export function clearLiveTrace() {
  const store = useTraceStore()
  store.clearEvents()
  store.setConnectionStatus('disconnected')
}
