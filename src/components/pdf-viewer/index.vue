<script setup lang="ts">
import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { LoadedPdfDocument } from './pdf'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import Scrollbar from '../scrollbar'
import {
  destroyPdfDocument,
  fetchPdfData,
  getPdfPageMetrics,
  isRenderCancelled,
  loadPdfDocument,
  renderPdfPage,
} from './pdf'
import samplePdf from './test.pdf?url'
import '../scrollbar/src/style.css'

interface PageState {
  pageNumber: number
  aspectRatio: number
  width: number
  height: number
  status: 'idle' | 'queued' | 'rendering' | 'rendered' | 'error'
  error: string
}

interface OutlineItem {
  id: string
  label: string
  pageNumber: number
}

const props = withDefaults(defineProps<{
  src?: string
  preloadPages?: number
}>(), {
  src: samplePdf,
  preloadPages: 1,
})

const scrollbarRef = ref<InstanceType<typeof Scrollbar> | null>(null)
const pageRefs = ref<(HTMLElement | null)[]>([])
const canvasRefs = ref<(HTMLCanvasElement | null)[]>([])

const pdfDoc = shallowRef<LoadedPdfDocument | null>(null)
const pageStates = ref<PageState[]>([])
const loading = ref(true)
const loadingText = ref('正在加载 PDF...')
const errorMessage = ref('')
const currentPage = ref(1)
const containerWidth = ref(0)
const outlineOpen = ref(false)

let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let loadingTask: PDFDocumentLoadingTask | null = null
let sessionId = 0
let isProcessingQueue = false
let scrollFrame = 0

const renderTasks = new Map<number, RenderTask>()
const pendingRenderQueue: number[] = []
const queuedPageIndexes = new Set<number>()
// const renderDelay = 2000
const mockErrorPageNumber = 1
const mockErroredPages = new Set<number>()

const totalPages = computed(() => pageStates.value.length)
const outlineItems = computed<OutlineItem[]>(() => {
  const total = totalPages.value

  if (!total) {
    return []
  }

  const candidates: OutlineItem[] = [
    { id: 'cover', label: '封面', pageNumber: 1 },
    { id: 'overview', label: '概览', pageNumber: Math.min(2, total) },
    { id: 'chapter-1', label: '第一部分', pageNumber: Math.min(4, total) },
    { id: 'chapter-2', label: '第二部分', pageNumber: Math.min(7, total) },
    { id: 'summary', label: '结尾', pageNumber: total },
  ]

  return candidates.filter((item, index, list) =>
    item.pageNumber >= 1
    && item.pageNumber <= total
    && list.findIndex(candidate => candidate.pageNumber === item.pageNumber) === index,
  )
})

function waitForFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function setPageRef(index: number, element: unknown) {
  pageRefs.value[index] = element instanceof HTMLElement ? element : null
}

function setCanvasRef(index: number, element: unknown) {
  canvasRefs.value[index] = element instanceof HTMLCanvasElement ? element : null
}

function getScrollContainer() {
  return scrollbarRef.value?.wrapRef as HTMLDivElement | undefined
}

function updateContainerWidth() {
  containerWidth.value = Math.max(getScrollContainer()?.clientWidth ?? 0, 0)
}

function getRenderWidth(pageIndex: number) {
  const pageElement = pageRefs.value[pageIndex]

  if (pageElement) {
    const styles = window.getComputedStyle(pageElement)
    const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
    const width = pageElement.clientWidth - horizontalPadding

    if (width > 0) {
      return width
    }
  }

  return containerWidth.value
}

function cleanupObserver() {
  observer?.disconnect()
  observer = null
}

function cleanupResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

