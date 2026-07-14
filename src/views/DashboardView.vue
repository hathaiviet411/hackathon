<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import ChartRenderer from '@/components/dashboard/ChartRenderer.vue'
import DataTable from '@/components/data/DataTable.vue'
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue'
import SkeletonTable from '@/components/skeleton/SkeletonTable.vue'
import Skeleton from '@/components/skeleton/Skeleton.vue'
import { useToast } from '@/composables/useToast'
import { apiUrl } from '@/config/env'
import type { DashboardSchema } from '@/types'

const toast = useToast()
const isLoading = ref(true)
const schema = ref<DashboardSchema | null>(null)

async function loadDashboard() {
  isLoading.value = true
  try {
    const res = await fetch(apiUrl('/api/mock-dashboard'))
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    schema.value = (await res.json()) as DashboardSchema
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to load dashboard')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <DashboardLayout :title="schema?.title ?? 'Dashboard'">
    <section class="space-y-6">
      <!-- Stat cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <template v-if="isLoading">
          <SkeletonCard v-for="i in 4" :key="i" />
        </template>
        <StatCard v-else v-for="stat in schema?.stats" :key="stat.id" :stat="stat" />
      </div>

      <!-- Charts -->
      <div class="grid gap-6 lg:grid-cols-2">
        <template v-if="isLoading">
          <div class="card space-y-3">
            <Skeleton class="h-5 w-32" />
            <Skeleton class="h-56 w-full" />
          </div>
          <div class="card space-y-3">
            <Skeleton class="h-5 w-32" />
            <Skeleton class="h-56 w-full" />
          </div>
        </template>
        <ChartRenderer v-else v-for="chart in schema?.charts" :key="chart.id" :config="chart" />
      </div>

      <!-- Table -->
      <SkeletonTable v-if="isLoading" :rows="5" />
      <div v-else-if="schema" class="card">
        <h3 class="mb-4 font-semibold text-fg">Recent Orders</h3>
        <DataTable :columns="schema.table.columns" :rows="schema.table.rows" filename="orders" />
      </div>
    </section>
  </DashboardLayout>
</template>
