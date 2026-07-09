import { ref, watch } from 'vue'

export function useStreamingText(speedMs = 16) {
  const displayed = ref('')
  const isStreaming = ref(false)
  let target = ''
  let index = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function startStream(text: string) {
    stopStream()
    target = text
    index = 0
    displayed.value = ''
    isStreaming.value = true

    timer = setInterval(() => {
      if (index < target.length) {
        const chunk = Math.min(3, target.length - index)
        displayed.value += target.slice(index, index + chunk)
        index += chunk
      } else {
        stopStream()
      }
    }, speedMs)
  }

  function appendToken(token: string) {
    if (!isStreaming.value) {
      isStreaming.value = true
    }
    displayed.value += token
    target = displayed.value
    index = displayed.value.length
  }

  function stopStream() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isStreaming.value = false
  }

  function reset() {
    stopStream()
    displayed.value = ''
    target = ''
    index = 0
  }

  watch(displayed, () => {
    if (!isStreaming.value && displayed.value !== target && target) {
      displayed.value = target
    }
  })

  return { displayed, isStreaming, startStream, appendToken, stopStream, reset }
}
