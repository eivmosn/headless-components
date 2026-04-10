import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoEditorProps } from '../editor'
import type { DerivationController } from './derivation'
import type { GlobalDeclarationsController } from './globals'
import type { PlaceholderController } from './placeholder'
import { nextTick, watch } from 'vue'

export interface EditorBindingContext {
  monaco: typeof Monaco
  getDerivationController: () => DerivationController | null
  getEditor: () => Monaco.editor.IStandaloneCodeEditor | null
  getModel: () => Monaco.editor.ITextModel | null
  getGlobalDeclarationsController: () => GlobalDeclarationsController | null
  getPlaceholderController: () => PlaceholderController | null
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
    context.getPlaceholderController()?.update(placeholder)
  })

  const stopGlobalsWatch = watch(() => props.globals, (globals) => {
    context.getGlobalDeclarationsController()?.update(globals)
  }, { deep: true })

  const stopDerivationsWatch = watch(() => props.derivations, (derivations) => {
    context.getDerivationController()?.update(derivations)
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
