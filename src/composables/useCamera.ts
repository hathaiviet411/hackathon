import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const stream = ref<MediaStream | null>(null)
  const error = ref<string | null>(null)
  const isActive = ref(false)

  async function start(facingMode: 'user' | 'environment' = 'environment') {
    error.value = null
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      stream.value = mediaStream
      isActive.value = true
      return mediaStream
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Camera permission denied'
      isActive.value = false
      throw e
    }
  }

  function stop() {
    stream.value?.getTracks().forEach((track) => track.stop())
    stream.value = null
    isActive.value = false
  }

  function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')
    ctx.drawImage(video, 0, 0)
    return canvas
  }

  onUnmounted(stop)

  return { stream, error, isActive, start, stop, captureFrame }
}
