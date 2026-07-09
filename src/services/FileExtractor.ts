import type { ExtractedFileResult, ExtractedFileType } from '@/types'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const TEXT_EXTENSIONS = ['.txt', '.csv', '.json', '.md']

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

function detectType(file: File): ExtractedFileType {
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  if (file.type === 'application/pdf' || getExtension(file.name) === '.pdf') return 'pdf'
  if (
    file.type.includes('spreadsheet') ||
    ['.xlsx', '.xls'].includes(getExtension(file.name))
  ) {
    return 'excel'
  }
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(getExtension(file.name))) {
    return 'text'
  }
  return 'unknown'
}

async function extractText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function extractImage(file: File): Promise<ExtractedFileResult> {
  const preview = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return {
    type: 'image',
    text: null,
    structured: { mimeType: file.type, fileName: file.name },
    preview,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
  }
}

async function extractPdf(file: File): Promise<ExtractedFileResult> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
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

  return {
    type: 'pdf',
    text: fullText || null,
    structured: { pageCount: pdf.numPages, pages },
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
  }
}

async function extractExcel(file: File): Promise<ExtractedFileResult> {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheets: Record<string, unknown[]> = {}

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  const firstSheet = workbook.SheetNames[0]
  const rows = firstSheet ? (sheets[firstSheet] as Record<string, unknown>[]) : []

  return {
    type: 'excel',
    text: rows.length ? JSON.stringify(rows, null, 2) : null,
    structured: { sheetNames: workbook.SheetNames, sheets },
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
  }
}

async function extractPlainText(file: File): Promise<ExtractedFileResult> {
  const text = await extractText(file)
  let structured: Record<string, unknown> | null = null

  if (getExtension(file.name) === '.json') {
    try {
      structured = { parsed: JSON.parse(text) }
    } catch {
      structured = null
    }
  } else if (getExtension(file.name) === '.csv') {
    const lines = text.split('\n').filter(Boolean)
    const headers = lines[0]?.split(',').map((h) => h.trim()) ?? []
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })
    structured = { headers, rows }
  }

  return {
    type: 'text',
    text,
    structured,
    preview: null,
    fileName: file.name,
    sizeKB: Math.round((file.size / 1024) * 10) / 10,
  }
}

export const FileExtractor = {
  async extract(file: File): Promise<ExtractedFileResult> {
    const type = detectType(file)

    switch (type) {
      case 'image':
        return extractImage(file)
      case 'pdf':
        return extractPdf(file)
      case 'excel':
        return extractExcel(file)
      case 'text':
        return extractPlainText(file)
      default:
        return {
          type: 'unknown',
          text: null,
          structured: null,
          preview: null,
          fileName: file.name,
          sizeKB: Math.round((file.size / 1024) * 10) / 10,
        }
    }
  },
}
