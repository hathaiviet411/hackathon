<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import type { ChartConfig } from '@/types'
import { seriesColor, chartTextColor, chartGridColor } from '@/utils/chartSetup'
import { useThemeStore } from '@/stores/theme'
import '@/utils/chartSetup'

const props = defineProps<{
  config: ChartConfig
}>()

// Re-evaluated whenever the theme toggles, so canvas colors stay in sync
// (Chart.js can't read CSS `var()` — see utils/chartSetup.ts).
const themeStore = useThemeStore()

const isCircular = computed(() => props.config.type === 'donut')

const chartData = computed(() => ({
  labels: props.config.labels,
  datasets: props.config.series.map((series, index) => {
    const color = seriesColor(index, series.color)
    if (isCircular.value) {
      return {
        label: series.name,
        data: series.data,
        backgroundColor: props.config.labels.map((_, i) => seriesColor(i)),
        borderWidth: 0,
      }
    }
    return {
      label: series.name,
      data: series.data,
      backgroundColor: props.config.type === 'bar' ? color : `${color}33`,
      borderColor: color,
      borderRadius: props.config.type === 'bar' ? 6 : 0,
      fill: props.config.type === 'area',
      tension: 0.35,
      pointRadius: 0,
    }
  }),
}))

const chartOptions = computed(() => {
  void themeStore.mode
  const textColor = chartTextColor()
  const gridColor = chartGridColor()

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: props.config.series.length > 1 || isCircular.value,
        labels: { color: textColor, boxWidth: 10, boxHeight: 10 },
      },
      tooltip: {
        backgroundColor: textColor === '#585858' ? '#ffffff' : '#1b1830',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: isCircular.value
      ? undefined
      : {
          x: { ticks: { color: textColor }, grid: { color: 'transparent' } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } },
        },
  }
})
</script>

<template>
  <div class="card">
    <h3 class="mb-4 font-semibold text-fg">{{ config.title }}</h3>
    <div class="h-64">
      <Bar v-if="config.type === 'bar'" :data="chartData" :options="chartOptions" />
      <Line v-else-if="config.type === 'line' || config.type === 'area'" :data="chartData" :options="chartOptions" />
      <Doughnut v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
