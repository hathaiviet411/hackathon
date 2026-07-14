import * as XLSX from 'xlsx'
import type { TableColumn } from '@/types'

function toPlainRows(columns: TableColumn[], rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col.label, row[col.key] ?? ''])),
  )
}

export function exportToXlsx(
  columns: TableColumn[],
  rows: Record<string, unknown>[],
  filename = 'export',
) {
  const worksheet = XLSX.utils.json_to_sheet(toPlainRows(columns, rows))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function exportToCsv(
  columns: TableColumn[],
  rows: Record<string, unknown>[],
  filename = 'export',
) {
  const worksheet = XLSX.utils.json_to_sheet(toPlainRows(columns, rows))
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