function syncCurrentPageFromScroll() {
  const container = getScrollContainer()

  if (!container || !pageRefs.value.length) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const scrollCenter = containerRect.top + container.clientHeight / 2
  let nextPage = currentPage.value
  let minDistance = Number.POSITIVE_INFINITY

  pageRefs.value.forEach((pageElement, index) => {
    if (!pageElement) {
      return
    }

    const pageRect = pageElement.getBoundingClientRect()
    const pageCenter = pageRect.top + pageRect.height / 2
    const distance = Math.abs(pageCenter - scrollCenter)

    if (distance < minDistance) {
      minDistance = distance
      nextPage = index + 1
    }
  })

  currentPage.value = nextPage
}

function handleScroll() {
  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame)
  }

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    syncCurrentPageFromScroll()
  })
}

function scrollToPage(pageNumber: number) {
  const container = getScrollContainer()
  const pageElement = pageRefs.value[pageNumber - 1]

  if (!container || !pageElement) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const pageRect = pageElement.getBoundingClientRect()
  const targetTop = container.scrollTop + (pageRect.top - containerRect.top) - 24

  container.scrollTo({
    top: targetTop,
    behavior: 'smooth',
  })

  currentPage.value = pageNumber
  renderRange(pageNumber - 1, true)
}

function goToPrevPage() {
  if (currentPage.value <= 1) {
    return
  }

  scrollToPage(currentPage.value - 1)
}

function goToNextPage() {
  if (currentPage.value >= totalPages.value) {
    return
  }

  scrollToPage(currentPage.value + 1)
}

function cancelRender(pageNumber?: number) {
  if (typeof pageNumber === 'number') {
    renderTasks.get(pageNumber)?.cancel()
    renderTasks.delete(pageNumber)
    return
  }

  for (const task of renderTasks.values()) {
    task.cancel()
  }
  renderTasks.clear()
}

function resetRenderQueue() {
  pendingRenderQueue.length = 0
  queuedPageIndexes.clear()
  isProcessingQueue = false
}

async function resetDocument() {
  cancelRender()
  resetRenderQueue()
  cleanupObserver()
  pageRefs.value = []
  canvasRefs.value = []
  pageStates.value = []
  currentPage.value = 1
  errorMessage.value = ''

  if (loadingTask) {
    loadingTask.destroy()
    loadingTask = null
  }

  await destroyPdfDocument(pdfDoc.value)
  pdfDoc.value = null
  mockErroredPages.clear()
}

async function renderOnePage(pageIndex: number, force = false) {
  const pdf = pdfDoc.value
  const page = pageStates.value[pageIndex]
  const canvas = canvasRefs.value[pageIndex]

  if (!pdf || !page || !canvas) {
    return
  }

  if (!force && (page.status === 'rendering' || page.status === 'rendered')) {
    return
  }

  const pageNumber = page.pageNumber
  cancelRender(pageNumber)
  page.status = 'rendering'
  page.error = ''

  try {
    let width = getRenderWidth(pageIndex)

    if (!width) {
      await nextTick()
      await waitForFrame()
      width = getRenderWidth(pageIndex)
    }

    if (!width) {
      page.status = 'idle'
      return
    }

    if (
      page.pageNumber === mockErrorPageNumber
      && !force
      && !mockErroredPages.has(page.pageNumber)
    ) {
      mockErroredPages.add(page.pageNumber)
      await wait(500)
      page.status = 'error'
      page.error = '模拟加载失败，请重新加载当前页'
      return
    }

    const result = await renderPdfPage({
      pdf,
      pageNumber,
      canvas,
      containerWidth: width,
    })
    renderTasks.set(pageNumber, result.renderTask)

    await result.promise

    if (renderTasks.get(pageNumber) !== result.renderTask) {
      return
    }

    page.width = result.width
    page.height = result.height
    page.status = 'rendered'
    renderTasks.delete(pageNumber)
  }
  catch (error) {
    renderTasks.delete(pageNumber)

    if (isRenderCancelled(error)) {
      page.status = 'idle'
      return
    }

    page.status = 'error'
    page.error = error instanceof Error ? error.message : '页面渲染失败'
  }
}

