<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import DataTable from '@/components/data/DataTable.vue'
import CameraCapture from '@/components/media/CameraCapture.vue'
import FileUploader from '@/components/media/FileUploader.vue'
import type { ExtractedFileResult, TableColumn } from '@/types'
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'radix-vue'

const extractedRows = ref<Record<string, unknown>[]>([])

function onFileProcessed(result: ExtractedFileResult) {
  if (result.type === 'excel' && result.structured?.sheets) {
    const sheets = result.structured.sheets as Record<string, Record<string, unknown>[]>
    const firstSheet = Object.values(sheets)[0]
    if (firstSheet) {
      extractedRows.value = firstSheet
      return
    }
  }
  extractedRows.value = [{
    fileName: result.fileName,
    type: result.type,
    sizeKB: result.sizeKB,
    preview: result.text?.slice(0, 200) ?? '—',
  }]
}

const extractedColumns = computed<TableColumn[]>(() => {
  if (!extractedRows.value.length) return []
  return Object.keys(extractedRows.value[0]).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    sortable: true,
  }))
})
</script>

<template>
  <DashboardLayout title="File & Media Utilities">
    <section class="space-y-6">
      <TabsRoot default-value="camera" class="space-y-4">
        <TabsList class="inline-flex rounded-lg bg-surface-muted p-1">
          <TabsTrigger
            value="camera"
            class="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-fg-muted transition-colors data-[state=active]:bg-surface-elevated data-[state=active]:text-fg data-[state=active]:shadow-sm"
          >
            Camera
          </TabsTrigger>
          <TabsTrigger
            value="files"
            class="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-fg-muted transition-colors data-[state=active]:bg-surface-elevated data-[state=active]:text-fg data-[state=active]:shadow-sm"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <CameraCapture />
        </TabsContent>

        <TabsContent value="files" class="space-y-6">
          <FileUploader @file-processed="onFileProcessed" />
          <div v-if="extractedRows.length" class="card">
            <h3 class="mb-4 font-semibold text-fg">Extracted Data</h3>
            <DataTable :columns="extractedColumns" :rows="extractedRows" filename="extracted-data" />
          </div>
        </TabsContent>
      </TabsRoot>
    </section>
  </DashboardLayout>
</template>
