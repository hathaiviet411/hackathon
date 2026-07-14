export type FieldType = 'text' | 'select' | 'checkbox' | 'date' | 'textarea' | 'number'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
}

export interface FormField {
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: SelectOption[]
  validation?: FieldValidation
}

export interface FormSchema {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

export type TraceEventType = 'ROUTER' | 'PLANNER' | 'TOOL_CALL' | 'HUMAN_ESCALATION'
export type TraceStatus = 'RUNNING' | 'SUCCESS' | 'ERROR' | 'PENDING'

export interface TraceEvent {
  id: string
  type: TraceEventType
  status: TraceStatus
  title: string
  detail?: string
  payload?: Record<string, unknown>
  timestamp: number
  parentId?: string
}

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export type AiBackend = 'edge' | 'cloud'
export type AiEngineState = 'idle' | 'loading' | 'ready' | 'inferring' | 'error'
export type AiRoutingMode = 'auto' | 'local' | 'cloud'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ExtractedFileType = 'image' | 'pdf' | 'excel' | 'text' | 'unknown'

export interface ExtractedFileResult {
  type: ExtractedFileType
  text: string | null
  structured: Record<string, unknown> | null
  preview: string | null
  fileName: string
  sizeKB: number
}

export interface CapturedImage {
  blob: Blob
  base64: string
  width: number
  height: number
  sizeKB: number
}

export type ChartType = 'bar' | 'line' | 'donut' | 'area'

export interface ChartSeries {
  name: string
  data: number[]
  color?: string
}

export interface ChartConfig {
  id: string
  type: ChartType
  title: string
  labels: string[]
  series: ChartSeries[]
}

export interface StatCardConfig {
  id: string
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
}

export interface DashboardSchema {
  title: string
  stats: StatCardConfig[]
  charts: ChartConfig[]
  table: {
    columns: TableColumn[]
    rows: Record<string, unknown>[]
  }
}

export interface AuthUser {
  id: string
  name: string
  email: string
}
