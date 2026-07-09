<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { CapturedImage } from '@/types'
import { useCamera } from '@/composables/useCamera'
import { compressCanvas } from '@/composables/useImageCompress'
import ImageCropper from './ImageCropper.vue'
import { Camera, RotateCcw, Upload, X } from 'lucide-vue-next'

const emit = defineEmits<{
  capture: [image: CapturedImage]
}>()

const { stream, error, isActive, start, stop, captureFrame } = useCamera()
const videoRef = ref<HTMLVideoElement | null>(null)
const capturedCanvas = ref<HTMLCanvasElement | null>(null)
const showCropper = ref(false)
const preview = ref<CapturedImage | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(stream, (s) => {
  if (videoRef.value && s) {
    videoRef.value.srcObject = s
  }
})

async function handleStart() {
  try {
    await start('environment')
  } catch {
    // error set in composable
  }
}

function handleCapture() {
  if (!videoRef.value) return
  capturedCanvas.value = captureFrame(videoRef.value)
  showCropper.value = true
}

async function handleCropped(canvas: HTMLCanvasElement) {
  showCropper.value = false
  const result = await compressCanvas(canvas)
  preview.value = result
  emit('capture', result)
  stop()
}

async function handleSkipCrop() {
  if (!capturedCanvas.value) return
  showCropper.value = false
  const result = await compressCanvas(capturedCanvas.value)
  preview.value = result
  emit('capture', result)
  stop()
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    capturedCanvas.value = canvas
    showCropper.value = true
  }
  img.src = url
}

function reset() {
  preview.value = null
  capturedCanvas.value = null
  showCropper.value = false
  stop()
}

onUnmounted(stop)
</script>

<template>
  <div class="card space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-slate-100">Camera Capture</h3>
      <button v-if="preview || isActive" class="btn-secondary px-2 py-1.5" @click="reset">
        <RotateCcw class="h-4 w-4" />
      </button>
    </div>

    <p v-if="error" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
      {{ error }}. Try the file upload fallback below.
    </p>

    <!-- Preview result -->
    <div v-if="preview" class="space-y-2">
      <img :src="preview.base64" alt="Captured" class="max-h-48 rounded-lg object-contain" />
      <p class="text-xs text-slate-400">
        {{ preview.width }}×{{ preview.height }} · {{ preview.sizeKB }} KB
      </p>
    </div>

    <!-- Cropper -->
    <ImageCropper
      v-else-if="showCropper && capturedCanvas"
      :source-canvas="capturedCanvas"
      @crop="handleCropped"
      @cancel="handleSkipCrop"
    />

    <!-- Live camera -->
    <div v-else-if="isActive" class="space-y-3">
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        class="w-full rounded-lg bg-black"
      />
      <div class="flex gap-2">
        <button class="btn-primary flex-1" @click="handleCapture">
          <Camera class="h-4 w-4" />
          Capture
        </button>
        <button class="btn-secondary" @click="stop">
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Initial state -->
    <div v-else class="space-y-3">
      <button class="btn-primary w-full" @click="handleStart">
        <Camera class="h-4 w-4" />
        Open Camera
      </button>
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-700" />
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-slate-900 px-2 text-slate-500">or</span>
        </div>
      </div>
      <button class="btn-secondary w-full" @click="fileInputRef?.click()">
        <Upload class="h-4 w-4" />
        Upload Image
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>
