import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoEditorProps } from '../editor'
import type { EditorExtensionControllerMap } from './runtime'
import { nextTick, watch } from 'vue'

export interface EditorBindingContext {
  monaco: typeof Monaco
  getEditor: () => Monaco.editor.IStandaloneCodeEditor | null
  getModel: () => Monaco.editor.ITextModel | null
  getController: <Key extends keyof EditorExtensionControllerMap>(
    key: Key
  ) => EditorExtensionControllerMap[Key] | null
}

export function bindEditorExtensions(
  props: MonacoEditorProps,
  context: EditorBindingContext,
) {
  const stopLanguageWatch = watch(() => props.language, async (language) => {
    const model = context.getModel()
    if (!model || !language)
      return

    context.monaco.editor.setModelLanguage(model, language)
    await nextTick()
    context.getEditor()?.layout()
  })

  const stopThemeWatch = watch(() => props.theme, (theme) => {
    if (!theme)
      return
    context.monaco.editor.setTheme(theme)
  })

  const stopOptionsWatch = watch(() => props.options, (options) => {
    if (!options)
      return
    context.getEditor()?.updateOptions(options)
  }, { deep: true })

  const stopPlaceholderWatch = watch(() => props.placeholder, (placeholder) => {
    context.getController('placeholder')?.update(placeholder)
  })

  const stopGlobalsWatch = watch(() => props.globals, (globals) => {
    context.getController('globals')?.update(globals)
  }, { deep: true })

  const stopDerivationsWatch = watch(() => props.derivations, (derivations) => {
    context.getController('derivation')?.update(derivations)
  }, { deep: true })

  return () => {
    stopLanguageWatch()
    stopThemeWatch()
    stopOptionsWatch()
    stopPlaceholderWatch()
    stopGlobalsWatch()
    stopDerivationsWatch()
  }
}
