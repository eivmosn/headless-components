<script setup lang="ts">
import type { ComponentPublicInstance, CSSProperties } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Scrollbar from '../scrollbar'
import '../scrollbar/src/style.css'

interface TableColumn {
  key: string
  title: string
  width?: number
  align?: 'left' | 'center' | 'right'
  fixed?: 'left' | 'right'
  children?: TableColumn[]
}

type TableRow = Record<string, unknown>

interface LeafColumn extends TableColumn {
  width: number
  leafIndex: number
  fixed?: 'left' | 'right'
}

interface HeaderCell {
  key: string
  title: string
  level: number
  colSpan: number
  rowSpan: number
  start: number
  end: number
  width: number
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  isLeaf: boolean
}

const props = defineProps<{
  columns: TableColumn[]
  data?: TableRow[]
  height?: string | number
  emptyText?: string
  fixedTopRows?: number
  fixedBottomRows?: number
}>()

const resolvedData = computed(() => props.data ?? [])
const resolvedHeight = computed(() => props.height ?? '200px')
const resolvedEmptyText = computed(() => props.emptyText ?? 'No data')
const resolvedFixedTopRows = computed(() =>
  Math.max(0, Math.min(props.fixedTopRows ?? 0, resolvedData.value.length)),
)
const resolvedFixedBottomRows = computed(() => {
  const available = Math.max(0, resolvedData.value.length - resolvedFixedTopRows.value)
  return Math.max(0, Math.min(props.fixedBottomRows ?? 0, available))
})

const headRef = ref<HTMLDivElement>()
const bodyRowRefs = ref<Array<HTMLDivElement | undefined>>([])
const headHeight = ref(0)
const bodyRowHeights = ref<number[]>([])
const bottomPinnedGap = ref(0)
const scrollbarRef = ref<ComponentPublicInstance | null>(null)

let measureRaf = 0

const Z_INDEX = {
  body: 1,
  fixedColumn: 2,
  fixedBottomRow: 3,
  fixedBottomRowCell: 4,
  fixedTopRow: 5,
  fixedTopRowCell: 6,
  headRow: 7,
  headCell: 8,
  scrollbar: 9,
} as const

function getColumnWidth(column: TableColumn) {
  return column.width ?? 160
}

function getColumnDepth(columns: TableColumn[], level = 1): number {
  return columns.reduce((depth, column) => {
    const nextDepth = column.children?.length
      ? getColumnDepth(column.children, level + 1)
      : level
    return Math.max(depth, nextDepth)
  }, level)
}

function flattenLeafColumns(columns: TableColumn[], bucket: LeafColumn[] = []) {
  columns.forEach((column) => {
    if (column.children?.length) {
      flattenLeafColumns(column.children, bucket)
      return
    }

    bucket.push({
      ...column,
      width: getColumnWidth(column),
      leafIndex: bucket.length,
    })
  })

  return bucket
}

const leafColumns = computed(() => flattenLeafColumns(props.columns))
const maxHeaderDepth = computed(() => getColumnDepth(props.columns))

function buildHeaderRows(columns: TableColumn[]) {
  const rows = Array.from({ length: maxHeaderDepth.value }, () => [] as HeaderCell[])
  let cursor = 0

  function walk(nodes: TableColumn[], level: number): { start: number, end: number, width: number, fixed?: 'left' | 'right' }[] {
    return nodes.map((node) => {
      const currentStart = cursor

      if (node.children?.length) {
        const children = walk(node.children, level + 1)
        const start = children[0]?.start ?? currentStart
        const end = children[children.length - 1]?.end ?? currentStart
        const width = children.reduce((total, child) => total + child.width, 0)
        const allLeft = children.every(child => child.fixed === 'left')
        const allRight = children.every(child => child.fixed === 'right')
        const fixed = allLeft ? 'left' : allRight ? 'right' : undefined

        rows[level - 1].push({
          key: `${node.key}-${level}-${start}`,
          title: node.title,
          level,
          colSpan: end - start + 1,
          rowSpan: 1,
          start,
          end,
          width,
          fixed,
          align: node.align,
          isLeaf: false,
        })

        return { start, end, width, fixed }
      }

      const width = getColumnWidth(node)
      const start = cursor
      const end = cursor
      cursor += 1

      rows[level - 1].push({
        key: `${node.key}-${level}-${start}`,
        title: node.title,
        level,
        colSpan: 1,
        rowSpan: maxHeaderDepth.value - level + 1,
        start,
        end,
        width,
        fixed: node.fixed,
        align: node.align,
        isLeaf: true,
      })

      return { start, end, width, fixed: node.fixed }
    })
  }

  walk(columns, 1)
  return rows
}

