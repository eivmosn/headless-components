<script setup lang="ts">
import createGlobe from 'cobe'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import beijingImage from './images/beijing.jpg'
import egyptImage from './images/egypt.jpg'
import nycImage from './images/nyc.jpg'
import pisaImage from './images/pisa.jpg'
import sfImage from './images/sf.jpg'
import singaporeImage from './images/singapore.jpg'
import sydneyImage from './images/sydney.jpg'
import tokyoImage from './images/tokyo.jpg'

type RGB = [number, number, number]
type Location = [number, number]

interface PolaroidItem {
  id: string
  location: Location
  caption: string
  image: string
  rotate: number
}

type ProjectedPolaroid = PolaroidItem & {
  x: number
  y: number
  visible: boolean
}

const props = withDefaults(
  defineProps<{
    items?: PolaroidItem[]
    blurAmount?: number
    className?: string
    theta?: number
    dark?: number
    mapBrightness?: number
    baseColor?: RGB
    markerColor?: RGB
    arcColor?: RGB
    markerSize?: number
    markerElevation?: number
    opacity?: number
    glowColor?: RGB
    rotationSpeed?: number
    autoRotate?: boolean
  }>(),
  {
    items: () => [
      {
        id: 'polaroid-sf',
        location: [37.78, -122.44],
        caption: 'San Francisco',
        image: sfImage,
        rotate: -5,
      },
      {
        id: 'polaroid-nyc',
        location: [40.71, -74.01],
        caption: 'New York',
        image: nycImage,
        rotate: 4,
      },
      {
        id: 'polaroid-tokyo',
        location: [35.68, 139.65],
        caption: 'Tokyo',
        image: tokyoImage,
        rotate: -3,
      },
      {
        id: 'polaroid-sydney',
        location: [-33.87, 151.21],
        caption: 'Sydney',
        image: sydneyImage,
        rotate: 6,
      },
      {
        id: 'polaroid-beijing',
        location: [39.9, 116.4],
        caption: 'Beijing',
        image: beijingImage,
        rotate: -4,
      },
      {
        id: 'polaroid-egypt',
        location: [29.98, 31.13],
        caption: 'Egypt',
        image: egyptImage,
        rotate: 3,
      },
      {
        id: 'polaroid-pisa',
        location: [43.72, 10.4],
        caption: 'Pisa',
        image: pisaImage,
        rotate: -6,
      },
      {
        id: 'polaroid-singapore',
        location: [1.35, 103.82],
        caption: 'Singapore',
        image: singaporeImage,
        rotate: 5,
      },
    ],
    blurAmount: 8,
    className: '',
    theta: 0.2,
    dark: 0,
    mapBrightness: 9,
    baseColor: () => [1, 1, 1],
    markerColor: () => [0.4, 0.6, 0.9],
    arcColor: () => [0.5, 0.7, 1],
    markerSize: 0.02,
    markerElevation: 0,
    opacity: 0.7,
    glowColor: () => [0.94, 0.93, 0.91],
    rotationSpeed: 0.003,
    autoRotate: true,
  },
)

const GLOBE_R = 0.8
const THETA_MIN = -0.4
const THETA_MAX = 0.4

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const projectedItems = ref<ProjectedPolaroid[]>([])
const items = computed(() => props.items)

let globe: ReturnType<typeof createGlobe> | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null

let phi = 0
let phiOffset = 0
let thetaOffset = 0
let velocity = { phi: 0, theta: 0 }
let pointerInteracting: { x: number, y: number } | null = null
let lastPointer: { x: number, y: number, t: number } | null = null
let isPaused = false
let speed = 1

const globeMarkers = computed(() =>
  items.value.map(item => ({
    id: item.id,
    location: item.location,
    size: props.markerSize,
  })),
)

function latLonTo3D([lat, lon]: Location): [number, number, number] {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180 - Math.PI
  const cosLat = Math.cos(latRad)

  return [-cosLat * Math.cos(lonRad), Math.sin(latRad), cosLat * Math.sin(lonRad)]
}

