<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'

type KeyboardMode = 'province' | 'alpha'
type KeyVariant = 'normal' | 'action' | 'delete'

interface KeyboardKey {
  label: string
  value: string
  variant?: KeyVariant
}

const props = withDefaults(defineProps<{
  visible?: boolean
  fixed?: boolean
  mutateModel?: boolean
  initialMode?: KeyboardMode
  doneText?: string
  provinceLabel?: string
  alphaLabel?: string
}>(), {
  visible: true,
  fixed: true,
  mutateModel: true,
  initialMode: 'province',
  doneText: '完成',
  provinceLabel: '省份',
  alphaLabel: 'ABC',
})

const emit = defineEmits<{
  press: [value: string]
  delete: []
  done: [value: string]
  modeChange: [mode: KeyboardMode]
}>()

const model = defineModel<string>({ default: '' })
const mode = shallowRef<KeyboardMode>(props.initialMode)
const pressedKey = shallowRef('')
let releaseTimer: ReturnType<typeof window.setTimeout> | undefined

const provinceRows: KeyboardKey[][] = [
  ['京', '津', '渝', '沪', '冀', '晋', '辽', '吉', '黑', '苏'].map(createKey),
  ['浙', '皖', '闽', '赣', '鲁', '豫', '鄂', '湘', '粤', '琼'].map(createKey),
  ['川', '贵', '云', '陕', '甘', '青', '蒙', '桂', '宁', '新'].map(createKey),
  [
    { label: props.alphaLabel, value: 'mode-alpha', variant: 'action' },
    ...['藏', '使', '领', '警', '学', '港', '澳'].map(createKey),
    { label: 'delete', value: 'delete', variant: 'delete' },
  ],
]

const alphaRows: KeyboardKey[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(createKey),
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(createKey),
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(createKey),
  [
    { label: props.provinceLabel, value: 'mode-province', variant: 'action' },
    ...['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(createKey),
    { label: 'delete', value: 'delete', variant: 'delete' },
  ],
]

const rows = computed(() => mode.value === 'province' ? provinceRows : alphaRows)

watch(() => props.initialMode, (value) => {
  mode.value = value
})

function createKey(value: string): KeyboardKey {
  return {
    label: value,
    value,
  }
}

function setMode(nextMode: KeyboardMode) {
  if (mode.value === nextMode)
    return

  mode.value = nextMode
  emit('modeChange', nextMode)
}

function pressKey(key: KeyboardKey) {
  if (key.variant === 'delete') {
    if (props.mutateModel)
      model.value = model.value.slice(0, -1)

    emit('delete')
    return
  }

  if (key.value === 'mode-alpha') {
    setMode('alpha')
    return
  }

  if (key.value === 'mode-province') {
    setMode('province')
    return
  }

  if (props.mutateModel)
    model.value += key.value

  emit('press', key.value)
}

function getKeyId(key: KeyboardKey, rowIndex: number) {
  return `${mode.value}-${rowIndex}-${key.value}`
}

function holdKey(key: KeyboardKey, rowIndex: number) {
  if (releaseTimer)
    window.clearTimeout(releaseTimer)

  pressedKey.value = getKeyId(key, rowIndex)
}

function releaseKey() {
  if (releaseTimer)
    window.clearTimeout(releaseTimer)

  releaseTimer = window.setTimeout(() => {
    pressedKey.value = ''
  }, 120)
}

function completeInput() {
  emit('done', model.value)
}
</script>

<template>
  <Transition name="keyboard-slide">
    <section
      v-show="visible"
      class="mobile-keyboard"
      :class="{ 'mobile-keyboard--fixed': fixed }"
      :data-mode="mode"
      aria-label="Custom mobile keyboard"
    >
      <div class="keyboard-toolbar">
        <button class="done-button" type="button" @click="completeInput">
          {{ doneText }}
        </button>
      </div>

      <div class="keyboard-pad">
        <div
          v-for="(row, rowIndex) in rows"
          :key="`${mode}-${rowIndex}`"
          class="keyboard-row"
          :class="`keyboard-row--${rowIndex + 1}`"
        >
          <button
            v-for="key in row"
            :key="key.value"
            class="keyboard-key"
            :class="{
              'keyboard-key--action': key.variant === 'action',
              'keyboard-key--delete': key.variant === 'delete',
              'is-pressed': pressedKey === getKeyId(key, rowIndex),
            }"
            type="button"
            @click="pressKey(key)"
            @pointercancel="releaseKey"
            @pointerdown="holdKey(key, rowIndex)"
            @pointerleave="releaseKey"
            @pointerup="releaseKey"
          >
            <span v-if="key.variant !== 'delete'" class="keyboard-key-label">
              {{ key.label }}
            </span>
            <span v-else class="delete-icon" aria-label="删除">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 56 56"><!-- Icon from Framework7 Icons by Vladimir Kharlampidi - https://github.com/framework7io/framework7-icons/blob/master/LICENSE --><path fill="currentColor" d="M46.035 49.574c4.899 0 7.36-2.414 7.36-7.265V13.69c0-4.851-2.461-7.265-7.36-7.265H25.668c-2.742 0-5.11.703-7.031 2.742L4.832 23.512c-1.523 1.57-2.226 2.976-2.226 4.453c0 1.453.68 2.883 2.226 4.453L18.66 46.691c1.946 2.016 4.29 2.86 7.032 2.86Zm-.046-3.773H25.62c-1.781 0-2.883-.422-4.125-1.688L7.762 29.933c-.797-.82-1.031-1.382-1.031-1.968c0-.61.257-1.172 1.03-1.992l13.712-14.227c1.219-1.242 2.367-1.547 4.125-1.547h20.39c2.344 0 3.633 1.242 3.633 3.68V42.12c0 2.438-1.289 3.68-3.633 3.68m-5.883-8.203c1.007 0 1.828-.797 1.828-1.782c0-.492-.211-.914-.563-1.265l-6.562-6.586l6.562-6.563c.352-.351.563-.797.563-1.265c0-1.008-.844-1.852-1.828-1.852c-.47 0-.915.211-1.266.563l-6.563 6.586l-6.585-6.586c-.352-.352-.774-.563-1.266-.563c-.984 0-1.828.844-1.828 1.852c0 .468.21.914.562 1.265l6.563 6.563l-6.563 6.586c-.351.351-.562.773-.562 1.265c0 .985.82 1.782 1.828 1.782c.516 0 .914-.164 1.242-.492l6.61-6.633l6.585 6.633c.328.328.75.492 1.243.492" /></svg>
              <!-- <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512">Icon from CoreUI Free by creativeLabs Łukasz Holeczek - https://creativecommons.org/licenses/by/4.0/<path fill="currentColor" d="M227.313 363.313L312 278.627l84.687 84.686l22.626-22.626L334.627 256l84.686-84.687l-22.626-22.626L312 233.373l-84.687-84.686l-22.626 22.626L289.373 256l-84.686 84.687z" /><path fill="currentColor" d="M472 64H194.644a24.1 24.1 0 0 0-17.42 7.492L16 241.623v28.754l161.224 170.131a24.1 24.1 0 0 0 17.42 7.492H472a24.03 24.03 0 0 0 24-24V88a24.03 24.03 0 0 0-24-24m-8 352H198.084L48 257.623v-3.246L198.084 96H464Z" /></svg> -->
            </span>
          </button>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.mobile-keyboard {
  margin: 0 auto;
  padding: 0 10px max(8px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #d1d5db;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  user-select: none;
  touch-action: manipulation;
  user-select: none;
}

.mobile-keyboard--fixed {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
}

.keyboard-slide-enter-active,
.keyboard-slide-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}

