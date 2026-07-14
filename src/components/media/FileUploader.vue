<script setup lang="ts">
import { ref } from 'vue'
import type { ExtractedFileResult } from '@/types'
import { FileExtractor } from '@/services/FileExtractor'
import { useToast } from '@/composables/useToast'
import { Upload, File, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    accept?: string
    maxSizeMB?: number
    multiple?: boolean
  }>(),
  {
    accept: '.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.txt,.csv,.json',
    maxSizeMB: 10,
    multiple: false,
  },
)

const emit = defineEmits<{
  'file-processed': [result: ExtractedFileResult]
}>()

interface QueueItem {
  id: string
  fileName: string
  progress: number
  status: 'processing' | 'done' | 'error'
  errorMessage?: string
  result?: ExtractedFileResult
}

const toast = useToast()
const isDragging = ref(false)
const items = ref<QueueItem[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

function tickProgress(item: QueueItem) {
  const interval = setInterval(() => {
    if (item.status !== 'processing') {
      clearInterval(interval)
      return
    }
    // No native progress events from FileExtractor — simulate a determinate
    // climb that never reaches 100% until the real result lands.
    item.progress = Math.min(90, item.progress + Math.random() * 12 + 4)
  }, 150)
}

async function processFiles(files: FileList | File[]) {
  const fileArray = Array.from(files)

  for (const file of fileArray) {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      fileName: file.name,
      progress: 0,
      status: 'processing',
    }
    items.value.unshift(item)

    if (file.size > props.maxSizeMB * 1024 * 1024) {
      item.status = 'error'
      item.errorMessage = `Exceeds ${props.maxSizeMB}MB limit`
      toast.error(`"${file.name}" exceeds ${props.maxSizeMB}MB limit`)
      continue
    }

    tickProgress(item)
    try {
      const result = await FileExtractor.extract(file)
      item.status = 'done'
      item.progress = 100
      item.result = result
      emit('file-processed', result)
    } catch (e) {
      item.status = 'error'
      item.errorMessage = e instanceof Error ? e.message : 'Processing failed'
      toast.error(item.errorMessage)
    }
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) processFiles(files)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) processFiles(input.files)
  input.value = ''
}

function removeItem(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
}

function formatType(type: string) {
  return type.toUpperCase()
}
</script>

<template>
  <div class="card space-y-4">
    <h3 class="font-semibold text-fg">File Uploader</h3>

    <div
      :class="[
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
        isDragging ? 'border-primary bg-primary-soft' : 'border-surface-border-strong hover:border-aurora-primary-500/60',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <Upload class="mb-3 h-8 w-8 text-fg-subtle" />
      <p class="text-sm text-fg-muted">Drag & drop files here</p>
      <p class="mt-1 text-xs text-fg-subtle">PDF, Excel, Images, Text · Max {{ maxSizeMB }}MB</p>
      <button class="btn-secondary mt-4" @click="fileInputRef?.click()">
        Browse Files
      </button>
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <ul v-if="items.length" class="space-y-2">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-lg bg-surface-muted p-3"
      >
        <div class="flex items-start gap-3">
          <img
            v-if="item.result?.preview"
            :src="item.result.preview"
            alt=""
            class="h-12 w-12 rounded object-cover"
          />
          <File v-else class="mt-1 h-5 w-5 shrink-0 text-fg-subtle" />

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-fg">{{ item.fileName }}</p>

            <p v-if="item.status === 'processing'" class="text-xs text-fg-subtle">Processing…</p>
            <p v-else-if="item.status === 'error'" class="text-xs text-status-red">{{ item.errorMessage }}</p>
            <p v-else-if="item.result" class="text-xs text-fg-subtle">
              {{ formatType(item.result.type) }} · {{ item.result.sizeKB }} KB
            </p>

            <p v-if="item.result?.text" class="mt-1 line-clamp-2 text-xs text-fg-muted">
              {{ item.result.text.slice(0, 120) }}{{ item.result.text.length > 120 ? '...' : '' }}
            </p>

            <div v-if="item.status === 'processing'" class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
              <div
                class="h-full rounded-full bg-aurora transition-all duration-150"
                :style="{ width: `${item.progress}%` }"
              />
            </div>
          </div>

          <button
            class="shrink-0 cursor-pointer text-fg-subtle transition-colors hover:text-status-red"
            aria-label="Remove"
            @click="removeItem(item.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