function applyRotation(
  point: [number, number, number],
  currentTheta: number,
  currentPhi: number,
) {
  const host = rootRef.value
  if (!host)
    return { x: 0, y: 0, visible: false }

  const rect = host.getBoundingClientRect()
  const aspect = rect.width / Math.max(rect.height, 1)
  const cx = Math.cos(currentTheta)
  const cy = Math.cos(currentPhi)
  const sx = Math.sin(currentTheta)
  const sy = Math.sin(currentPhi)

  const rx = cy * point[0] + sy * point[2]
  const ry = sy * sx * point[0] + cx * point[1] - cy * sx * point[2]
  const rz = -sy * cx * point[0] + sx * point[1] + cy * cx * point[2]

  return {
    x: ((rx / aspect + 1) / 2) * 100,
    y: ((-ry + 1) / 2) * 100,
    visible: rz >= 0 || rx * rx + ry * ry >= 0.64,
  }
}

function project(location: Location, currentTheta: number, currentPhi: number) {
  const pos3D = latLonTo3D(location)
  const radius = GLOBE_R + props.markerElevation

  return applyRotation(
    [pos3D[0] * radius, pos3D[1] * radius, pos3D[2] * radius],
    currentTheta,
    currentPhi,
  )
}

function syncProjectedItems(currentPhi: number, currentTheta: number) {
  projectedItems.value = items.value.map((item) => {
    const projected = project(item.location, currentTheta, currentPhi)

    return {
      ...item,
      x: projected.x,
      y: projected.y,
      visible: projected.visible,
    }
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function currentTheta() {
  return props.theta + thetaOffset
}

function currentPhi() {
  return phi + phiOffset
}

function updateGlobeFrame() {
  if (!globe)
    return

  if (!isPaused) {
    if (props.autoRotate) {
      phi += props.rotationSpeed * speed
    }

    if (Math.abs(velocity.phi) > 0.0001 || Math.abs(velocity.theta) > 0.0001) {
      phiOffset += velocity.phi
      thetaOffset = clamp(thetaOffset + velocity.theta, THETA_MIN - props.theta, THETA_MAX - props.theta)
      velocity.phi *= 0.95
      velocity.theta *= 0.95
    }
  }

  const nextPhi = currentPhi()
  const nextTheta = currentTheta()

  globe.update({
    phi: nextPhi,
    theta: nextTheta,
    dark: props.dark,
    mapBrightness: props.mapBrightness,
    markerColor: props.markerColor,
    baseColor: props.baseColor,
    arcColor: props.arcColor,
    markerElevation: props.markerElevation,
    markers: globeMarkers.value,
    arcs: [],
    opacity: props.opacity,
    glowColor: props.glowColor,
  })

  syncProjectedItems(nextPhi, nextTheta)
  animationId = requestAnimationFrame(updateGlobeFrame)
}

function initGlobe() {
  const canvas = canvasRef.value
  const host = rootRef.value
  if (!canvas || !host || globe)
    return

  const width = host.offsetWidth
  if (!width)
    return

  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.8 : 2)

  globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width,
    height: width,
    phi: currentPhi(),
    theta: currentTheta(),
    dark: props.dark,
    diffuse: 1.5,
    mapSamples: 16000,
    mapBrightness: props.mapBrightness,
    baseColor: props.baseColor,
    markerColor: props.markerColor,
    glowColor: props.glowColor,
    markerElevation: props.markerElevation,
    markers: globeMarkers.value,
    arcs: [],
    arcColor: props.arcColor,
    arcWidth: 0.5,
    arcHeight: 0.25,
    opacity: props.opacity,
  })

  syncProjectedItems(currentPhi(), currentTheta())
  animationId = requestAnimationFrame(updateGlobeFrame)
}