const headerRows = computed(() => buildHeaderRows(props.columns))

const flexColumnIndex = computed(() => {
  for (let index = leafColumns.value.length - 1; index >= 0; index -= 1) {
    if (!leafColumns.value[index]?.fixed)
      return index
  }

  return -1
})

const gridTemplateColumns = computed(() =>
  leafColumns.value
    .map((column, index) => index === flexColumnIndex.value
      ? `minmax(${column.width}px, 1fr)`
      : `${column.width}px`)
    .join(' '),
)

const fixedOffsets = computed(() => {
  const leftOffsets: number[] = []
  const rightOffsets: number[] = []
  let left = 0
  let right = 0

  for (let index = 0; index < leafColumns.value.length; index += 1) {
    const column = leafColumns.value[index]
    leftOffsets[index] = left
    if (column?.fixed === 'left')
      left += column.width
  }

  for (let index = leafColumns.value.length - 1; index >= 0; index -= 1) {
    const column = leafColumns.value[index]
    rightOffsets[index] = right
    if (column?.fixed === 'right')
      right += column.width
  }

  return {
    left: leftOffsets,
    right: rightOffsets,
  }
})

const fixedBoundaryIndexes = computed(() => {
  let lastLeft = -1
  let firstRight = -1

  leafColumns.value.forEach((column, index) => {
    if (column.fixed === 'left')
      lastLeft = index
    if (column.fixed === 'right' && firstRight === -1)
      firstRight = index
  })

  return {
    lastLeft,
    firstRight,
  }
})

function getCellValue(row: TableRow, column: LeafColumn) {
  const value = row[column.key]
  return value == null || value === '' ? '—' : String(value)
}

function getAlignClass(align?: TableColumn['align']) {
  return align ? `table-cell--${align}` : ''
}

function getRowKey(row: TableRow, index: number) {
  const id = row.id
  return typeof id === 'string' || typeof id === 'number' ? id : index
}

function getFixedEdgeClasses(start: number, end: number) {
  return [
    end === fixedBoundaryIndexes.value.lastLeft ? 'table-cell--fixed-left-edge' : '',
    start === fixedBoundaryIndexes.value.firstRight ? 'table-cell--fixed-right-edge' : '',
  ]
}

function getBodyCellClasses(column: LeafColumn) {
  return [
    getAlignClass(column.align),
    column.fixed ? `table-cell--fixed-${column.fixed}` : '',
    ...getFixedEdgeClasses(column.leafIndex, column.leafIndex),
  ]
}

function getHeaderCellClasses(cell: HeaderCell) {
  return [
    getAlignClass(cell.align),
    cell.fixed ? `table-cell--fixed-${cell.fixed}` : '',
    cell.isLeaf ? 'table-cell--head-leaf' : 'table-cell--head-group',
    ...getFixedEdgeClasses(cell.start, cell.end),
  ]
}

function getStickyCellStyle(
  fixed: 'left' | 'right' | undefined,
  start: number,
  end: number,
  zIndex: number,
) {
  if (!fixed)
    return undefined

  const style: CSSProperties = {
    position: 'sticky',
    left: fixed === 'left' ? `${fixedOffsets.value.left[start]}px` : undefined,
    right: fixed === 'right' ? `${fixedOffsets.value.right[end]}px` : undefined,
    zIndex,
  }

  return style
}

function getHeaderStyle() {
  const style: CSSProperties = {
    gridTemplateColumns: gridTemplateColumns.value,
    gridTemplateRows: `repeat(${maxHeaderDepth.value}, auto)`,
    position: 'sticky',
    top: '0px',
    zIndex: Z_INDEX.headRow,
  }

  return style
}