async function processRenderQueue() {
  if (isProcessingQueue) {
    return
  }

  isProcessingQueue = true

  while (pendingRenderQueue.length) {
    const pageIndex = pendingRenderQueue.shift()

    if (pageIndex === undefined) {
      continue
    }

    queuedPageIndexes.delete(pageIndex)
    // await wait(renderDelay)
    await renderOnePage(pageIndex)
  }

  isProcessingQueue = false
}

function queuePageRender(pageIndex: number, force = false) {
  const page = pageStates.value[pageIndex]

  if (!page) {
    return
  }

  if (force) {
    const existingIndex = pendingRenderQueue.indexOf(pageIndex)

    if (existingIndex >= 0) {
      pendingRenderQueue.splice(existingIndex, 1)
    }

    queuedPageIndexes.delete(pageIndex)

    if (page.status !== 'rendering') {
      page.status = 'idle'
    }
  }

  if (page.status === 'rendered' || queuedPageIndexes.has(pageIndex)) {
    return
  }

  if (page.status !== 'rendering') {
    page.status = 'queued'
  }

  pendingRenderQueue.push(pageIndex)
  queuedPageIndexes.add(pageIndex)
  void processRenderQueue()
}

function renderRange(centerIndex: number, force = false) {
  const start = Math.max(centerIndex - props.preloadPages, 0)
  const end = Math.min(centerIndex + props.preloadPages, pageStates.value.length - 1)

  for (let index = start; index <= end; index += 1) {
    queuePageRender(index, force)
  }
}

function observePages() {
  cleanupObserver()

  const scrollContainer = getScrollContainer()

  if (!scrollContainer) {
    return
  }

  observer = new IntersectionObserver((entries) => {
    let mostVisiblePage = currentPage.value
    let maxRatio = 0

    for (const entry of entries) {
      const target = entry.target as HTMLElement
      const pageNumber = Number(target.dataset.pageNumber)

      if (!pageNumber) {
        continue
      }

      const pageIndex = pageNumber - 1

      if (entry.isIntersecting) {
        renderRange(pageIndex)
      }

      if (entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio
        mostVisiblePage = pageNumber
      }
    }

    currentPage.value = mostVisiblePage
  }, {
    root: scrollContainer,
    rootMargin: '120% 0px',
    threshold: [0.05, 0.25, 0.5, 0.75],
  })

  for (const element of pageRefs.value) {
    if (element) {
      observer.observe(element)
    }
  }
}

async function initPdf() {
  const activeSessionId = ++sessionId

  loading.value = true
  loadingText.value = '正在加载 PDF...'
  errorMessage.value = ''

  await resetDocument()
  updateContainerWidth()

  try {
    loadingText.value = '正在读取 PDF 文件...'
    const pdfData = await fetchPdfData(props.src)

    if (activeSessionId !== sessionId) {
      return
    }

    loadingText.value = '正在解析 PDF...'
    loadingTask = loadPdfDocument(pdfData)
    const pdf = await loadingTask.promise

    if (activeSessionId !== sessionId) {
      await pdf.destroy()
      return
    }

    pdfDoc.value = pdf
    loadingText.value = '正在读取页面信息...'

    const metrics = await getPdfPageMetrics(pdf)

    if (activeSessionId !== sessionId) {
      return
    }

    pageStates.value = metrics.map(metric => ({
      pageNumber: metric.pageNumber,
      aspectRatio: metric.aspectRatio,
      width: metric.width,
      height: metric.height,
      status: 'idle',
      error: '',
    }))

    loading.value = false
    await nextTick()
    await waitForFrame()
    observePages()
    syncCurrentPageFromScroll()
    renderRange(0, true)
  }
  catch (error) {
    if (activeSessionId !== sessionId) {
      return
    }

    errorMessage.value = error instanceof Error ? error.message : 'PDF 加载失败'
  }
  finally {
    if (activeSessionId === sessionId) {
      loadingTask = null
    }
  }
}

