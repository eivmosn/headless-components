<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import './button.css'

const isBusy = ref(false)
const isCircleBusy = ref(false)
const aspectRatio = ref(1)
const circleAspectRatio = ref(1)
const buttonRef = ref<HTMLButtonElement | null>(null)
const circleButtonRef = ref<HTMLButtonElement | null>(null)

const buttonStyle = computed(() => ({
  '--button-aspect-ratio': aspectRatio.value,
}))

const circleButtonStyle = computed(() => ({
  '--button-aspect-ratio': circleAspectRatio.value,
}))

function toggleBusy() {
  isBusy.value = !isBusy.value
}

function toggleCircleBusy() {
  isCircleBusy.value = !isCircleBusy.value
}

onMounted(() => {
  const button = buttonRef.value
  if (button)
    aspectRatio.value = button.clientWidth / button.clientHeight

  const circleButton = circleButtonRef.value
  if (circleButton)
    circleAspectRatio.value = circleButton.clientWidth / circleButton.clientHeight
})
</script>

<template>
  <div class="h-full flex items-center justify-center gap-4">
    <button
      ref="buttonRef"
      class="button button--light"
      :class="{ 'is-busy': isBusy }"
      :style="buttonStyle"
      type="button"
      @click="toggleBusy"
    >
      <span class="button__content">
        <span
          :role="isBusy ? 'progressbar' : undefined"
          :aria-hidden="!isBusy"
        >
          {{ isBusy ? 'Uploading' : 'Upload' }}
        </span>
      </span>
      <span aria-hidden="true" class="button__disco" />
    </button>

    <button
      ref="circleButtonRef"
      class="button button--light button--circle"
      :class="{ 'is-busy': isCircleBusy }"
      :style="circleButtonStyle"
      type="button"
      aria-label="Upload"
      @click="toggleCircleBusy"
    >
      <span class="button__content">
        <span
          :role="isCircleBusy ? 'progressbar' : undefined"
          :aria-hidden="!isCircleBusy"
          class="button__icon"
        >
          {{ isCircleBusy ? '···' : '↑' }}
        </span>
      </span>
      <span aria-hidden="true" class="button__disco" />
    </button>
  </div>
</template>
