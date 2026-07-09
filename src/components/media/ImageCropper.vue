<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { cropCanvas } from '@/composables/useImageCompress'

const props = defineProps<{
  sourceCanvas: HTMLCanvasElement
}>()

const emit = defineEmits<{
  crop: [canvas: HTMLCanvasElement]
  cancel: []
}>()

const cropX = ref(0)
const cropY = ref(0)
const cropW = ref(0)
const cropH = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const previewRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const scale = Math.min(1, 400 / props.sourceCanvas.width)
  cropW.value = props.sourceCanvas.width * scale * 0.8
  cropH.value = props.sourceCanvas.height * scale * 0.8
  cropX.value = (props.sourceCanvas.width * scale - cropW.value) / 2
  cropY.value = (props.sourceCanvas.height * scale - cropH.value) / 2
  drawPreview()
})

function drawPreview() {
  const canvas = previewRef.value
  if (!canvas) return
  const scale = Math.min(1, 400 / props.sourceCanvas.width)
  canvas.width = props.sourceCanvas.width * scale
  canvas.height = props.sourceCanvas.height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(props.sourceCanvas, 0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.strokeRect(cropX.value, cropY.value, cropW.value, cropH.value)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, 0, canvas.width, cropY.value)
  ctx.fillRect(0, cropY.value, cropX.value, cropH.value)
  ctx.fillRect(cropX.value + cropW.value, cropY.value, canvas.width - cropX.value - cropW.value, cropH.value)
  ctx.fillRect(0, cropY.value + cropH.value, canvas.width, canvas.height - cropY.value - cropH.value)
}

function onPointerDown(e: PointerEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX - cropX.value, y: e.clientY - cropY.value }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value || !previewRef.value) return
  cropX.value = Math.max(0, Math.min(e.clientX - dragStart.value.x, previewRef.value.width - cropW.value))
  cropY.value = Math.max(0, Math.min(e.clientY - dragStart.value.y, previewRef.value.height - cropH.value))
  drawPreview()
}

function onPointerUp() {
  isDragging.value = false
}

function applyCrop() {
  const scale = props.sourceCanvas.width / (previewRef.value?.width ?? props.sourceCanvas.width)
  const x = cropX.value * scale
  const y = cropY.value * scale
  const w = cropW.value * scale
  const h = cropH.value * scale
  const cropped = cropCanvas(props.sourceCanvas, x, y, w, h)
  emit('crop', cropped)
}

onUnmounted(() => {
  isDragging.value = false
})
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-slate-400">Drag to reposition crop area</p>
    <canvas
      ref="previewRef"
      class="mx-auto max-w-full cursor-move rounded-lg border border-slate-600"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
    <div class="flex gap-2">
      <button class="btn-primary flex-1" @click="applyCrop">Apply Crop</button>
      <button class="btn-secondary flex-1" @click="emit('cancel')">Skip</button>
    </div>
  </div>
</template>