let resizeFrame = 0

function handleResize() {
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    const previousWidth = containerWidth.value

    updateContainerWidth()

    if (!containerWidth.value || previousWidth === containerWidth.value) {
      return
    }

    pageStates.value.forEach((page, index) => {
      page.width = containerWidth.value
      page.height = containerWidth.value * page.aspectRatio

      if (page.status === 'rendered') {
        page.status = 'idle'
        queuePageRender(index, true)
      }
    })
  })
}

onMounted(() => {
  updateContainerWidth()

  const scrollContainer = getScrollContainer()

  if (scrollContainer) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(scrollContainer)
  }

  void initPdf()
})

watch(() => props.src, () => {
  void initPdf()
})

onBeforeUnmount(async () => {
  sessionId += 1
  cleanupObserver()
  cleanupResizeObserver()
  cancelRender()

  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
  }

  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame)
  }

  await resetDocument()
})
</script>

<template>
  <Scrollbar
    ref="scrollbarRef"
    class="pdf-viewer"
    height="100vh"
    always
    @scroll="handleScroll"
  >
    <div v-if="!loading && !errorMessage && outlineItems.length" class="pdf-outline-shell">
      <button
        class="pdf-outline-toggle"
        type="button"
        @click="outlineOpen = !outlineOpen"
      >
        大纲
      </button>

      <transition name="pdf-outline">
        <aside v-if="outlineOpen" class="pdf-outline">
          <button
            v-for="item in outlineItems"
            :key="item.id"
            class="pdf-outline__item"
            :class="{ 'is-active': currentPage === item.pageNumber }"
            type="button"
            @click="scrollToPage(item.pageNumber)"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.pageNumber }}</small>
          </button>
        </aside>
      </transition>
    </div>

    <div v-if="!loading && !errorMessage && totalPages" class="pdf-toolbar-floating">
      <button
        class="pdf-toolbar-floating__btn"
        type="button"
        :disabled="currentPage <= 1"
        @click="goToPrevPage"
      >
        上一页
      </button>

      <div class="pdf-toolbar-floating__meta">
        <span>{{ currentPage }}</span>
        <i />
        <span>{{ totalPages }}</span>
      </div>

      <button
        class="pdf-toolbar-floating__btn"
        type="button"
        :disabled="currentPage >= totalPages"
        @click="goToNextPage"
      >
        下一页
      </button>
    </div>

    <div v-if="loading" class="pdf-state">
      {{ loadingText }}
    </div>

    <div v-else-if="errorMessage" class="pdf-state pdf-state--error">
      {{ errorMessage }}
    </div>

    <div v-else class="pdf-pages">
      <div
        v-for="(page, index) in pageStates"
        :key="page.pageNumber"
        :ref="element => setPageRef(index, element)"
        class="pdf-page"
        :data-page-number="page.pageNumber"
        :style="{ minHeight: `${page.height || containerWidth * page.aspectRatio}px` }"
      >
        <canvas
          :ref="element => setCanvasRef(index, element)"
          class="pdf-page__canvas"
        />

        <div
          v-if="page.status !== 'rendered'"
          class="pdf-page__overlay"
        >
          <span
            v-if="page.status === 'queued' || page.status === 'rendering'"
            class="pdf-page__spinner"
          />
          <div v-if="page.status === 'error'" class="pdf-page__mock-error">
            <span>{{ page.error || '模拟加载失败，请重新加载当前页' }}</span>
            <button
              class="pdf-page__reload"
              type="button"
              @click.stop="queuePageRender(index, true)"
            >
              重新加载当前页
            </button>
          </div>
          <span v-else>
            {{ page.status === 'idle' ? '' : 'Loading...' }}
          </span>
        </div>
      </div>
    </div>
  </Scrollbar>
</template>

