export type ExtractProgressStage = 'reading' | 'extracting' | 'optimizing' | 'ready'

export interface ExtractProgress {
  percent: number
  label: string
  stage: ExtractProgressStage
}

export type ExtractProgressCallback = (progress: ExtractProgress) => void

export const EXTRACT_STAGE_LABELS: Record<ExtractProgressStage, string> = {
  reading: 'Đang đọc file...',
  extracting: 'Đang trích xuất dữ liệu...',
  optimizing: 'Đang tối ưu cấu trúc AI...',
  ready: 'Sẵn sàng!',
}

export const STAGE_PERCENT: Record<ExtractProgressStage, number> = {
  reading: 20,
  extracting: 55,
  optimizing: 85,
  ready: 100,
}

export function reportProgress(
  onProgress: ExtractProgressCallback | undefined,
  stage: ExtractProgressStage,
  percent?: number,
  label?: string,
) {
  onProgress?.({
    stage,
    percent: percent ?? STAGE_PERCENT[stage],
    label: label ?? EXTRACT_STAGE_LABELS[stage],
  })
}