function getHeaderCellStyle(cell: HeaderCell) {
  const stickyStyle = getStickyCellStyle(cell.fixed, cell.start, cell.end, Z_INDEX.headCell)
  const style: CSSProperties = {
    gridColumn: `${cell.start + 1} / span ${cell.colSpan}`,
    gridRow: `${cell.level} / span ${cell.rowSpan}`,
    ...(stickyStyle ?? {}),
  }

  return style
}

function setBodyRowRef(element: unknown, index: number) {
  bodyRowRefs.value[index] = element instanceof HTMLDivElement ? element : undefined
}

function measureStickyRows() {
  const wrapElement = getScrollbarWrapElement()
  headHeight.value = headRef.value?.offsetHeight ?? 0
  bodyRowHeights.value = resolvedData.value.map((_, index) => bodyRowRefs.value[index]?.offsetHeight ?? 0)

  const contentHeight = headHeight.value + bodyRowHeights.value.reduce((total, height) => total + height, 0)
  const wrapHeight = wrapElement?.clientHeight ?? 0
  bottomPinnedGap.value = Math.max(0, wrapHeight - contentHeight)
}

function scheduleMeasureStickyRows() {
  if (measureRaf)
    cancelAnimationFrame(measureRaf)

  measureRaf = requestAnimationFrame(() => {
    measureRaf = 0
    measureStickyRows()
  })
}

function getTopRowOffset(index: number) {
  let offset = headHeight.value

  for (let current = 0; current < index; current += 1) {
    offset += bodyRowHeights.value[current] ?? 0
  }

  return offset
}

function getBottomRowOffset(index: number) {
  let offset = 0

  for (let current = resolvedData.value.length - 1; current > index; current -= 1) {
    offset += bodyRowHeights.value[current] ?? 0
  }

  return offset
}

function getScrollbarWrapElement() {
  const exposed = scrollbarRef.value as
    | { wrapRef?: HTMLDivElement | { value?: HTMLDivElement | undefined } }
    | null

  const wrapRef = exposed?.wrapRef
  if (wrapRef instanceof HTMLDivElement)
    return wrapRef

  return wrapRef?.value
}

function isFixedTopRow(index: number) {
  return index < resolvedFixedTopRows.value
}

function isFixedBottomRow(index: number) {
  return index >= resolvedData.value.length - resolvedFixedBottomRows.value
}

function isFirstFixedBottomRow(index: number) {
  return resolvedFixedBottomRows.value > 0
    && index === resolvedData.value.length - resolvedFixedBottomRows.value
}

function getBodyRowClasses(index: number) {
  return {
    'table-row--fixed-top': isFixedTopRow(index),
    'table-row--fixed-bottom': isFixedBottomRow(index),
  }
}

function getBodyRowStyle(index: number) {
  if (isFixedTopRow(index)) {
    const style: CSSProperties = {
      gridTemplateColumns: gridTemplateColumns.value,
      position: 'sticky',
      top: `${getTopRowOffset(index)}px`,
      zIndex: Z_INDEX.fixedTopRow,
    }

    return style
  }

  if (isFixedBottomRow(index)) {
    const style: CSSProperties = {
      gridTemplateColumns: gridTemplateColumns.value,
      position: 'sticky',
      bottom: `${getBottomRowOffset(index)}px`,
      marginTop: isFirstFixedBottomRow(index) ? `${bottomPinnedGap.value}px` : undefined,
      zIndex: Z_INDEX.fixedBottomRow,
    }

    return style
  }

  return {
    gridTemplateColumns: gridTemplateColumns.value,
    zIndex: Z_INDEX.body,
  } satisfies CSSProperties
}

function getBodyCellStyle(column: LeafColumn, rowIndex: number) {
  const stickyColumnStyle = getStickyCellStyle(column.fixed, column.leafIndex, column.leafIndex, Z_INDEX.fixedColumn)
  const zIndex = isFixedTopRow(rowIndex)
    ? column.fixed ? Z_INDEX.fixedTopRowCell : Z_INDEX.fixedTopRow
    : isFixedBottomRow(rowIndex)
      ? column.fixed ? Z_INDEX.fixedBottomRowCell : Z_INDEX.fixedBottomRow
      : column.fixed ? Z_INDEX.fixedColumn : Z_INDEX.body

  if (!stickyColumnStyle) {
    return { zIndex } satisfies CSSProperties
  }

  return {
    ...stickyColumnStyle,
    zIndex,
  } satisfies CSSProperties
}

