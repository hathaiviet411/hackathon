/**
 * Backend base URL, injected at build time via `VITE_API_BASE_URL`.
 * Empty by default: requests fall back to same-origin relative paths, which
 * is what the local dev mock API (vite-plugins/mockApi.ts) expects. Set this
 * once a real backend is deployed — no other code changes needed.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
