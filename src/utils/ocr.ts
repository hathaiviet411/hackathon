import type { ExtractProgressCallback } from '@/utils/extractProgress'

type OcrWorker = {
  recognize: (
    image: string | HTMLCanvasElement | ImageData,
    options?: object,
    output?: object,
  ) => Promise<{ data: { text: string } }>
  terminate: () => Promise<void>
}

let workerPromise: Promise<OcrWorker> | null = null

async function getOcrWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: () => undefined,
      })
      return worker as unknown as OcrWorker
    })()
  }
  return workerPromise
}

export async function runOcr(
  source: string | HTMLCanvasElement,
  onProgress?: ExtractProgressCallback,
): Promise<string> {
  onProgress?.({
    stage: 'extracting',
    percent: 50,
    label: 'Đang nhận dạng văn bản (OCR)...',
  })

  const worker = await getOcrWorker()
  const { data } = await worker.recognize(source)
  return data.text.trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderPdfPageToCanvas(page: any, scale = 2): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: context, viewport }).promise
  return canvas
}

export async function terminateOcrWorker() {
  if (!workerPromise) return
  try {
    const worker = await workerPromise
    await worker.terminate()
  } finally {
    workerPromise = null
  }
}
