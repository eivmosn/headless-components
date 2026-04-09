<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface TabItem {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  tabs?: Array<TabItem>
}>(), {
  modelValue: '',
  tabs: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'tabClick': [tab: TabItem]
  'tabRemove': [tab: TabItem]
}>()

const scrollableInnerRef = ref<HTMLDivElement | null>(null)
const showControls = ref(false)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null
let frameId = 0

function cancelScheduledMeasure() {
  if (!frameId)
    return
  cancelAnimationFrame(frameId)
  frameId = 0
}

function updateScrollState() {
  const container = scrollableInnerRef.value
  if (!container)
    return

  const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0)
  const scrollLeft = Math.min(container.scrollLeft, maxScrollLeft)
  const hasOverflow = maxScrollLeft > 1

  showControls.value = hasOverflow
  canScrollPrev.value = hasOverflow && scrollLeft > 1
  canScrollNext.value = hasOverflow && maxScrollLeft - scrollLeft > 1
}

function scheduleMeasure() {
  cancelScheduledMeasure()
  frameId = requestAnimationFrame(() => {
    frameId = 0
    updateScrollState()
  })
}

function getScrollStep() {
  const container = scrollableInnerRef.value
  if (!container)
    return 0

  return Math.max(container.clientWidth * 0.8, 120)
}

function scrollTabs(direction: 'previous' | 'next') {
  const container = scrollableInnerRef.value
  if (!container || !showControls.value)
    return

  const offset = getScrollStep() * (direction === 'next' ? 1 : -1)
  container.scrollBy({
    left: offset,
    behavior: 'smooth',
  })
}

function isActive(tab: TabItem) {
  return props.modelValue === tab.value
}

function scrollTabIntoView(value: string) {
  const container = scrollableInnerRef.value
  if (!container || !value)
    return

  const tabElement = container.querySelector<HTMLElement>(`[data-tab-value="${CSS.escape(value)}"]`)
  if (!tabElement)
    return

  const containerLeft = container.scrollLeft
  const containerRight = containerLeft + container.clientWidth
  const elementLeft = tabElement.offsetLeft
  const elementRight = elementLeft + tabElement.offsetWidth

  if (elementLeft < containerLeft) {
    container.scrollTo({
      left: elementLeft,
      behavior: 'smooth',
    })
    return
  }

  if (elementRight > containerRight) {
    container.scrollTo({
      left: elementRight - container.clientWidth,
      behavior: 'smooth',
    })
  }
}

function handleTabClick(tab: TabItem) {
  emit('update:modelValue', tab.value)
  emit('tabClick', tab)
  scrollTabIntoView(tab.value)
}

function handleTabRemove(tab: TabItem, event: MouseEvent) {
  event.stopPropagation()
  emit('tabRemove', tab)
}

onMounted(() => {
  const container = scrollableInnerRef.value
  if (!container)
    return

  resizeObserver = new ResizeObserver(() => {
    scheduleMeasure()
  })

  resizeObserver.observe(container)
  mutationObserver = new MutationObserver(() => {
    scheduleMeasure()
  })
  mutationObserver.observe(container, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  scheduleMeasure()
  scrollTabIntoView(props.modelValue)
})

onBeforeUnmount(() => {
  cancelScheduledMeasure()
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
})

watch(() => props.tabs, async () => {
  await nextTick()
  scheduleMeasure()
  scrollTabIntoView(props.modelValue)
}, { deep: true })

watch(() => props.modelValue, async (value) => {
  await nextTick()
  scrollTabIntoView(value)
})
</script>

<template>
  <div class="scrollable-outer">
    <slot name="previous">
      <div
        v-show="showControls"
        class="tab-item previous"
        :class="{ disabled: !canScrollPrev }"
        @click="scrollTabs('previous')"
      >
        <svg width="1em" height="1em" viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m15 18l-6-6l6-6"
          />
        </svg>
      </div>
    </slot>
    <div
      ref="scrollableInnerRef"
      class="scrollable-inner"
      @scroll.passive="scheduleMeasure"
    >
      <slot
        v-for="tab in tabs"
        :key="tab.value"
        name="tab"
        :tab="tab"
        :active="isActive(tab)"
        :on-click="() => handleTabClick(tab)"
        :on-remove="(event: MouseEvent) => handleTabRemove(tab, event)"
      >
        <div
          class="tab-item"
          :class="{ active: isActive(tab) }"
          :data-tab-value="tab.value"
          @click="handleTabClick(tab)"
        >
          {{ tab.label }}
          <span class="close-icon" @click="handleTabRemove(tab, $event)">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18 6L6 18M6 6l12 12"
              />
            </svg>
          </span>
        </div>
      </slot>
    </div>
    <slot name="next">
      <div
        v-show="showControls"
        class="tab-item next"
        :class="{ disabled: !canScrollNext }"
        @click="scrollTabs('next')"
      >
        <svg width="1em" height="1em" viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m9 18l6-6l-6-6"
            stroke-width="2"
          />
        </svg>
      </div>
    </slot>
  </div>
</template>

<style scoped>
@import url('./style.css');
</style>
