<!-- <script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from './editor/esm/vs/editor/editor.api.js'
import EditorWorker from './editor/esm/vs/editor/editor.worker.js?worker'

import CssWorker from './editor/esm/vs/language/css/css.worker.js?worker'
import HtmlWorker from './editor/esm/vs/language/html/html.worker.js?worker'
import JsonWorker from './editor/esm/vs/language/json/json.worker.js?worker'
import TsWorker from './editor/esm/vs/language/typescript/ts.worker.js?worker'
import './editor/esm/vs/editor/editor.main.js'

interface MonacoEditorProps {
  modelValue?: string
  language?: string
  theme?: string
  height?: string
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

const props = withDefaults(defineProps<MonacoEditorProps>(), {
  modelValue: '',
  language: 'typescript',
  theme: 'vs',
  height: '360px',
  options: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null
let resizeObserver: ResizeObserver | null = null
let isSyncingFromOutside = false

function ensureMonacoEnvironment() {
  globalThis.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'json')
        return new JsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less')
        return new CssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor')
        return new HtmlWorker()
      if (label === 'typescript' || label === 'javascript')
        return new TsWorker()
      return new EditorWorker()
    },
  }
}

function createEditor() {
  const container = containerRef.value
  if (!container)
    return

  ensureMonacoEnvironment()

  model = monaco.editor.createModel(props.modelValue, props.language)
  editor = monaco.editor.create(container, {
    automaticLayout: false,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 2,
    theme: props.theme,
    model,
    ...props.options,
  })

  editor.onDidChangeModelContent(() => {
    if (isSyncingFromOutside || !editor)
      return
    emit('update:modelValue', editor.getValue())
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(container)
}

function disposeEditor() {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
  model?.dispose()
  model = null
}

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  disposeEditor()
})

watch(() => props.modelValue, (value) => {
  if (!editor)
    return

  const currentValue = editor.getValue()
  if (currentValue === value)
    return

  isSyncingFromOutside = true
  editor.setValue(value)
  isSyncingFromOutside = false
})

watch(() => props.language, async (language) => {
  if (!model)
    return

  monaco.editor.setModelLanguage(model, language)
  await nextTick()
  editor?.layout()
})

watch(() => props.theme, (theme) => {
  monaco.editor.setTheme(theme)
})

watch(() => props.options, (options) => {
  editor?.updateOptions(options)
}, { deep: true })
</script>

<template>
  <div class="monaco-editor-shell" :style="{ height }">
    <div ref="containerRef" class="monaco-editor-container" />
  </div>
</template>

<style scoped>
.monaco-editor-shell {
  width: 100%;
  min-height: 200px;
  border: 1px solid #d9dde7;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
}
</style> -->
