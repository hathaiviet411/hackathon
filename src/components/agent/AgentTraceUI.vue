<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TraceEvent } from '@/types'
import {
  extractCodeSnippet,
  getReactStepMeta,
  getTraceOverallStatus,
  mapLegacyTypeLabel,
  mapStatusLabel,
  mapToReactStage,
} from '@/utils/traceReact'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    traces: TraceEvent[]
    defaultExpanded?: boolean
  }>(),
  {
    defaultExpanded: false,
  },
)

/** Friendly Vietnamese labels — never expose raw tool IDs in collapsed UI */
const TOOL_FRIENDLY_LABELS: Record<string, string> = {
  'webllm.chat.completions': 'Đang tổng hợp câu trả lời...',
  'cloud.inference': 'Đang tổng hợp câu trả lời...',
  sqlite: 'Đang tra cứu dữ liệu hệ thống...',
  database_query: 'Đang tra cứu dữ liệu hệ thống...',
  search_index: 'Đang tra cứu dữ liệu hệ thống...',
  fetch_data: 'Đang tra cứu dữ liệu hệ thống...',
  read_excel: 'Đang đọc và bóc tách tài liệu...',
  file_parser: 'Đang đọc và bóc tách tài liệu...',
}

const GENERIC_ACTION_LABEL = 'Đang xử lý tác vụ...'
const GENERIC_SUCCESS_LABEL = 'Hoàn tất xử lý yêu cầu'
const GENERIC_IDLE_LABEL = 'Sẵn sàng xử lý yêu cầu'

const expanded = ref(props.defaultExpanded)

function normalizeToolKey(name: string): string {
  return name.toLowerCase().trim().replace(/[\s.-]+/g, '_').replace(/_+/g, '_')
}

function resolveRawToolName(event: TraceEvent): string {
  const payload = event.payload
  if (payload) {
    const tool = payload.tool ?? payload.toolName ?? payload.name
    if (typeof tool === 'string' && tool.trim()) return tool
  }
  return event.title
}

function translateToolName(raw: string): string {
  const normalized = normalizeToolKey(raw)

  if (TOOL_FRIENDLY_LABELS[normalized]) {
    return TOOL_FRIENDLY_LABELS[normalized]
  }

  for (const [key, label] of Object.entries(TOOL_FRIENDLY_LABELS)) {
    const normKey = normalizeToolKey(key)
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      return label
    }
  }

  return GENERIC_ACTION_LABEL
}

function getFriendlyLabel(event: TraceEvent): string {
  const stage = mapToReactStage(event)

  switch (stage) {
    case 'THOUGHT':
      return 'Đang phân tích yêu cầu...'
    case 'ACTION':
      return translateToolName(resolveRawToolName(event))
    case 'OBSERVATION':
      return 'Đã thu thập dữ liệu thành công.'
    case 'ROUTER':
      return 'Đang định tuyến yêu cầu...'
    case 'ESCALATION':
      return 'Cần xác nhận từ người dùng.'
    case 'ERROR':
      return event.detail ?? 'Đã xảy ra lỗi trong quá trình xử lý.'
    default:
      return GENERIC_ACTION_LABEL
  }
}

const overallStatus = computed(() => getTraceOverallStatus(props.traces))

const summaryText = computed(() => {
  if (!props.traces.length) return GENERIC_IDLE_LABEL

  const overall = overallStatus.value
  if (overall === 'success') return GENERIC_SUCCESS_LABEL
  if (overall === 'error') {
    const err = [...props.traces]
      .reverse()
      .find((e) => e.status === 'ERROR' || e.type === 'HUMAN_ESCALATION')
    return err ? getFriendlyLabel(err) : 'Cần hỗ trợ thêm'
  }

  const active =
    [...props.traces].reverse().find((e) => e.status === 'RUNNING') ??
    props.traces[props.traces.length - 1]

  return getFriendlyLabel(active)
})

const steps = computed(() =>
  props.traces.map((event) => ({
    event,
    meta: getReactStepMeta(event),
    friendlyLabel: getFriendlyLabel(event),
    code: extractCodeSnippet(event),
    rawTool: resolveRawToolName(event),
  })),
)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function toggleDetails() {
  expanded.value = !expanded.value
}
</script>

