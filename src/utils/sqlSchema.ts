const SQL_RESERVED = new Set([
  'table', 'select', 'from', 'where', 'group', 'order', 'index', 'key', 'primary', 'foreign',
])

export function sanitizeSqlIdentifier(raw: string, fallback = 'col'): string {
  let id = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  if (!id) id = fallback
  if (/^\d/.test(id)) id = `_${id}`
  if (SQL_RESERVED.has(id)) id = `${id}_col`
  return id
}

export function deriveTableName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '')
  return sanitizeSqlIdentifier(base, 'uploaded_data')
}

function inferSqlType(sample: unknown): string {
  if (sample === null || sample === undefined || sample === '') return 'TEXT'
  if (typeof sample === 'boolean') return 'INTEGER'
  if (typeof sample === 'number') {
    return Number.isInteger(sample) ? 'INTEGER' : 'REAL'
  }
  const str = String(sample).trim()
  if (/^-?\d+$/.test(str)) return 'INTEGER'
  if (/^-?\d+\.\d+$/.test(str)) return 'REAL'
  return 'TEXT'
}

export function generateCreateTableSchema(
  tableName: string,
  rows: Record<string, unknown>[],
): string {
  const safeTable = sanitizeSqlIdentifier(tableName, 'uploaded_data')

  if (!rows.length) {
    return `CREATE TABLE ${safeTable} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT\n);`
  }

  const columns = Object.keys(rows[0])
  const used = new Set<string>()

  const colDefs = columns.map((col, index) => {
    let safeCol = sanitizeSqlIdentifier(col, `col_${index + 1}`)
    while (used.has(safeCol)) safeCol = `${safeCol}_${index}`
    used.add(safeCol)

    const sample = rows.find((row) => {
      const v = row[col]
      return v !== null && v !== undefined && String(v).trim() !== ''
    })?.[col]

    return `  ${safeCol} ${inferSqlType(sample)}`
  })

  return `CREATE TABLE ${safeTable} (\n${colDefs.join(',\n')}\n);`
}

export function mapRowsToSqlColumns(
  rows: Record<string, unknown>[],
): { columns: string[]; mappedRows: Record<string, unknown>[] } {
  if (!rows.length) return { columns: [], mappedRows: [] }

  const originalCols = Object.keys(rows[0])
  const used = new Set<string>()
  const columns = originalCols.map((col, index) => {
    let safeCol = sanitizeSqlIdentifier(col, `col_${index + 1}`)
    while (used.has(safeCol)) safeCol = `${safeCol}_${index}`
    used.add(safeCol)
    return safeCol
  })

  const mappedRows = rows.map((row) =>
    Object.fromEntries(
      originalCols.map((orig, i) => [columns[i], row[orig] ?? null]),
    ),
  )

  return { columns, mappedRows }
}
