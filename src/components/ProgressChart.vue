<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

const props = defineProps<{
  points: { t: number; y: number }[]
  seriesLabel: string
}>()

const container = ref<HTMLDivElement | null>(null)
const CHART_HEIGHT = 220
let chart: uPlot | null = null

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === '' ? fallback : value
}

function alignedData(): uPlot.AlignedData {
  return [props.points.map((point) => point.t), props.points.map((point) => point.y)]
}

function render(): void {
  const el = container.value
  if (el === null) return
  if (chart !== null) chart.destroy()

  const accent = readVar('--color-accent', '#ff6b35')
  const axis = readVar('--color-text-faint', '#6b6b73')
  const grid = readVar('--color-border', '#323236')

  const options: uPlot.Options = {
    width: el.clientWidth,
    height: CHART_HEIGHT,
    legend: { show: false },
    series: [
      {},
      {
        label: props.seriesLabel,
        stroke: accent,
        width: 2,
        points: { show: true, size: 7 },
      },
    ],
    axes: [
      { stroke: axis, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid } },
      { stroke: axis, grid: { stroke: grid, width: 1 }, ticks: { stroke: grid }, size: 52 },
    ],
  }
  chart = new uPlot(options, alignedData(), el)
}

function handleResize(): void {
  if (chart !== null && container.value !== null) {
    chart.setSize({ width: container.value.clientWidth, height: CHART_HEIGHT })
  }
}

onMounted(() => {
  render()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart !== null) chart.destroy()
})

// The metric toggle swaps the data array; redraw in place rather than rebuild.
watch(
  () => props.points,
  () => {
    if (chart !== null) chart.setData(alignedData())
  },
)
</script>

<template>
  <div ref="container" class="progress-chart"></div>
</template>

<style scoped>
.progress-chart {
  width: 100%;
  min-height: 220px;
}
</style>
