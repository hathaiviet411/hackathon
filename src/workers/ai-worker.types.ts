export type WorkerMessageType = 'INIT' | 'GENERATE' | 'TERMINATE' | 'RESET_HISTORY'
export type WorkerResponseType = 'READY' | 'TOKEN' | 'DONE' | 'ERROR' | 'PROGRESS' | 'DEBUG'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type WebLlmMessage = {
  role: 'user' | 'assistant'
  content: string
}

export interface WorkerInitMessage {
  type: 'INIT'
  modelId: string
}

export interface WorkerGenerateMessage {
  type: 'GENERATE'
  /** OpenAI-style messages; normalized to user/assistant strings before WebLLM. */
  messages?: Array<LlmMessage | WebLlmMessage>
  /** Legacy fallback for older worker payloads. */
  prompt?: string
  options?: { temperature?: number; maxTokens?: number }
}

export interface WorkerTerminateMessage {
  type: 'TERMINATE'
}

export interface WorkerResetHistoryMessage {
  type: 'RESET_HISTORY'
}

export type WorkerInboundMessage =
  | WorkerInitMessage
  | WorkerGenerateMessage
  | WorkerTerminateMessage
  | WorkerResetHistoryMessage

export interface WorkerReadyResponse {
  type: 'READY'
}

export interface WorkerTokenResponse {
  type: 'TOKEN'
  token: string
}

export interface WorkerDoneResponse {
  type: 'DONE'
}

export interface WorkerErrorResponse {
  type: 'ERROR'
  message: string
}

export interface WorkerProgressResponse {
  type: 'PROGRESS'
  progress: number
  text?: string
}

export interface WorkerDebugResponse {
  type: 'DEBUG'
  stage: string
  payload: unknown
}

export type WorkerOutboundMessage =
  | WorkerReadyResponse
  | WorkerTokenResponse
  | WorkerDoneResponse
  | WorkerErrorResponse
  | WorkerProgressResponse
  | WorkerDebugResponse

export { DEFAULT_MODEL_ID } from '@/config/ai'
