<script setup lang="ts">
import { ref } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import DynamicForm from '@/components/forms/DynamicForm.vue'
import DataTable from '@/components/data/DataTable.vue'
import type { FormSchema, TableColumn } from '@/types'
import formSchemaJson from '@/schemas/formSchema.example.json'
import sampleData from '@/mocks/sampleTableData.json'

const formSchema = formSchemaJson as FormSchema

const tableRows = ref<Record<string, unknown>[]>([...sampleData])
const tableColumns: TableColumn[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'label', label: 'Label', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'quantity', label: 'Qty', sortable: true },
  { key: 'active', label: 'Active' },
  { key: 'effectiveDate', label: 'Date', sortable: true },
]

function onFormSubmit(data: Record<string, unknown>) {
  const newRow = {
    id: String(tableRows.value.length + 1),
    ...data,
  }
  tableRows.value.unshift(newRow)
}
</script>

<template>
  <DashboardLayout title="Forms & Data Table">
    <section class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card">
          <DynamicForm :schema="formSchema" @submit="onFormSubmit" />
        </div>
        <div class="card">
          <h3 class="mb-4 font-semibold text-fg">Data Table</h3>
          <DataTable :columns="tableColumns" :rows="tableRows" filename="records" />
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>
