<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TableColumn } from '@/types'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: Record<string, unknown>[]
    pageSize?: number
  }>(),
  { pageSize: 10 },
)

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
    <!-- Desktop table -->
    <div class="hidden overflow-x-auto rounded-xl border border-slate-700/60 md:block">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-800/80 text-slate-400">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 font-medium"
            >
              <button
                v-if="col.sortable"
                class="inline-flex items-center gap-1 hover:text-slate-200"
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
            class="border-t border-slate-700/40 hover:bg-slate-800/40"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-slate-300">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ formatCell(row[col.key]) }}
              </slot>
            </td>
          </tr>
          <tr v-if="!paginatedRows.length">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-slate-500">
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
          <span class="text-slate-500">{{ col.label }}</span>
          <span class="text-right text-slate-200">{{ formatCell(row[col.key]) }}</span>
        </div>
      </div>
      <p v-if="!paginatedRows.length" class="py-8 text-center text-slate-500">No data available</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between text-sm text-slate-400">
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