.keyboard-slide-enter-from,
.keyboard-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.keyboard-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 54px;
  margin: 0 -10px;
  padding: 0 18px;
  box-sizing: border-box;
  background: #f8f8f8;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.done-button {
  appearance: none;
  border: 0;
  border-radius: 6px;
  min-width: 56px;
  min-height: 36px;
  padding: 0 8px;
  background: transparent;
  color: #007aff;
  cursor: pointer;
  font: 600 17px / 1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition: background-color 120ms ease, transform 120ms ease;
}

.done-button:active {
  background: rgba(0, 122, 255, 0.1);
  transform: translateY(1px);
}

.done-button:focus-visible,
.keyboard-key:focus-visible {
  outline: 2px solid #007aff;
  outline-offset: 2px;
}

.keyboard-pad {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.keyboard-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.keyboard-row--1,
.keyboard-row--2 {
  grid-template-columns: repeat(10, minmax(0, 1fr));
}

.keyboard-row--3 {
  grid-template-columns: repeat(9, minmax(0, 1fr));
  padding: 0 20px;
}

[data-mode="province"] .keyboard-row--3 {
  grid-template-columns: repeat(10, minmax(0, 1fr));
  padding: 0;
}

.keyboard-row--4 {
  grid-template-columns: 1.52fr repeat(7, minmax(0, 1fr)) 1.52fr;
}

.keyboard-key {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 44px;
  border: 0;
  border-radius: 4px;
  padding: 0;
  background: #ffffff;
  color: #111111;
  cursor: pointer;
  font: 400 26px / 1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.28),
    0 2px 0 rgba(0, 0, 0, 0.08);
  transform: translateY(0);
  transition:
    background-color 80ms ease,
    box-shadow 80ms ease,
    transform 80ms ease;
  -webkit-tap-highlight-color: transparent;
}

[data-mode="province"] .keyboard-key {
  font-size: 24px;
  font-weight: 500;
}

.keyboard-key:active,
.keyboard-key.is-pressed {
  background: #eef0f4;
  transform: translateY(0);
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.24),
    inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.keyboard-key--action,
.keyboard-key--delete {
  background: #b8bec8;
  color: #3c4047;
  font-size: 18px;
  font-weight: 700;
}

.keyboard-key--action:active,
.keyboard-key--delete:active,
.keyboard-key--action.is-pressed,
.keyboard-key--delete.is-pressed {
  background: #aeb4bf;
}

.keyboard-key--action span {
    font-size: 18px;
}

.keyboard-key--delete {
  color: #111111;
}

.keyboard-key-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: clip;
  white-space: nowrap;
}

.delete-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-indicator {
  width: 128px;
  height: 5px;
  margin: 18px auto 8px;
  border-radius: 999px;
  background: #111111;
}

@media (max-width: 374px) {
  .mobile-keyboard {
    padding-inline: 7px;
  }

  .keyboard-row {
    gap: 5px;
  }

  .keyboard-key {
    height: 41px;
    font-size: 23px;
  }

  [data-mode="province"] .keyboard-key {
    font-size: 22px;
  }

  .keyboard-row--3 {
    padding: 0 14px;
  }
}
</style>
