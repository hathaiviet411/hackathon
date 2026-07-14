import { apiUrl } from '@/config/env'

type StreamCallbacks = {
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

export async function streamCloudInference(prompt: string, callbacks: StreamCallbacks = {}) {
  const response = await fetch(apiUrl('/api/mock-inference'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    throw new Error(`Cloud API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6)) as { type: string; token?: string }
        if (data.type === 'token' && data.token) callbacks.onToken?.(data.token)
        if (data.type === 'done') callbacks.onDone?.()
      } catch {
        // skip malformed
      }
    }
  }
}
