<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExtractedFileResult } from '@/types'
import { FileExtractor } from '@/services/FileExtractor'
import type { ExtractProgress } from '@/utils/extractProgress'
import { Upload, File, X, AlertCircle, Database } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    accept?: string
    maxSizeMB?: number
    multiple?: boolean
    maxFiles?: number
  }>(),
  {
    accept: '.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.txt,.csv,.json',
    maxSizeMB: 10,
    multiple: false,
    maxFiles: 5,
  },
)

const emit = defineEmits<{
  'file-processed': [result: ExtractedFileResult]
}>()

const isDragging = ref(false)
const processing = ref(false)
const progress = ref<ExtractProgress | null>(null)
const toast = ref<{ type: 'error' | 'success'; message: string } | null>(null)
const processedFiles = ref<ExtractedFileResult[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const acceptedList = computed(() =>
  props.accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
)

function showToast(type: 'error' | 'success', message: string) {
  toast.value = { type, message }
  window.setTimeout(() => {
    if (toast.value?.message === message) toast.value = null
  }, 4500)
}

function validateFile(file: File): string | null {
  if (!FileExtractor.isAcceptedFile(file)) {
    return `"${file.name}" — định dạng không được hỗ trợ`
  }
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    return `"${file.name}" vượt quá ${props.maxSizeMB}MB`
  }
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : ''
  if (acceptedList.value.length && ext && !acceptedList.value.includes(ext) && !file.type.startsWith('image/')) {
    return `"${file.name}" — extension không hợp lệ`
  }
  return null
}

async function processFiles(files: FileList | File[]) {
  let fileArray = Array.from(files)

  if (!props.multiple && fileArray.length > 1) {
    fileArray = fileArray.slice(0, 1)
    showToast('error', 'Chỉ được upload 1 file mỗi lần')
  }

  if (props.multiple && processedFiles.value.length + fileArray.length > props.maxFiles) {
    showToast('error', `Tối đa ${props.maxFiles} file`)
    fileArray = fileArray.slice(0, props.maxFiles - processedFiles.value.length)
  }

  for (const file of fileArray) {
    const validationError = validateFile(file)
    if (validationError) {
      showToast('error', validationError)
      continue
    }

    processing.value = true
    progress.value = { stage: 'reading', percent: 10, label: 'Đang đọc file...' }

    try {
      const result = await FileExtractor.extract(file, (p) => {
        progress.value = p
      })
      processedFiles.value.push(result)
      emit('file-processed', result)
      showToast('success', `Đã xử lý ${file.name}`)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Xử lý file thất bại')
    } finally {
      processing.value = false
      progress.value = null
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
    <div class="flex items-center justify-between gap-2">
      <h3 class="font-semibold text-slate-100">File Uploader</h3>
      <span v-if="multiple" class="text-xs text-slate-500">
        {{ processedFiles.length }}/{{ maxFiles }} files
      </span>
    </div>

    <!-- Toast / validation badge -->
    <Transition name="toast-fade">
      <div
        v-if="toast"
        :class="[
          'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
          toast.type === 'error'
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        ]"
      >
        <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- Drop zone -->
    <div
      :class="[
        'upload-zone relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-8 transition-all duration-300',
        isDragging
          ? 'border-blue-400/70 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,0.2)]'
          : 'border-slate-600 bg-slate-800/40 hover:border-slate-500',
        processing && 'pointer-events-none opacity-90',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-40"
        :class="isDragging ? 'upload-zone-gradient' : ''"
      />

      <Upload class="relative mb-3 h-8 w-8 text-slate-400" />
      <p class="relative text-sm text-slate-200">Kéo thả hoặc chọn file</p>
      <p class="relative mt-1 text-xs text-slate-500">
        PDF · Excel · CSV · Ảnh (OCR) · Text · Tối đa {{ maxSizeMB }}MB
      </p>
      <button
        type="button"
        class="btn-secondary relative mt-4"
        :disabled="processing"
        @click="fileInputRef?.click()"
      >
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

    <!-- Progress bar -->
    <div v-if="processing && progress" class="space-y-2 rounded-lg bg-slate-800/80 p-4 dark:bg-slate-800">
      <div class="flex items-center justify-between text-xs">
        <span class="font-medium text-slate-200">{{ progress.label }}</span>
        <span class="tabular-nums text-blue-400">{{ progress.percent }}%</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          class="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400 transition-all duration-500 ease-out"
          :style="{ width: `${progress.percent}%` }"
        />
      </div>
    </div>

    <!-- Processed files -->
    <ul v-if="processedFiles.length" class="space-y-2">
      <li
        v-for="(file, idx) in processedFiles"
        :key="`${file.fileName}-${idx}`"
        class="flex items-start gap-3 rounded-lg border border-slate-700/60 bg-slate-800/60 p-3"
      >
        <img
          v-if="file.preview"
          :src="file.preview"
          alt=""
          class="h-12 w-12 rounded object-cover ring-1 ring-slate-600"
        />
        <File v-else class="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-200">{{ file.fileName }}</p>
          <p class="text-xs text-slate-500">
            {{ formatType(file.type) }} · {{ file.sizeKB }} KB
            <span v-if="file.rowCount"> · {{ file.rowCount }} dòng</span>
            <span v-if="file.ocrApplied" class="text-cyan-400"> · OCR</span>
          </p>
          <p
            v-if="file.extractedText"
            class="mt-1 line-clamp-2 text-xs text-slate-400"
          >
            {{ file.extractedText.slice(0, 120) }}{{ file.extractedText.length > 120 ? '...' : '' }}
          </p>
          <p
            v-if="file.sqlSchema"
            class="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-blue-400/90"
          >
            <Database class="h-3 w-3" />
            {{ file.tableName }} — schema ready
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 text-slate-500 transition hover:text-red-400"
          @click="removeFile(idx)"
        >
          <X class="h-4 w-4" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.upload-zone-gradient {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15),
    rgba(6, 182, 212, 0.1),
    rgba(59, 130, 246, 0.15)
  );
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
