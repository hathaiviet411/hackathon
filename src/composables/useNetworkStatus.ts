import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)

  function handleOnline() {
    isOnline.value = true
  }

  function handleOffline() {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline }
}

export async function checkWebGpuSupport(): Promise<boolean> {
  if (!('gpu' in navigator)) return false
  try {
    const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function getDeviceMemoryGB(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return nav.deviceMemory ?? null
}
