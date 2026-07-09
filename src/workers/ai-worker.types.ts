export type WorkerMessageType = 'INIT' | 'GENERATE' | 'TERMINATE'
export type WorkerResponseType = 'READY' | 'TOKEN' | 'DONE' | 'ERROR' | 'PROGRESS'

export interface WorkerInitMessage {
  type: 'INIT'
  modelId: string
}

export interface WorkerGenerateMessage {
  type: 'GENERATE'
  prompt: string
  options?: { temperature?: number; maxTokens?: number }
}

export interface WorkerTerminateMessage {
  type: 'TERMINATE'
}

export type WorkerInboundMessage = WorkerInitMessage | WorkerGenerateMessage | WorkerTerminateMessage

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

export type WorkerOutboundMessage =
  | WorkerReadyResponse
  | WorkerTokenResponse
  | WorkerDoneResponse
  | WorkerErrorResponse
  | WorkerProgressResponse

export const DEFAULT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
