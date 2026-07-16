import { createPinia } from 'pinia'

/** Shared Pinia instance — required for stores used outside Vue setup (workers, services). */
export const pinia = createPinia()