<template>
  <!-- `dark` scopes dark: variants — app shell is navy without class="dark" on <html> -->
  <div class="agent-trace-ui dark">
    <!-- Collapsed: minimalist pill (non-tech friendly) -->
    <div
      :class="[
        'flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 shadow-sm',
        'border-slate-700 bg-slate-800 dark:border-slate-700 dark:bg-slate-800',
        overallStatus === 'running' && 'trace-pill--active',
      ]"
    >
      <div class="flex min-w-0 flex-1 items-center gap-2.5">
        <Loader2
          v-if="overallStatus === 'running'"
          class="h-4 w-4 shrink-0 animate-spin text-blue-400"
        />
        <CheckCircle2
          v-else-if="overallStatus === 'success'"
          class="h-4 w-4 shrink-0 text-emerald-400"
        />
        <AlertCircle
          v-else-if="overallStatus === 'error'"
          class="h-4 w-4 shrink-0 text-red-400"
        />
        <span
          v-else
          class="h-2 w-2 shrink-0 rounded-full bg-slate-500"
        />

        <p
          :class="[
            'text-sm text-gray-200 dark:text-gray-200',
            overallStatus === 'running' && 'trace-pulse-text',
          ]"
        >
          {{ summaryText }}
        </p>
      </div>

      <button
        v-if="traces.length"
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-400 transition-all duration-300 hover:bg-slate-700/60 hover:text-gray-200 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-gray-200"
        :aria-expanded="expanded"
        @click="toggleDetails"
      >
        {{ expanded ? 'Ẩn chi tiết' : 'Xem chi tiết' }}
        <ChevronUp v-if="expanded" class="h-3.5 w-3.5" />
        <ChevronDown v-else class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Expanded: ReAct stepper for technical judges -->
    <Transition name="trace-expand">
      <div
        v-if="expanded && traces.length"
        class="mt-3 rounded-lg border border-slate-700 bg-[#0f172a] p-4 shadow-sm dark:border-slate-700 dark:bg-[#0f172a]"
      >
        <p class="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-400">
          ReAct Loop · {{ traces.length }} bước
        </p>

        <ol class="relative space-y-0 border-l border-slate-700 pl-5 dark:border-slate-700">
          <li
            v-for="{ event, meta, friendlyLabel, code, rawTool } in steps"
            :key="event.id"
            class="relative pb-6 last:pb-0"
          >
            <!-- Connector segment -->
            <span
              class="absolute -left-px top-4 bottom-0 w-px bg-slate-700 last:hidden dark:bg-slate-700"
              aria-hidden="true"
            />

            <!-- Timeline dot -->
            <span
              :class="[
                'absolute -left-[1.35rem] top-1.5 z-10 h-2.5 w-2.5 rounded-full ring-4 ring-[#0f172a] dark:ring-[#0f172a]',
                meta.dotClass,
                event.status === 'RUNNING' && 'animate-pulse shadow-[0_0_8px_currentColor]',
              ]"
            />

            <div
              :class="[
                'rounded-lg border bg-slate-900 p-3 transition-all duration-300 ease-in-out',
                'dark:bg-slate-900',
                meta.borderClass,
                event.status === 'RUNNING' && 'shadow-[0_0_12px_rgba(59,130,246,0.15)]',
              ]"
            >
              <!-- Technical header (judges only — expanded view) -->
              <div class="flex flex-wrap items-center gap-2">
                <span
                  :class="[
                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide',
                    meta.badgeClass,
                  ]"
                >
                  {{ meta.techLabel }}
                </span>
                <span class="font-mono text-[10px] text-gray-500 dark:text-gray-500">
                  {{ mapLegacyTypeLabel(event.type) }} · {{ mapStatusLabel(event.status) }}
                </span>
                <span
                  v-if="meta.stage === 'ACTION' || meta.stage === 'OBSERVATION'"
                  class="truncate font-mono text-[10px] text-slate-500"
                  :title="rawTool"
                >
                  {{ rawTool }}
                </span>
                <span class="ml-auto shrink-0 font-mono text-[10px] text-gray-500 dark:text-gray-500">
                  {{ formatTime(event.timestamp) }}
                </span>
              </div>

              <!-- Human-readable (Vietnamese, no jargon) -->
              <p class="mt-2 text-sm font-medium text-gray-200 dark:text-gray-200">
                {{ friendlyLabel }}
              </p>

              <!-- Technical detail -->
              <p
                v-if="event.detail"
                class="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-400"
              >
                {{ event.detail }}
              </p>

              <!-- SQL / code block -->
              <pre
                v-if="code"
                class="mt-2 overflow-x-auto rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              ><code>{{ code }}</code></pre>

              <!-- Payload (technical, collapsed by default) -->
              <details
                v-if="event.payload && !code"
                class="mt-2 group"
              >
                <summary
                  class="cursor-pointer text-xs text-gray-500 transition-colors duration-300 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  Payload kỹ thuật
                </summary>
                <pre
                  class="mt-2 max-h-36 overflow-auto rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-400"
                >{{ JSON.stringify(event.payload, null, 2) }}</pre>
              </details>
            </div>
          </li>
        </ol>
      </div>
    </Transition>

    <!-- Empty state -->
    <p
      v-if="!traces.length"
      class="mt-2 text-center text-sm text-gray-400 dark:text-gray-400"
    >
      Chưa có hoạt động từ agent
    </p>
  </div>
</template>

<style scoped>
.trace-pill--active {
  @apply border-blue-500/40 bg-slate-800;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.12), 0 0 20px rgba(59, 130, 246, 0.08);
}

.trace-pulse-text {
  animation: trace-text-pulse 2s ease-in-out infinite;
}

@keyframes trace-text-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

.trace-expand-enter-active,
.trace-expand-leave-active {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

.trace-expand-enter-from,
.trace-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}

.trace-expand-enter-to,
.trace-expand-leave-from {
  opacity: 1;
  max-height: 1200px;
  transform: translateY(0);
}
</style>
