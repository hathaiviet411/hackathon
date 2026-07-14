<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { CapturedImage } from '@/types'
import { useCamera } from '@/composables/useCamera'
import { compressCanvas } from '@/composables/useImageCompress'
import ImageCropper from './ImageCropper.vue'
import { Camera, RotateCcw, Upload, X, SwitchCamera, Check, Plus } from 'lucide-vue-next'

const emit = defineEmits<{
  capture: [image: CapturedImage]
  done: [images: CapturedImage[]]
}>()

const { stream, error, isActive, start, stop, captureFrame } = useCamera()
const videoRef = ref<HTMLVideoElement | null>(null)
const capturedCanvas = ref<HTMLCanvasElement | null>(null)
const showCropper = ref(false)
const shots = ref<CapturedImage[]>([])
const facingMode = ref<'user' | 'environment'>('environment')
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(stream, (s) => {
  if (videoRef.value && s) {
    videoRef.value.srcObject = s
  }
})

async function handleStart() {
  try {
    await start(facingMode.value)
  } catch {
    // error set in composable
  }
}

async function handleSwitchCamera() {
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  if (isActive.value) {
    stop()
    await handleStart()
  }
}

function handleCapture() {
  if (!videoRef.value) return
  capturedCanvas.value = captureFrame(videoRef.value)
  showCropper.value = true
}

function addShot(result: CapturedImage) {
  shots.value.push(result)
  emit('capture', result)
}

async function handleCropped(canvas: HTMLCanvasElement) {
  showCropper.value = false
  const result = await compressCanvas(canvas)
  addShot(result)
  stop()
}

async function handleSkipCrop() {
  if (!capturedCanvas.value) return
  showCropper.value = false
  const result = await compressCanvas(capturedCanvas.value)
  addShot(result)
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

function removeShot(index: number) {
  shots.value.splice(index, 1)
}

function finishSession() {
  emit('done', [...shots.value])
  shots.value = []
}

function reset() {
  shots.value = []
  capturedCanvas.value = null
  showCropper.value = false
  stop()
}

onUnmounted(stop)
</script>

<template>
  <div class="card space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-fg">Camera Capture</h3>
      <button v-if="shots.length || isActive" class="btn-secondary px-2 py-1.5" @click="reset">
        <RotateCcw class="h-4 w-4" />
      </button>
    </div>

    <p v-if="error" class="rounded-lg bg-status-red/10 px-3 py-2 text-sm text-status-red">
      {{ error }}. Try the file upload fallback below.
    </p>

    <!-- Cropper -->
    <ImageCropper
      v-if="showCropper && capturedCanvas"
      :source-canvas="capturedCanvas"
      @crop="handleCropped"
      @cancel="handleSkipCrop"
    />

    <!-- Live camera -->
    <div v-else-if="isActive" class="space-y-3">
      <div class="relative">
        <video
          ref="videoRef"
          autoplay
          playsinline
          muted
          class="w-full rounded-lg bg-black"
        />
        <button
          class="absolute right-2 top-2 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm"
          aria-label="Switch camera"
          @click="handleSwitchCamera"
        >
          <SwitchCamera class="h-4 w-4" />
        </button>
      </div>
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

    <!-- Thumbnail strip + add-another / done -->
    <div v-else-if="shots.length" class="space-y-3">
      <div class="scrollbar-aurora flex gap-2 overflow-x-auto pb-1">
        <div
          v-for="(shot, index) in shots"
          :key="index"
          class="group relative shrink-0"
        >
          <img
            :src="shot.base64"
            alt="Captured"
            class="h-20 w-20 rounded-lg border border-surface-border object-cover"
          />
          <button
            class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-status-red text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove shot"
            @click="removeShot(index)"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>
      <p class="text-xs text-fg-muted">{{ shots.length }} photo{{ shots.length > 1 ? 's' : '' }} captured</p>
      <div class="flex gap-2">
        <button class="btn-secondary flex-1" @click="handleStart">
          <Plus class="h-4 w-4" />
          Add another
        </button>
        <button class="btn-primary flex-1" @click="finishSession">
          <Check class="h-4 w-4" />
          Done
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
          <div class="w-full border-t border-surface-border" />
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-surface px-2 text-fg-subtle">or</span>
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
