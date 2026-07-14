# VAIC 2026 PWA Foundation Template

A foundational Progressive Web App template for the VAIC 2026 hackathon. Contains **no domain-specific business logic** — only reusable UI components, services, and utilities.

## Tech Stack

- **Vue 3** + **TypeScript** + **Vite 4**
- **Pinia** (state) · **Vue Router** (routing)
- **Tailwind CSS 3** + **Radix Vue** (accessible primitives)
- **vite-plugin-pwa** (installable PWA via manual service worker)
- **@mlc-ai/web-llm** (on-edge AI, lazy-loaded in Web Worker)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Modules

### 1. Core PWA & Dynamic UI
- `DashboardLayout` — responsive sidebar + main content
- `DynamicForm` — JSON schema-driven form renderer
- `DataTable` — generic sortable/paginated table

### 2. Agent Trace & Chat
- `AgentTraceStream` — SSE-powered vertical timeline (Router, Planner, Tool calls, Escalation)
- `ChatAssistant` — markdown rendering + streaming text

### 3. PrimeraLabs Team
- `ai-worker.ts` — WebLLM in Web Worker (lazy load)
- `AiGateway` — routes to Edge or mock Cloud API based on `navigator.onLine` + WebGPU
- `StatusBadge` — shows current engine state
- Default model: `Llama-3.2-1B-Instruct-q4f16_1-MLC`

### 4. File & Media Utilities
- `CameraCapture` — permission, capture, crop, compress (client-side)
- `FileUploader` — PDF, Excel, images, text with lazy parsers
- `FileExtractor` — basic text extraction (no layout/OCR analysis)

## Mock APIs (Vite Dev Middleware)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mock-trace` | GET (SSE) | Streams agent trace events |
| `/api/mock-inference` | POST (SSE) | Mock cloud inference tokens |

## Project Structure

```
src/
├── components/   # UI components by module
├── composables/  # Reusable Vue composables
├── services/     # Framework-agnostic logic
├── workers/      # Web Workers (AI)
├── stores/       # Pinia stores
├── schemas/      # JSON form schemas
├── mocks/        # Sample data
└── views/        # ShowcaseView (single page)
```

## Extending

1. **Add form fields** — extend `formSchema.example.json` with new `type` values; add renderer in `FieldRenderer.vue`
2. **Replace mock APIs** — swap `mockCloudApi.ts` and Vite middleware with your backend
3. **Add domain logic** — create new views/stores; keep this template layer generic

## Build

```bash
npm run build
npm run preview
```

## PWA Install

The app is installable when served over HTTPS (or localhost). Use the "Install" button in the header when the browser fires `beforeinstallprompt`.