watch(
  () => [
    props.columns,
    resolvedData.value,
    resolvedFixedTopRows.value,
    resolvedFixedBottomRows.value,
  ],
  async () => {
    await nextTick()
    scheduleMeasureStickyRows()
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  scheduleMeasureStickyRows()
  window.addEventListener('resize', scheduleMeasureStickyRows)
})

onBeforeUnmount(() => {
  if (measureRaf)
    cancelAnimationFrame(measureRaf)
  window.removeEventListener('resize', scheduleMeasureStickyRows)
})
</script>

<template>
  <div class="table-root">
    <Scrollbar
      ref="scrollbarRef"
      :height="resolvedHeight"
    >
      <div class="table">
        <div
          ref="headRef"
          class="table-head"
          :style="getHeaderStyle()"
        >
          <div
            v-for="cell in headerRows.flat()"
            :key="cell.key"
            class="table-cell table-cell--head"
            :class="getHeaderCellClasses(cell)"
            :style="getHeaderCellStyle(cell)"
          >
            {{ cell.title }}
          </div>
        </div>

        <template v-if="resolvedData.length">
          <div
            v-for="(row, rowIndex) in resolvedData"
            :key="getRowKey(row, rowIndex)"
            :ref="element => setBodyRowRef(element, rowIndex)"
            class="table-row"
            :class="getBodyRowClasses(rowIndex)"
            :style="getBodyRowStyle(rowIndex)"
          >
            <div
              v-for="column in leafColumns"
              :key="column.key"
              class="table-cell"
              :class="getBodyCellClasses(column)"
              :style="getBodyCellStyle(column, rowIndex)"
            >
              {{ getCellValue(row, column) }}
            </div>
          </div>
        </template>

        <div v-else class="table-empty">
          {{ resolvedEmptyText }}
        </div>
      </div>
    </Scrollbar>
  </div>
</template>

<style scoped>
.table-root {
  width: 100%;
  min-width: 0;
  border: 1px solid #dbe6ff;
}

.table-root :deep(.el-scrollbar__wrap) {
  position: relative;
  z-index: 1;
}

.table-root :deep(.el-scrollbar__bar) {
  z-index: 9;
}

.table-root :deep(.el-scrollbar__thumb) {
  position: relative;
  z-index: 9;
}

.table {
  width: max-content;
  min-width: 100%;
}

.table-head {
  display: grid;
  min-width: 100%;
  background: #fff;
}

.table-row {
  display: grid;
  grid-auto-rows: minmax(0, auto);
  min-width: 100%;
  background: #fff;
}

.table-row:nth-child(even) {
  background: #f8fbff;
}

.table-row--fixed-top,
.table-row--fixed-bottom {
  background: #fff;
}

.table-row--fixed-top {
  box-shadow: 0 8px 12px -12px rgba(15, 23, 42, 0.22);
}

.table-row--fixed-bottom {
  box-shadow: 0 -8px 12px -12px rgba(15, 23, 42, 0.22);
}

.table-cell {
  min-width: 0;
  padding: 9px 12px;
  border-right: 1px solid #edf2ff;
  border-bottom: 1px solid #edf2ff;
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
  background: inherit;
}

.table-cell--head {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
}

.table-cell--head-group {
  justify-content: flex-start;
}

.table-cell--head-leaf {
  justify-content: flex-start;
}

.table-cell--center {
  text-align: center;
}

.table-cell--right {
  text-align: right;
}

.table-cell--head.table-cell--center {
  justify-content: center;
}

.table-cell--head.table-cell--right {
  justify-content: flex-end;
}

.table-cell--fixed-left-edge {
  box-shadow: 1px 0 0 #edf2ff, 10px 0 12px -12px rgba(15, 23, 42, 0.18);
}

.table-cell--fixed-right-edge {
  box-shadow: -1px 0 0 #edf2ff, -10px 0 12px -12px rgba(15, 23, 42, 0.18);
}

.table-empty {
  display: grid;
  place-items: center;
  min-height: 200px;
  color: #94a3b8;
  font-size: 14px;
}
</style>
