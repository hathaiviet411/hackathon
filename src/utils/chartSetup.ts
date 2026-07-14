import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
)

/** Fixed Aurora hex values for canvas rendering — Chart.js can't read CSS `var()`. */
const AURORA_SERIES_COLORS = ['#9c59fc', '#05f59c', '#1ea5fc', '#fca846', '#e43c25', '#00c17a']

export function seriesColor(index: number, explicit?: string): string {
  return explicit ?? AURORA_SERIES_COLORS[index % AURORA_SERIES_COLORS.length]
}

export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark')
}

export function chartTextColor(): string {
  return isDarkTheme() ? '#a8a3ba' : '#585858'
}

export function chartGridColor(): string {
  return isDarkTheme() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
}