function handlePointerDown(event: PointerEvent) {
  pointerInteracting = { x: event.clientX, y: event.clientY }
  lastPointer = { x: event.clientX, y: event.clientY, t: Date.now() }
  isPaused = true

  if (canvasRef.value) {
    canvasRef.value.style.cursor = 'grabbing'
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!pointerInteracting)
    return

  const now = Date.now()
  if (lastPointer) {
    const deltaX = event.clientX - lastPointer.x
    const deltaY = event.clientY - lastPointer.y
    const dt = Math.max(now - lastPointer.t, 1)
    const maxVelocity = 0.15

    phiOffset += deltaX / 300
    thetaOffset = clamp(thetaOffset + deltaY / 1000, THETA_MIN - props.theta, THETA_MAX - props.theta)

    velocity = {
      phi: Math.max(-maxVelocity, Math.min(maxVelocity, (deltaX / dt) * 0.3)),
      theta: Math.max(-maxVelocity, Math.min(maxVelocity, (deltaY / dt) * 0.08)),
    }
  }

  lastPointer = { x: event.clientX, y: event.clientY, t: now }
}

function handlePointerUp() {
  lastPointer = null

  pointerInteracting = null
  isPaused = false

  if (canvasRef.value) {
    canvasRef.value.style.cursor = 'grab'
  }
}

function handleResize() {
  const host = rootRef.value
  if (!host || !globe)
    return

  const width = host.offsetWidth
  if (!width)
    return

  globe.update({
    width,
    height: width,
  })

  syncProjectedItems(currentPhi(), currentTheta())
}

function handlePointerEnter() {
  if (!props.autoRotate)
    return
  speed = 0.8
}

function handlePointerLeave() {
  if (!props.autoRotate)
    return
  speed = 1
}

function getPolaroidStyle(item: ProjectedPolaroid) {
  return {
    'left': `${item.x}%`,
    'top': `${item.y}%`,
    'opacity': item.visible ? 1 : 0,
    'filter': `blur(${item.visible ? 0 : props.blurAmount}px)`,
    '--polaroid-rotate': `${item.rotate}deg`,
  }
}

onMounted(() => {
  initGlobe()

  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerup', handlePointerUp, { passive: true })

  resizeObserver = new ResizeObserver(handleResize)
  if (rootRef.value) {
    resizeObserver.observe(rootRef.value)
  }

  if (canvasRef.value) {
    canvasRef.value.style.cursor = 'grab'
  }
})

watch(
  () => [
    props.items,
    props.theta,
    props.dark,
    props.mapBrightness,
    props.baseColor,
    props.markerColor,
    props.arcColor,
    props.markerSize,
    props.markerElevation,
    props.opacity,
    props.glowColor,
  ],
  () => {
    handleResize()
    syncProjectedItems(currentPhi(), currentTheta())
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  resizeObserver?.disconnect()
  globe?.destroy()
})
</script>

<template>
  <div ref="rootRef" class="polaroid-globe" :class="className">
    <canvas
      ref="canvasRef"
      class="polaroid-globe-canvas"
      @pointerdown="handlePointerDown"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
    />

    <div class="polaroid-showcase">
      <div
        v-for="item in projectedItems"
        :key="item.id"
        class="showcase-polaroid"
        :style="getPolaroidStyle(item)"
      >
        <img :src="item.image" :alt="item.caption">
        <span class="showcase-polaroid-caption">{{ item.caption }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.polaroid-globe {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.polaroid-globe-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.polaroid-showcase {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.showcase-polaroid {
  position: absolute;
  margin: 0;
  background: #fff;
  padding: 6px 6px 24px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.1);
  transform: translate(-50%, calc(-100% - 8px)) rotate(var(--polaroid-rotate, 0deg));
  transform-origin: center bottom;
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
  pointer-events: none;
  will-change: left, top, transform, opacity, filter;
}

.showcase-polaroid img {
  display: block;
  width: 60px;
  height: 60px;
  object-fit: cover;
}

.showcase-polaroid-caption {
  position: absolute;
  right: 0;
  bottom: 5px;
  left: 0;
  text-align: center;
  font-family:
    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
  font-size: 0.5rem;
  letter-spacing: 0.02em;
  color: #333;
}

@media (max-width: 640px) {
  .showcase-polaroid {
    padding: 4px 4px 18px;
  }

  .showcase-polaroid img {
    width: 45px;
    height: 45px;
  }

  .showcase-polaroid-caption {
    bottom: 4px;
    font-size: 0.4rem;
  }
}
</style>
