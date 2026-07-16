import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { ExtractedFileResult } from '@/types'
import { deriveTableName, mapRowsToSqlColumns } from '@/utils/sqlSchema'

export interface LoadedDataContext {
  fileName: string
  tableName: string
  rowCount: number
  sqlSchema: string
  loadedAt: number
}

class LocalDataStoreService {
  private db: Database | null = null
  private initPromise: Promise<void> | null = null
  private context: LoadedDataContext | null = null

  async init() {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
      this.db = new SQL.Database()
    })()

    return this.initPromise
  }

  getLoadedContext() {
    return this.context
  }

  async loadFromExtractedResult(result: ExtractedFileResult): Promise<LoadedDataContext> {
    await this.init()
    if (!this.db) throw new Error('SQLite not initialized')

    const rows = this.extractRows(result)
    if (!rows.length) {
      throw new Error('No tabular rows found in file')
    }

    const tableName = result.tableName ?? deriveTableName(result.fileName)
    const sqlSchema = result.sqlSchema
    if (!sqlSchema) throw new Error('Missing SQL schema for tabular file')

    const { columns, mappedRows } = mapRowsToSqlColumns(rows)

    this.db.run(`DROP TABLE IF EXISTS ${tableName}`)
    this.db.run(sqlSchema)

    const placeholders = columns.map(() => '?').join(', ')
    const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`

    for (const row of mappedRows) {
      const values = columns.map((col) => {
        const v = row[col]
        if (v === null || v === undefined || v === '') return null
        if (typeof v === 'number' || typeof v === 'bigint') return v as SqlValue
        if (typeof v === 'boolean') return v ? 1 : 0
        return String(v)
      })
      this.db.run(insertSql, values)
    }

    this.context = {
      fileName: result.fileName,
      tableName,
      rowCount: mappedRows.length,
      sqlSchema,
      loadedAt: Date.now(),
    }

    return this.context
  }

  private extractRows(result: ExtractedFileResult): Record<string, unknown>[] {
    if (result.type === 'excel' && result.structured?.sheets) {
      const sheets = result.structured.sheets as Record<string, Record<string, unknown>[]>
      const first = Object.values(sheets)[0]
      return first ?? []
    }

    if (result.structured?.rows && Array.isArray(result.structured.rows)) {
      return result.structured.rows as Record<string, unknown>[]
    }

    return []
  }

  query(sql: string): Record<string, unknown>[] {
    if (!this.db) throw new Error('SQLite not initialized')
    const stmt = this.db.prepare(sql)
    const rows: Record<string, unknown>[] = []

    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  }

  buildAgentContextBlock(result: ExtractedFileResult): string {
    const parts = [
      '\n\n--- LOADED FILE CONTEXT (Local RAG / Text-to-SQL) ---',
      `File: ${result.fileName}`,
      `Type: ${result.type}`,
      `Rows: ${result.rowCount}`,
    ]

    if (result.tableName && result.sqlSchema) {
      parts.push(`SQLite table: ${result.tableName}`)
      parts.push('Schema:')
      parts.push(result.sqlSchema)
      parts.push(
        'You may answer questions by writing SQL against this in-memory table. Prefer SELECT queries only.',
      )
    }

    if (result.extractedText) {
      const preview = result.extractedText.slice(0, 3000)
      parts.push('Extracted text preview:')
      parts.push(preview)
      if (result.extractedText.length > 3000) parts.push('...(truncated)')
    }

    parts.push('--- END FILE CONTEXT ---')
    return parts.join('\n')
  }

  clear() {
    this.context = null
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.initPromise = null
  }
}

export const LocalDataStore = new LocalDataStoreService()
