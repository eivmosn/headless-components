<script setup lang="ts">
import { computed } from 'vue'
import Scrollbar from '../scrollbar/src/scrollbar.vue'
import flowData from './nodes.json'
import '../scrollbar/src/style.css'

interface FlowNode {
  id: string
  type: string
  dimensions: {
    width: number
    height: number
  }
  computedPosition: {
    x: number
    y: number
  }
  data: {
    label: string
    tagRemark?: string
    type?: string
  }
}

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

const props = withDefaults(defineProps<{
  height?: string | number
}>(), {
  height: '500px',
})

const viewportPadding = 48

const nodes = flowData.nodes as FlowNode[]
const edges = flowData.edges as FlowEdge[]
const nodeMap = new Map(nodes.map(node => [node.id, node]))

const flowShellStyle = computed(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))

const scrollbarViewStyle = {
  height: '100%',
}

const bounds = computed(() => {
  const minX = Math.min(...nodes.map(node => node.computedPosition.x))
  const minY = Math.min(...nodes.map(node => node.computedPosition.y))
  const maxX = Math.max(...nodes.map(node => node.computedPosition.x + node.dimensions.width))
  const maxY = Math.max(...nodes.map(node => node.computedPosition.y + node.dimensions.height))

  return {
    offsetX: viewportPadding - minX,
    offsetY: viewportPadding - minY,
    width: maxX - minX + viewportPadding * 2,
    height: maxY - minY + viewportPadding * 2,
  }
})

const viewBox = computed(() => `0 0 ${bounds.value.width} ${bounds.value.height}`)

function getNodeStyle(node: FlowNode) {
  return {
    width: `${node.dimensions.width}px`,
    height: `${node.dimensions.height}px`,
    transform: `translate(${node.computedPosition.x + bounds.value.offsetX}px, ${node.computedPosition.y + bounds.value.offsetY}px)`,
  }
}

function getEdgePoint(edge: FlowEdge, type: 'source' | 'target') {
  const node = nodeMap.get(type === 'source' ? edge.source : edge.target)
  const fallbackX = (type === 'source' ? edge.sourceX : edge.targetX) + bounds.value.offsetX
  const fallbackY = (type === 'source' ? edge.sourceY : edge.targetY) + bounds.value.offsetY

  if (!node) {
    return {
      x: fallbackX,
      y: fallbackY,
    }
  }

  const nodeX = node.computedPosition.x + bounds.value.offsetX
  const nodeCenterX = nodeX + node.dimensions.width / 2
  const otherX = (type === 'source' ? edge.targetX : edge.sourceX) + bounds.value.offsetX
  const isRightSide = otherX >= nodeCenterX
  const overlap = Math.min(8, node.dimensions.width / 3)

  return {
    x: isRightSide ? nodeX + node.dimensions.width - overlap : nodeX + overlap,
    y: fallbackY,
  }
}

function getEdgePath(edge: FlowEdge) {
  const source = getEdgePoint(edge, 'source')
  const target = getEdgePoint(edge, 'target')
  const distance = Math.abs(target.x - source.x)
  const curvature = Math.min(Math.max(distance * 0.62, 32), 88)

  return [
    `M ${source.x} ${source.y}`,
    `C ${source.x + curvature} ${source.y}`,
    `${target.x - curvature} ${target.y}`,
    `${target.x} ${target.y}`,
  ].join(' ')
}
</script>

<template>
  <div class="p-10 box-border">
    <div class="flow-shell" :style="flowShellStyle">
      <Scrollbar :view-style="scrollbarViewStyle">
        <div class="flow-stage">
          <div class="flow-content">
            <svg
              class="flow-edges"
              :viewBox="viewBox"
              :width="bounds.width"
              :height="bounds.height"
              aria-hidden="true"
            >
              <path
                v-for="edge in edges"
                :key="edge.id"
                class="flow-edge"
                :d="getEdgePath(edge)"
              />
            </svg>

            <div
              v-for="node in nodes"
              :key="node.id"
              class="flow-node"
              :class="`flow-node--${node.type}`"
              :style="getNodeStyle(node)"
            >
              <span class="flow-node__label">{{ node.data.label }}</span>
            </div>
          </div>
        </div>
      </Scrollbar>
    </div>
  </div>
</template>

<style scoped>
.flow-shell {
  width: 100%;
  height: 100%;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  overflow: hidden;
}

.flow-stage {
  display: flex;
  align-items: center;
  width: max-content;
  min-width: 100%;
  min-height: 100%;
}

.flow-content {
  position: relative;
  flex: 0 0 auto;
}

.flow-edges {
  display: block;
  color: rgb(171 176 185);
  overflow: visible;
  pointer-events: none;
}

.flow-edge {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
}

.flow-node {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: rgb(30 41 59);
  font-size: 15px;
  font-weight: 600;
  background: rgb(255 255 255);
  border: 1px solid rgb(174 179 188);
  border-radius: 18px;
}

.flow-node--start,
.flow-node--end {
  color: rgb(51 153 255);
  background: rgb(255 255 255);
  border: 1px solid currentColor;
  border-radius: 999px;
}

.flow-node--start .flow-node__label,
.flow-node--end .flow-node__label {
  width: 0;
  height: 0;
  overflow: hidden;
}

.flow-node--start::before {
  content: '';
  width: 0;
  height: 0;
  margin-left: 3px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 12px solid currentColor;
}

.flow-node--end::before {
  content: '';
  width: 13px;
  height: 13px;
  background: rgb(239 68 68);
  border-radius: 3px;
}

.flow-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
