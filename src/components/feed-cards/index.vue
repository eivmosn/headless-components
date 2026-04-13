<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { FeedCards } from './types'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Scrollbar } from '../scrollbar/index'
import Card from './card.vue'
import '../scrollbar/src/style.css'

type ScrollRoot = string | HTMLElement | null | undefined

const props = withDefaults(defineProps<{
  cards?: FeedCards
  cols?: number
  maxCols?: number
  minCardWidth?: number
  gap?: number
  renderAheadRows?: number
  batchRows?: number
  maxConcurrentLoads?: number
  skeletonDelay?: number
  scrollRoot?: ScrollRoot
  style?: CSSProperties
  className?: string
}>(), {
  cards: () => [],
  cols: 5,
  maxCols: 5,
  minCardWidth: 240,
  gap: 20,
  renderAheadRows: 1,
  batchRows: 2,
  maxConcurrentLoads: 5,
  skeletonDelay: 220,
  scrollRoot: undefined,
})

const containerRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

const visibleCount = ref(0)
const renderedCount = ref(0)
const activeLoads = ref(0)
const loadedFlags = ref<boolean[]>([])

let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let loadingQueue = new Set<number>()
let renderCycle = 0

const safeMaxCols = computed(() => Math.max(1, Math.min(props.cols, props.maxCols)))
const gapStyle = computed(() => `${props.gap}px`)
const total = computed(() => props.cards.length)

const effectiveCols = ref(safeMaxCols.value)
const gridTemplateColumns = computed(() => `repeat(${effectiveCols.value}, minmax(0, 1fr))`)

const visibleCards = computed(() => props.cards.slice(0, visibleCount.value))
const loadingSet = computed(() => {
  const set = new Set<number>()
  for (let index = 0; index < visibleCount.value; index += 1) {
    if (!loadedFlags.value[index])
      set.add(index)
  }
  return set
})

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function calculateColumns(width: number) {
  const maxByWidth = Math.max(1, Math.floor((width + props.gap) / (props.minCardWidth + props.gap)))
  effectiveCols.value = Math.max(1, Math.min(safeMaxCols.value, maxByWidth))
}

function calculateInitialCount() {
  const container = containerRef.value
  if (!container)
    return

  const width = container.clientWidth
  const viewportHeight = getViewportHeight(container)

  calculateColumns(width)

  const cardWidth = (width - props.gap * (effectiveCols.value - 1)) / effectiveCols.value
  const cardHeight = cardWidth * 9 / 16 + 108
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / Math.max(cardHeight, 1)))
  const nextCount = Math.min(total.value, (visibleRows + props.renderAheadRows) * effectiveCols.value)

  if (nextCount > visibleCount.value)
    visibleCount.value = nextCount
}

function resolveScrollRoot(): HTMLElement | null {
  if (!props.scrollRoot)
    return null

  if (typeof props.scrollRoot === 'string')
    return document.querySelector<HTMLElement>(props.scrollRoot)

  return props.scrollRoot
}

function getViewportHeight(container: HTMLElement) {
  const scrollRoot = resolveScrollRoot()
  if (scrollRoot)
    return scrollRoot.clientHeight || container.clientHeight || 0

  return window.innerHeight || container.clientHeight || 0
}

function revealMoreRows(rows = props.batchRows) {
  const nextCount = Math.min(total.value, visibleCount.value + rows * effectiveCols.value)
  if (nextCount > visibleCount.value)
    visibleCount.value = nextCount
}

async function processQueue() {
  if (activeLoads.value >= props.maxConcurrentLoads)
    return

  const currentCycle = renderCycle
  const pending = Array.from(loadingQueue).filter(index => index < visibleCount.value && !loadedFlags.value[index])
  if (!pending.length)
    return

  while (activeLoads.value < props.maxConcurrentLoads && pending.length) {
    const index = pending.shift()
    if (index == null)
      break

    loadingQueue.delete(index)
    activeLoads.value += 1

    wait(props.skeletonDelay)
      .then(() => {
        if (currentCycle !== renderCycle)
          return

        loadedFlags.value[index] = true
        renderedCount.value = loadedFlags.value.filter(Boolean).length
      })
      .finally(() => {
        if (currentCycle !== renderCycle)
          return

        activeLoads.value -= 1
        void processQueue()
      })
  }
}

function syncQueue() {
  for (let index = 0; index < visibleCount.value; index += 1) {
    if (!loadedFlags.value[index])
      loadingQueue.add(index)
  }

  processQueue()
}

function resetRenderState() {
  renderCycle += 1
  visibleCount.value = 0
  renderedCount.value = 0
  activeLoads.value = 0
  loadingQueue = new Set()
  loadedFlags.value = []
  calculateInitialCount()
  syncQueue()
}

watch(() => [props.cards, props.cols, props.maxCols, props.minCardWidth, props.gap], async () => {
  await nextTick()
  resetRenderState()
}, { deep: true })

watch(visibleCount, () => {
  syncQueue()
})

onMounted(async () => {
  await nextTick()
  calculateInitialCount()
  syncQueue()

  resizeObserver = new ResizeObserver(() => {
    calculateInitialCount()
  })

  if (containerRef.value)
    resizeObserver.observe(containerRef.value)

  intersectionObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting))
      revealMoreRows()
  }, {
    root: resolveScrollRoot(),
    rootMargin: '400px 0px',
    threshold: 0,
  })

  if (sentinelRef.value)
    intersectionObserver.observe(sentinelRef.value)
})

watch(sentinelRef, async (value) => {
  await nextTick()
  intersectionObserver?.disconnect()
  if (value)
    intersectionObserver?.observe(value)
})

watch(() => props.scrollRoot, async () => {
  await nextTick()
  calculateInitialCount()
  intersectionObserver?.disconnect()
  if (sentinelRef.value) {
    intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting))
        revealMoreRows()
    }, {
      root: resolveScrollRoot(),
      rootMargin: '400px 0px',
      threshold: 0,
    })
    intersectionObserver.observe(sentinelRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
})
</script>

<template>
  <Scrollbar>
    <div :class="className" class="inner" :style="style">
      <section ref="containerRef" class="feed-layout">
        <div
          class="feed-layout__grid" :style="{
            gap: gapStyle,
            gridTemplateColumns,
          }"
        >
          <Card
            v-for="card, index in visibleCards" :key="`${card.title}-${index}`" :card="card"
            :loading="loadingSet.has(index)"
          />
        </div>
        <div v-if="visibleCount < total" ref="sentinelRef" class="feed-layout__sentinel" />
      </section>
    </div>
  </Scrollbar>
</template>

<style scoped>
.inner {
  height: 100%;
  padding: 20px 40px;
}

.feed-layout {
  min-width: 0;
}

.feed-layout__grid {
  display: grid;
  align-items: start;
}

.feed-layout__sentinel {
  height: 1px;
}
</style>
