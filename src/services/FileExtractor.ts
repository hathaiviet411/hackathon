import type { ExtractedFileResult, ExtractedFileType } from '@/types'
import type { ExtractProgressCallback } from '@/utils/extractProgress'
import { reportProgress } from '@/utils/extractProgress'
import { runOcr, renderPdfPageToCanvas } from '@/utils/ocr'
import { deriveTableName, generateCreateTableSchema } from '@/utils/sqlSchema'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TEXT_EXTENSIONS = ['.txt', '.json', '.md']

const ACCEPTED_EXTENSIONS = [
  '.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.csv', '.json',
]

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

export function isAcceptedFile(file: File): boolean {
  const ext = getExtension(file.name)
  return ACCEPTED_EXTENSIONS.includes(ext) || IMAGE_TYPES.includes(file.type)
}

function detectType(file: File): ExtractedFileType {
  const ext = getExtension(file.name)
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  if (file.type === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (file.type.includes('spreadsheet') || ['.xlsx', '.xls'].includes(ext)) return 'excel'
  if (ext === '.csv' || file.type === 'text/csv') return 'csv'
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return 'unknown'
}

function baseResult(
  partial: Omit<ExtractedFileResult, 'text' | 'extractedText'> & {
    text?: string | null
    extractedText?: string | null
  },
): ExtractedFileResult {
  const extractedText = partial.extractedText ?? partial.text ?? null
  return {
    ...partial,
    text: extractedText,
    extractedText,
    sqlSchema: partial.sqlSchema ?? null,
    tableName: partial.tableName ?? null,
    rowCount: partial.rowCount ?? 0,
  }
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function buildTabularMeta(
  fileName: string,
  rows: Record<string, unknown>[],
  extraStructured: Record<string, unknown> = {},
) {
  const tableName = deriveTableName(fileName)
  const sqlSchema = generateCreateTableSchema(tableName, rows)
  return {
    tableName,
    sqlSchema,
    rowCount: rows.length,
    structured: { ...extraStructured, rows, tableName, sqlSchema },
  }
}

async function extractImage(
  file: File,
  onProgress?: ExtractProgressCallback,
): Promise<ExtractedFileResult> {
  reportProgress(onProgress, 'reading', 15)
  const preview = await readFileAsDataUrl(file)

  reportProgress(onProgress, 'extracting', 45)
  let extractedText: string | null = null
  let ocrApplied = false

  try {
    extractedText = await runOcr(preview, onProgress)
    ocrApplied = Boolean(extractedText)
  } catch {
    extractedText = null
  }

  reportProgress(onProgress, 'optimizing', 88)

  return baseResult({
    type: 'image',
    preview,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
    extractedText,
    structured: { mimeType: file.type, fileName: file.name, ocrApplied },
    ocrApplied,
    sqlSchema: null,
    tableName: null,
    rowCount: 0,
  })
}

async function extractPdf(
  file: File,
  onProgress?: ExtractProgressCallback,
): Promise<ExtractedFileResult> {
  reportProgress(onProgress, 'reading', 20)

  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  reportProgress(onProgress, 'extracting', 50)

  const pages: { page: number; text: string }[] = []
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    pages.push({ page: i, text })
    fullText += (fullText ? '\n\n' : '') + text
  }

  let ocrApplied = false
  if (!fullText.trim()) {
    reportProgress(onProgress, 'extracting', 60, 'PDF scan — đang chạy OCR trang 1...')
    const firstPage = await pdf.getPage(1)
    const canvas = await renderPdfPageToCanvas(firstPage, 2)
    const ocrText = await runOcr(canvas, onProgress)
    if (ocrText) {
      fullText = ocrText
      pages[0] = { page: 1, text: ocrText }
      ocrApplied = true
    }
  }

  reportProgress(onProgress, 'optimizing', 85)

  return baseResult({
    type: 'pdf',
    extractedText: fullText || null,
    structured: { pageCount: pdf.numPages, pages, ocrApplied },
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
    ocrApplied,
    sqlSchema: null,
    tableName: null,
    rowCount: 0,
  })
}

async function extractExcel(
  file: File,
  onProgress?: ExtractProgressCallback,
): Promise<ExtractedFileResult> {
  reportProgress(onProgress, 'reading', 25)

  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()

  reportProgress(onProgress, 'extracting', 55)

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheets: Record<string, unknown[]> = {}

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  const firstSheet = workbook.SheetNames[0]
  const rows = firstSheet ? (sheets[firstSheet] as Record<string, unknown>[]) : []

  reportProgress(onProgress, 'optimizing', 88)

  const tabular = buildTabularMeta(file.name, rows, { sheetNames: workbook.SheetNames, sheets })

  return baseResult({
    type: 'excel',
    extractedText: rows.length ? JSON.stringify(rows.slice(0, 50), null, 2) : null,
    structured: tabular.structured,
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
    sqlSchema: tabular.sqlSchema,
    tableName: tabular.tableName,
    rowCount: tabular.rowCount,
  })
}

async function extractCsv(
  file: File,
  onProgress?: ExtractProgressCallback,
): Promise<ExtractedFileResult> {
  reportProgress(onProgress, 'reading', 20)
  const raw = await readFileAsText(file)

  reportProgress(onProgress, 'extracting', 55)
  const rows = parseCsv(raw)

  reportProgress(onProgress, 'optimizing', 88)
  const tabular = buildTabularMeta(file.name, rows, { headers: rows.length ? Object.keys(rows[0]) : [] })

  return baseResult({
    type: 'csv',
    extractedText: raw,
    structured: tabular.structured,
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
    sqlSchema: tabular.sqlSchema,
    tableName: tabular.tableName,
    rowCount: tabular.rowCount,
  })
}

async function extractPlainText(
  file: File,
  onProgress?: ExtractProgressCallback,
): Promise<ExtractedFileResult> {
  reportProgress(onProgress, 'reading', 20)
  const text = await readFileAsText(file)

  reportProgress(onProgress, 'extracting', 60)

  let structured: Record<string, unknown> | null = null
  const ext = getExtension(file.name)

  if (ext === '.json') {
    try {
      structured = { parsed: JSON.parse(text) }
    } catch {
      structured = null
    }
  }

  reportProgress(onProgress, 'optimizing', 85)

  return baseResult({
    type: 'text',
    extractedText: text,
    structured,
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
    sqlSchema: null,
    tableName: null,
    rowCount: 0,
  })
}

export const FileExtractor = {
  isAcceptedFile,

  async extract(
    file: File,
    onProgress?: ExtractProgressCallback,
  ): Promise<ExtractedFileResult> {
    const type = detectType(file)

    let result: ExtractedFileResult

    switch (type) {
      case 'image':
        result = await extractImage(file, onProgress)
        break
      case 'pdf':
        result = await extractPdf(file, onProgress)
        break
      case 'excel':
        result = await extractExcel(file, onProgress)
        break
      case 'csv':
        result = await extractCsv(file, onProgress)
        break
      case 'text':
        result = await extractPlainText(file, onProgress)
        break
      default:
        result = baseResult({
          type: 'unknown',
          extractedText: null,
          structured: null,
          preview: null,
          fileName: file.name,
          sizeKB: Math.round((file.size / 1024) * 10) / 10,
          sqlSchema: null,
          tableName: null,
          rowCount: 0,
        })
    }

    reportProgress(onProgress, 'ready', 100)
    return result
  },
}
