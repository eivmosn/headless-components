<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import MobileKeyboard from './index.vue'

const value = shallowRef('')
const keyboardVisible = shallowRef(false)
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

function syncCursor(position: number) {
  requestAnimationFrame(() => {
    inputRef.value?.focus()
    inputRef.value?.setSelectionRange(position, position)
  })
}

function insertAtCursor(inputValue: string) {
  const input = inputRef.value
  const start = input?.selectionStart ?? value.value.length
  const end = input?.selectionEnd ?? start

  value.value = `${value.value.slice(0, start)}${inputValue}${value.value.slice(end)}`
  syncCursor(start + inputValue.length)
}

function deleteAtCursor() {
  const input = inputRef.value
  const start = input?.selectionStart ?? value.value.length
  const end = input?.selectionEnd ?? start

  if (start !== end) {
    value.value = `${value.value.slice(0, start)}${value.value.slice(end)}`
    syncCursor(start)
    return
  }

  if (start <= 0)
    return

  value.value = `${value.value.slice(0, start - 1)}${value.value.slice(start)}`
  syncCursor(start - 1)
}

function showKeyboard() {
  keyboardVisible.value = true
}

function hideKeyboard() {
  keyboardVisible.value = false
  inputRef.value?.blur()
}
</script>

<template>
  <main class="keyboard-demo">
    <section class="phone-shell">
      <div class="field-card">
        <label class="field-label" for="plate-input">车牌号码</label>
        <input
          id="plate-input"
          ref="inputRef"
          v-model="value"
          class="plate-input"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          inputmode="none"
          placeholder="点击输入车牌"
          spellcheck="false"
          type="text"
          @beforeinput.prevent
          @focus="showKeyboard"
          @click="showKeyboard"
          @keydown.prevent
          @paste.prevent
        >
      </div>

      <p class="hint">
        点击输入框唤起自定义键盘，点击完成收起。
      </p>
    </section>

    <MobileKeyboard
      v-model="value"
      :visible="keyboardVisible"
      :mutate-model="false"
      @delete="deleteAtCursor"
      @done="hideKeyboard"
      @press="insertAtCursor"
    />
  </main>
</template>

<style scoped>
.keyboard-demo {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 56px 18px 320px;
  background: #f4f5f8;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.phone-shell {
  width: min(100%, 430px);
  margin: 0 auto;
}

.field-card {
  padding: 18px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.06),
    0 16px 40px rgba(15, 23, 42, 0.08);
}

.field-label {
  display: block;
  margin-bottom: 10px;
  color: #626a79;
  font-size: 14px;
  font-weight: 600;
}

.plate-input {
  width: 100%;
  height: 52px;
  box-sizing: border-box;
  border: 1px solid #d8dee8;
  border-radius: 10px;
  padding: 0 14px;
  background: #fbfcff;
  color: #111111;
  font: 600 20px / 1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
  outline: none;
}

.plate-input::placeholder {
  color: #9aa3b2;
  font-weight: 500;
}

.plate-input:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12);
}

.hint {
  margin: 14px 4px 0;
  color: #7a8291;
  font-size: 13px;
  line-height: 1.5;
}
</style>
