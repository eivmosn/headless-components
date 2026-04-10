<script setup lang="ts">
import type { MonacoEditorProps } from './editor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ensureMonacoEnvironment, monaco } from './editor'
import {
  bindEditorExtensions,
  createDerivationController,
  createFindWidgetHackController,
  createGlobalDeclarationsController,
  createPlaceholderController,
  createSnippetController,
} from './extensions'

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
let derivationController: ReturnType<typeof createDerivationController> | null = null
let findWidgetHackController: ReturnType<typeof createFindWidgetHackController> | null = null
let placeholderController: ReturnType<typeof createPlaceholderController> | null = null
let snippetController: ReturnType<typeof createSnippetController> | null = null
let globalDeclarationsController: ReturnType<typeof createGlobalDeclarationsController> | null = null
let disposeExtensionBindings: (() => void) | null = null
let isSyncingFromOutside = false

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

  placeholderController = createPlaceholderController(editor, monaco, props.placeholder)
  snippetController = createSnippetController(editor, monaco)
  derivationController = createDerivationController(monaco, props.derivations)
  globalDeclarationsController = createGlobalDeclarationsController(monaco, props.globals)
  findWidgetHackController = createFindWidgetHackController(editor)
  disposeExtensionBindings = bindEditorExtensions(props, {
    monaco,
    getDerivationController: () => derivationController,
    getEditor: () => editor,
    getGlobalDeclarationsController: () => globalDeclarationsController,
    getModel: () => model,
    getPlaceholderController: () => placeholderController,
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(container)
}

function disposeEditor() {
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeExtensionBindings?.()
  disposeExtensionBindings = null
  derivationController?.dispose()
  derivationController = null
  findWidgetHackController?.dispose()
  findWidgetHackController = null
  globalDeclarationsController?.dispose()
  globalDeclarationsController = null
  snippetController?.dispose()
  snippetController = null
  placeholderController?.dispose()
  placeholderController = null
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
</style>
