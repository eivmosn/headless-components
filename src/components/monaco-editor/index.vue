<script setup lang="ts">
import type { MonacoEditorInstance, MonacoEditorProps } from './editor'
import type { EditorExtensionRuntime } from './extensions'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ensureMonacoEnvironment, monaco } from './editor'
import { createEditorExtensionRuntime } from './extensions'

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
let extensionRuntime: EditorExtensionRuntime | null = null
let isSyncingFromOutside = false

function createEditor() {
  const container = containerRef.value
  if (!container)
    return

  ensureMonacoEnvironment()
  const theme = resolveEditorTheme()

  model = createEditorModel()
  editor = monaco.editor.create(container, {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 2,
    theme,
    model,
    fixedOverflowWidgets: true,
    smoothScrolling: true,
    fontSize: 14,
    ...props.options,
  })

  editor.onDidChangeModelContent(() => {
    if (isSyncingFromOutside || !editor)
      return
    emit('update:modelValue', editor.getValue())
  })

  extensionRuntime = createEditorExtensionRuntime({
    editor,
    model,
    monaco,
    props,
  })
}

function createEditorModel() {
  return monaco.editor.createModel(props.modelValue, props.language)
}

function resolveEditorTheme() {
  return props.theme
}

function disposeEditor() {
  extensionRuntime?.dispose()
  extensionRuntime = null
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

watch(() => props.language, (language) => {
  if (!model || !language)
    return
  monaco.editor.setModelLanguage(model, language)
})

defineExpose<MonacoEditorInstance>({
  focus() {
    editor?.focus()
  },
  insertTag(tag) {
    extensionRuntime?.get('tagTokens')?.insertTag(tag)
  },
})
</script>

<template>
  <div class="monaco-editor-shell" :style="{ height }">
    <div ref="containerRef" class="monaco-editor-container" />
  </div>
</template>

<style scoped>
.monaco-editor-shell {
  width: 100%;
  min-height: 220px;
  border: 1px solid #d9dde7;
  /* overflow: hidden; */
  background: #ffffff;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.monaco-editor-inline-tag-source) {
  font-size: 0;
  opacity: 0;
}

:deep(.monaco-editor-inline-tag) {
  background: #e8f1ff;
  color: #1d4ed8;
  border-radius: 999px;
  font-size: 12px;
  padding: 4px 12px;
  box-shadow: inset 0 0 0 1px #a8c5ff;
}

:deep(.monaco-editor-inline-tag--primary) {
  background: #e8f1ff;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px #a8c5ff;
}

:deep(.monaco-editor-inline-tag--success) {
  background: #eafaf0;
  color: #15803d;
  box-shadow: inset 0 0 0 1px #86efac;
}

:deep(.monaco-editor-inline-tag--warning) {
  background: #fff7e6;
  color: #b45309;
  box-shadow: inset 0 0 0 1px #fcd34d;
}

:deep(.monaco-editor-inline-tag--danger) {
  background: #ffecec;
  color: #b91c1c;
  box-shadow: inset 0 0 0 1px #fca5a5;
}
</style>
