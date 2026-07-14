<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TableColumn } from '@/types'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download } from 'lucide-vue-next'
import { exportToXlsx, exportToCsv } from '@/utils/exportData'
import { useToast } from '@/composables/useToast'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: Record<string, unknown>[]
    pageSize?: number
    filename?: string
    exportable?: boolean
  }>(),
  { pageSize: 10, filename: 'export', exportable: true },
)

const toast = useToast()

function handleExport(format: 'xlsx' | 'csv') {
  if (!props.rows.length) return
  if (format === 'xlsx') {
    exportToXlsx(props.columns, sortedRows.value, props.filename)
  } else {
    exportToCsv(props.columns, sortedRows.value, props.filename)
  }
  toast.success(`Exported ${props.rows.length} rows to ${props.filename}.${format}`)
}

const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return sortedRows.value.slice(start, start + props.pageSize)
})

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="exportable && rows.length" class="flex justify-end gap-2">
      <button
        type="button"
        class="btn-ghost cursor-pointer gap-1.5 px-2.5 py-1.5 text-xs"
        title="Export as spreadsheet"
        @click="handleExport('xlsx')"
      >
        <Download class="h-3.5 w-3.5" />
        XLSX
      </button>
      <button
        type="button"
        class="btn-ghost cursor-pointer gap-1.5 px-2.5 py-1.5 text-xs"
        title="Export as CSV"
        @click="handleExport('csv')"
      >
        <Download class="h-3.5 w-3.5" />
        CSV
      </button>
    </div>

    <!-- Desktop table -->
    <div class="hidden overflow-x-auto rounded-xl border border-surface-border md:block">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-muted text-fg-muted">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 font-medium"
            >
              <button
                v-if="col.sortable"
                class="inline-flex cursor-pointer items-center gap-1 hover:text-fg"
                @click="toggleSort(col.key)"
              >
                {{ col.label }}
                <ChevronUp v-if="sortKey === col.key && sortDir === 'asc'" class="h-3.5 w-3.5" />
                <ChevronDown v-else-if="sortKey === col.key && sortDir === 'desc'" class="h-3.5 w-3.5" />
                <ChevronsUpDown v-else class="h-3.5 w-3.5 opacity-40" />
              </button>
              <span v-else>{{ col.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in paginatedRows"
            :key="idx"
            class="border-t border-surface-border transition-colors hover:bg-surface-muted"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-fg-muted">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ formatCell(row[col.key]) }}
              </slot>
            </td>
          </tr>
          <tr v-if="!paginatedRows.length">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-fg-subtle">
              No data available
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="space-y-3 md:hidden">
      <div
        v-for="(row, idx) in paginatedRows"
        :key="idx"
        class="card space-y-2"
      >
        <div v-for="col in columns" :key="col.key" class="flex justify-between gap-2 text-sm">
          <span class="text-fg-subtle">{{ col.label }}</span>
          <span class="text-right text-fg">{{ formatCell(row[col.key]) }}</span>
        </div>
      </div>
      <p v-if="!paginatedRows.length" class="py-8 text-center text-fg-subtle">No data available</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between text-sm text-fg-muted">
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <div class="flex gap-2">
        <button
          class="btn-secondary px-3 py-1"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          Prev
        </button>
        <button
          class="btn-secondary px-3 py-1"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