<style scoped>
.pdf-viewer {
  height: 100vh;
  min-height: 100vh;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  background:
    radial-gradient(circle at top, rgba(188, 221, 255, 0.9), transparent 30%),
    linear-gradient(180deg, #eef5ff 0%, #dbe7f6 100%);
  color: #183153;
  font-family: 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.pdf-toolbar-floating {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 999px;
  background: rgba(20, 28, 45, 0.82);
  box-shadow: 0 16px 40px rgba(9, 18, 33, 0.2);
  backdrop-filter: blur(14px);
  transform: translateX(-50%);
}

.pdf-outline-shell {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 20;
}

.pdf-outline-toggle {
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: rgba(20, 28, 45, 0.86);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(9, 18, 33, 0.18);
  backdrop-filter: blur(14px);
}

.pdf-outline {
  position: absolute;
  top: 52px;
  left: 0;
  display: grid;
  gap: 10px;
  width: 180px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(20, 28, 45, 0.82);
  box-shadow: 0 16px 40px rgba(9, 18, 33, 0.18);
  backdrop-filter: blur(14px);
}

.pdf-outline-enter-active,
.pdf-outline-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.pdf-outline-enter-from,
.pdf-outline-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.pdf-outline__title {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}

.pdf-outline__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.pdf-outline__item small {
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
}

.pdf-outline__item.is-active {
  background: #2c6bed;
}

.pdf-toolbar-floating__btn {
  min-width: 72px;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.pdf-toolbar-floating__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pdf-toolbar-floating__meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 88px;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.pdf-toolbar-floating__meta i {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.2);
}

.pdf-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px 18px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(24, 49, 83, 0.08);
}

.pdf-toolbar h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
}

.pdf-toolbar p {
  margin: 8px 0 0;
  color: rgba(24, 49, 83, 0.72);
}

.pdf-toolbar__path {
  max-width: min(72vw, 900px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgba(24, 49, 83, 0.48);
}

.pdf-toolbar__meta {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(24, 49, 83, 0.08);
  font-size: 14px;
  white-space: nowrap;
}

.pdf-scroll {
  height: 100vh;
  overflow: auto;
  padding: 24px 12px 32px;
  box-sizing: border-box;
}

.pdf-pages {
  width: min(100%, 980px);
  margin: 0 auto;
  margin-top: 28px;
}

.pdf-page {
  position: relative;
  width: 100%;
  margin-bottom: 24px;
  box-sizing: border-box;
  background: #fff;
  box-shadow:
    0 14px 40px rgba(56, 88, 130, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.pdf-page__canvas {
  position: relative;
  z-index: 2;
  display: block;
  width: 100%;
  background: #fff;
}

.pdf-page__overlay {
  position: absolute;
  inset: 52px 18px 18px;
  z-index: 4;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: rgba(24, 49, 83, 0.56);
  font-size: 14px;
  backdrop-filter: blur(4px);
  text-align: center;
}

.pdf-page__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(24, 49, 83, 0.16);
  border-top-color: #2c6bed;
  border-radius: 50%;
  animation: pdf-spin 0.9s linear infinite;
}

@keyframes pdf-spin {
  to {
    transform: rotate(360deg);
  }
}

.pdf-state {
  width: min(100%, 720px);
  margin: 40px auto;
  padding: 32px 24px;
  text-align: center;
  color: red;
}

.pdf-state--error {
  color: #a32727;
}

@media (max-width: 768px) {
  .pdf-outline-shell {
    top: 12px;
    left: 12px;
  }

  .pdf-outline {
    width: 156px;
  }

  .pdf-toolbar {
    align-items: start;
    flex-direction: column;
  }

  .pdf-scroll {
    padding-inline: 8px;
  }

  .pdf-page {
    padding: 14px;
    border-radius: 20px;
  }

  .pdf-page__overlay {
    inset: 46px 14px 14px;
  }
}

.pdf-page__mock-error {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.pdf-page__reload {
  min-width: 132px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: #2c6bed;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
</style>
