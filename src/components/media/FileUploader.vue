<script setup lang="ts">
import { ref } from 'vue'
import type { ExtractedFileResult } from '@/types'
import { FileExtractor } from '@/services/FileExtractor'
import { Upload, File, X, Loader2 } from 'lucide-vue-next'

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

const isDragging = ref(false)
const processing = ref(false)
const error = ref<string | null>(null)
const processedFiles = ref<ExtractedFileResult[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

async function processFiles(files: FileList | File[]) {
  error.value = null
  const fileArray = Array.from(files)

  for (const file of fileArray) {
    if (file.size > props.maxSizeMB * 1024 * 1024) {
      error.value = `"${file.name}" exceeds ${props.maxSizeMB}MB limit`
      continue
    }

    processing.value = true
    try {
      const result = await FileExtractor.extract(file)
      processedFiles.value.push(result)
      emit('file-processed', result)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Processing failed'
    } finally {
      processing.value = false
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

function removeFile(index: number) {
  processedFiles.value.splice(index, 1)
}

function formatType(type: string) {
  return type.toUpperCase()
}
</script>

<template>
  <div class="card space-y-4">
    <h3 class="font-semibold text-slate-100">File Uploader</h3>

    <div
      :class="[
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition',
        isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <Upload class="mb-3 h-8 w-8 text-slate-500" />
      <p class="text-sm text-slate-300">Drag & drop files here</p>
      <p class="mt-1 text-xs text-slate-500">PDF, Excel, Images, Text · Max {{ maxSizeMB }}MB</p>
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
      <Loader2 v-if="processing" class="absolute right-4 top-4 h-5 w-5 animate-spin text-blue-400" />
    </div>

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

    <ul v-if="processedFiles.length" class="space-y-2">
      <li
        v-for="(file, idx) in processedFiles"
        :key="idx"
        class="flex items-start gap-3 rounded-lg bg-slate-800/60 p-3"
      >
        <img
          v-if="file.preview"
          :src="file.preview"
          alt=""
          class="h-12 w-12 rounded object-cover"
        />
        <File v-else class="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-200">{{ file.fileName }}</p>
          <p class="text-xs text-slate-500">
            {{ formatType(file.type) }} · {{ file.sizeKB }} KB
          </p>
          <p v-if="file.text" class="mt-1 line-clamp-2 text-xs text-slate-400">
            {{ file.text.slice(0, 120) }}{{ file.text.length > 120 ? '...' : '' }}
          </p>
        </div>
        <button class="shrink-0 text-slate-500 hover:text-red-400" @click="removeFile(idx)">
          <X class="h-4 w-4" />
        </button>
      </li>
    </ul>
  </div>
</template>
