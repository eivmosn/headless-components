import type { PDFDocumentLoadingTask, PDFPageProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  getDocument,
  GlobalWorkerOptions,
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

export interface LoadedPdfDocument {
  numPages: number
  getPage: (pageNumber: number) => Promise<PDFPageProxy>
  destroy: () => Promise<void>
}

export interface PdfPageMetric {
  pageNumber: number
  width: number
  height: number
  aspectRatio: number
}

export interface RenderPdfPageOptions {
  pdf: LoadedPdfDocument
  pageNumber: number
  canvas: HTMLCanvasElement
  containerWidth: number
  devicePixelRatio?: number
}

export interface RenderPdfPageTask {
  width: number
  height: number
  renderTask: RenderTask
  promise: Promise<void>
}

export async function fetchPdfData(src: string) {
  const response = await fetch(src)

  if (!response.ok) {
    throw new Error(`PDF 请求失败: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export function loadPdfDocument(src: string | Uint8Array): PDFDocumentLoadingTask {
  return getDocument({
    ...(typeof src === 'string' ? { url: src } : { data: src }),
    useWorkerFetch: false,
    isEvalSupported: false,
  })
}

export async function getPdfPageMetrics(pdf: LoadedPdfDocument): Promise<PdfPageMetric[]> {
  const metrics: PdfPageMetric[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })

    metrics.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.height / viewport.width,
    })

    page.cleanup()
  }

  return metrics
}

export async function getPdfPageSize(
  pdf: LoadedPdfDocument,
  pageNumber: number,
  containerWidth: number,
) {
  const page = await pdf.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = containerWidth / baseViewport.width
  const viewport = page.getViewport({ scale })

  page.cleanup()

  return {
    width: viewport.width,
    height: viewport.height,
  }
}

export async function renderPdfPage(options: RenderPdfPageOptions): Promise<RenderPdfPageTask> {
  const {
    pdf,
    pageNumber,
    canvas,
    containerWidth,
    devicePixelRatio = window.devicePixelRatio || 1,
  } = options

  if (!containerWidth) {
    throw new Error('Container width is required to render a PDF page.')
  }

  const page = await pdf.getPage(pageNumber)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = containerWidth / baseViewport.width
  const viewport = page.getViewport({ scale })

  const outputScale = Math.max(devicePixelRatio, 1)
  const context = canvas.getContext('2d')

  if (!context) {
    page.cleanup()
    throw new Error('Canvas 2D context is unavailable.')
  }

  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  const transform = outputScale === 1
    ? undefined
    : [outputScale, 0, 0, outputScale, 0, 0]

  const renderTask = page.render({
    canvas,
    viewport,
    transform,
  })

  const promise = renderTask.promise.finally(() => {
    page.cleanup()
  })

  return {
    width: viewport.width,
    height: viewport.height,
    renderTask,
    promise,
  }
}

export async function destroyPdfDocument(pdf: LoadedPdfDocument | null | undefined) {
  if (!pdf) {
    return
  }

  await pdf.destroy()
}

export function isRenderCancelled(error: unknown) {
  return error instanceof Error && error.name === 'RenderingCancelledException'
}

export function getViewportSize(page: PDFPageProxy, width: number) {
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = width / baseViewport.width
  const viewport = page.getViewport({ scale })

  return {
    width: viewport.width,
    height: viewport.height,
  }
}
