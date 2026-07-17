const LOG_PREFIX = '[Guard]'

/** Synchronous turn lock — must acquire before any `await` to prevent double-trigger races. */
export function createTurnLock(label: string) {
  let locked = false

  return {
    get isLocked() {
      return locked
    },

    tryAcquire(): boolean {
      if (locked) {
        if (import.meta.env.DEV) {
          console.warn(`${LOG_PREFIX} ${label}: chặn yêu cầu trùng lặp`)
        }
        return false
      }
      locked = true
      return true
    },

    release() {
      locked = false
    },
  }
}

/** Ignore duplicate submits within a short window (Enter + form edge cases). */
export function createSubmitDebounce(ms = 400) {
  let lastAt = 0

  return {
    shouldBlock(): boolean {
      const now = Date.now()
      if (now - lastAt < ms) {
        if (import.meta.env.DEV) {
          console.warn(`${LOG_PREFIX} submit debounce: chặn gửi quá nhanh (${now - lastAt}ms)`)
        }
        return true
      }
      lastAt = now
      return false
    },
  }
}
