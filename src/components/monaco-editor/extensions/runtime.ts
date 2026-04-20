import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoEditorProps } from '../editor'
import type { DerivationController } from './derivation'
import type { FindWidgetHackController } from './find-widget-hack'
import type { GlobalDeclarationsController } from './globals'
import type { PlaceholderController } from './placeholder'
import type { SnippetController } from './snippet'
import type { TagTokenController } from './tag-tokens'
import { bindEditorExtensions } from './bindings'
import { createDerivationController } from './derivation'
import { createFindWidgetHackController } from './find-widget-hack'
import { createGlobalDeclarationsController } from './globals'
import { createPlaceholderController } from './placeholder'
import { createSnippetController } from './snippet'
// import { createTagTokenController } from './tag-tokens'

export interface EditorExtensionControllerMap {
  derivation: DerivationController
  findWidgetHack: FindWidgetHackController
  globals: GlobalDeclarationsController
  placeholder: PlaceholderController
  snippet: SnippetController
  tagTokens: TagTokenController
}

export interface EditorExtensionRuntimeContext {
  editor: Monaco.editor.IStandaloneCodeEditor
  model: Monaco.editor.ITextModel
  monaco: typeof Monaco
  props: MonacoEditorProps
}

export interface EditorExtensionRuntime {
  get: <Key extends keyof EditorExtensionControllerMap>(key: Key) => EditorExtensionControllerMap[Key] | null
  dispose: () => void
}

type EditorExtensionKey = keyof EditorExtensionControllerMap
type EditorExtensionController = EditorExtensionControllerMap[EditorExtensionKey]

interface EditorExtensionFactory<Key extends EditorExtensionKey = EditorExtensionKey> {
  key: Key
  create: (context: EditorExtensionRuntimeContext) => EditorExtensionControllerMap[Key]
}

const extensionFactories: EditorExtensionFactory[] = [
  {
    key: 'placeholder',
    create: ({ editor, monaco, props }) => createPlaceholderController(editor, monaco, props.placeholder),
  },
  {
    key: 'snippet',
    create: ({ editor, monaco }) => createSnippetController(editor, monaco),
  },
  // {
  //   key: 'tagTokens',
  //   create: ({ editor, monaco }) => createTagTokenController(editor, monaco),
  // },
  {
    key: 'derivation',
    create: ({ monaco, props }) => createDerivationController(monaco, props.derivations),
  },
  {
    key: 'globals',
    create: ({ monaco, props }) => createGlobalDeclarationsController(monaco, props.globals),
  },
  {
    key: 'findWidgetHack',
    create: ({ editor }) => createFindWidgetHackController(editor),
  },
]

export function createEditorExtensionRuntime(
  context: EditorExtensionRuntimeContext,
): EditorExtensionRuntime {
  const controllers = new Map<EditorExtensionKey, EditorExtensionController>()

  for (const factory of extensionFactories)
    controllers.set(factory.key, factory.create(context))

  const disposeBindings = bindEditorExtensions(context.props, {
    monaco: context.monaco,
    getController: key => getController(key),
    getEditor: () => context.editor,
    getModel: () => context.model,
  })

  function getController<Key extends EditorExtensionKey>(
    key: Key,
  ): EditorExtensionControllerMap[Key] | null {
    return (controllers.get(key) as EditorExtensionControllerMap[Key] | undefined) ?? null
  }

  return {
    get: getController,
    dispose() {
      disposeBindings()

      const activeControllers = Array.from(controllers.values()).reverse()
      controllers.clear()

      for (const controller of activeControllers)
        controller.dispose()
    },
  }
}
