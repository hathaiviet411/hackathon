export const LOCAL_MODELS = [
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B',
    hint: 'Vi/EN, math',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    hint: 'Lightweight',
  },
] as const

export type LocalModelId = (typeof LOCAL_MODELS)[number]['id']

export const DEFAULT_MODEL_ID: LocalModelId = LOCAL_MODELS[0].id

export function getModelOption(modelId: string) {
  return LOCAL_MODELS.find((m) => m.id === modelId)
}

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant running locally in the browser via WebLLM.
Answer clearly and concisely. Use the same language as the user when possible.
For math or probability questions, show brief reasoning steps before the final answer.`

/** Max user+assistant pairs kept per session (excluding system). */
export const MAX_HISTORY_TURNS = 6

export const DEFAULT_INFERENCE_OPTIONS = {
  temperature: 0.7,
  maxTokens: 512,
} as const
