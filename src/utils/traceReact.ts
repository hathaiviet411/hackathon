import type { TraceEvent, TraceEventType, TraceStatus } from '@/types'

export type ReactStage = 'THOUGHT' | 'ACTION' | 'OBSERVATION' | 'ROUTER' | 'ESCALATION' | 'ERROR'

export interface ReactStepMeta {
  stage: ReactStage
  humanLabel: string
  techLabel: string
  dotClass: string
  borderClass: string
  badgeClass: string
}

const STAGE_BADGE: Record<ReactStage, string> = {
  THOUGHT: 'THOUGHT',
  ACTION: 'ACTION',
  OBSERVATION: 'OBSERVATION',
  ROUTER: 'ROUTER',
  ESCALATION: 'ESCALATION',
  ERROR: 'ERROR',
}

export function mapToReactStage(event: TraceEvent): ReactStage {
  if (event.type === 'HUMAN_ESCALATION') return 'ESCALATION'
  if (event.status === 'ERROR') return 'ERROR'
  if (event.type === 'ROUTER') return 'ROUTER'
  if (event.type === 'PLANNER') return 'THOUGHT'
  if (event.type === 'TOOL_CALL') {
    return event.status === 'RUNNING' ? 'ACTION' : 'OBSERVATION'
  }
  return 'THOUGHT'
}

function getToolName(event: TraceEvent): string {
  const payload = event.payload
  if (!payload) return event.title
  const tool = payload.tool ?? payload.toolName ?? payload.name
  return typeof tool === 'string' ? tool : event.title
}

export function getHumanLabel(event: TraceEvent): string {
  const stage = mapToReactStage(event)
  const toolName = getToolName(event)

  switch (stage) {
    case 'THOUGHT':
      return 'Đang phân tích yêu cầu...'
    case 'ACTION':
      return `Đang sử dụng công cụ: ${toolName}...`
    case 'OBSERVATION':
      return 'Đã thu thập dữ liệu thành công.'
    case 'ROUTER':
      return 'Đang định tuyến yêu cầu...'
    case 'ESCALATION':
      return 'Cần xác nhận từ người dùng.'
    case 'ERROR':
      return event.detail ?? 'Đã xảy ra lỗi trong quá trình xử lý.'
    default:
      return event.title
  }
}

export function getReactStepMeta(event: TraceEvent): ReactStepMeta {
  const stage = mapToReactStage(event)

  const styles: Record<ReactStage, Pick<ReactStepMeta, 'dotClass' | 'borderClass' | 'badgeClass'>> = {
    THOUGHT: {
      dotClass: 'bg-gray-400 ring-gray-400/30',
      borderClass: 'border-gray-400/40',
      badgeClass: 'bg-gray-500/15 text-gray-400 dark:text-gray-400',
    },
    ROUTER: {
      dotClass: 'bg-gray-400 ring-gray-400/30',
      borderClass: 'border-gray-400/40',
      badgeClass: 'bg-gray-500/15 text-gray-400 dark:text-gray-400',
    },
    ACTION: {
      dotClass: 'bg-blue-500 ring-blue-500/30',
      borderClass: 'border-blue-500/40',
      badgeClass: 'bg-blue-500/15 text-blue-400',
    },
    OBSERVATION: {
      dotClass: 'bg-green-500 ring-green-500/30',
      borderClass: 'border-green-500/40',
      badgeClass: 'bg-green-500/15 text-green-400',
    },
    ESCALATION: {
      dotClass: 'bg-red-500 ring-red-500/30',
      borderClass: 'border-red-500/40',
      badgeClass: 'bg-red-500/15 text-red-400',
    },
    ERROR: {
      dotClass: 'bg-red-500 ring-red-500/30',
      borderClass: 'border-red-500/40',
      badgeClass: 'bg-red-500/15 text-red-400',
    },
  }

  return {
    stage,
    humanLabel: getHumanLabel(event),
    techLabel: STAGE_BADGE[stage],
    ...styles[stage],
  }
}

export function extractCodeSnippet(event: TraceEvent): string | null {
  const payload = event.payload
  if (!payload) return null

  const sql = payload.sql ?? payload.query
  if (typeof sql === 'string' && sql.trim()) return sql

  const code = payload.code
  if (typeof code === 'string' && code.trim()) return code

  return null
}

export function getTraceOverallStatus(traces: TraceEvent[]): 'idle' | 'running' | 'success' | 'error' {
  if (!traces.length) return 'idle'
  if (traces.some((e) => e.status === 'ERROR' || e.type === 'HUMAN_ESCALATION')) return 'error'
  if (traces.some((e) => e.status === 'RUNNING')) return 'running'
  if (traces.every((e) => e.status === 'SUCCESS')) return 'success'
  return 'running'
}

export function getCollapsedSummary(traces: TraceEvent[]): string {
  if (!traces.length) return 'Sẵn sàng xử lý yêu cầu'

  const overall = getTraceOverallStatus(traces)
  if (overall === 'success') return 'Hoàn tất xử lý yêu cầu'
  if (overall === 'error') {
    const err = [...traces].reverse().find((e) => e.status === 'ERROR' || e.type === 'HUMAN_ESCALATION')
    return err ? getHumanLabel(err) : 'Cần hỗ trợ thêm'
  }

  const active = [...traces].reverse().find((e) => e.status === 'RUNNING') ?? traces[traces.length - 1]
  return getHumanLabel(active)
}

export function mapLegacyTypeLabel(type: TraceEventType): string {
  const map: Record<TraceEventType, string> = {
    ROUTER: 'Router',
    PLANNER: 'Planner',
    TOOL_CALL: 'Tool Call',
    HUMAN_ESCALATION: 'Human Escalation',
  }
  return map[type]
}

export function mapStatusLabel(status: TraceStatus): string {
  const map: Record<TraceStatus, string> = {
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
    PENDING: 'PENDING',
  }
  return map[status]
}
