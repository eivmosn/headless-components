import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export interface MonacoSnippetSuggestion {
  label: string
  insertText: string
  detail?: string
  documentation?: string
  kind?: Monaco.languages.CompletionItemKind
}

export interface SnippetControllerOptions {
  suggestions?: MonacoSnippetSuggestion[]
  languages?: string[]
}

export interface SnippetController {
  update: (options?: SnippetControllerOptions) => void
  dispose: () => void
}

export const suggestions: MonacoSnippetSuggestion[] = [
  {
    label: 'dayjs()',
    insertText: 'dayjs($1)',
    detail: 'dayjs 日期JS方法',
    documentation: `dayjs 文档: https://day.js.org/docs/zh-CN/get-set/get-set`,
  },
]

function normalizeSuggestions(
  monaco: typeof Monaco,
  data: MonacoSnippetSuggestion[],
): Array<Omit<Monaco.languages.CompletionItem, 'range'>> {
  return data.map(suggestion => ({
    label: suggestion.label,
    insertText: suggestion.insertText,
    detail: suggestion.detail,
    documentation: suggestion.documentation,
    kind: suggestion.kind ?? monaco.languages.CompletionItemKind.Function,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  }))
}

function resolveLanguages(
  editor: Monaco.editor.IStandaloneCodeEditor,
  languages?: string[],
) {
  if (languages?.length)
    return [...new Set(languages)]

  const modelLanguage = editor.getModel()?.getLanguageId()
  return modelLanguage ? [modelLanguage] : ['typescript', 'javascript']
}

export function createSnippetController(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
  options: SnippetControllerOptions = {},
): SnippetController {
  let disposables: Monaco.IDisposable[] = []
  let currentOptions = options

  function registerProviders() {
    const completionItems = normalizeSuggestions(monaco, currentOptions.suggestions ?? suggestions)
    const languages = resolveLanguages(editor, currentOptions.languages)

    disposables = languages.map(language =>
      monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          )

          return {
            suggestions: completionItems.map(item => ({
              ...item,
              range,
            })),
          }
        },
      }),
    )
  }

  function clearProviders() {
    for (const disposable of disposables)
      disposable.dispose()
    disposables = []
  }

  registerProviders()

  return {
    update(nextOptions = {}) {
      currentOptions = {
        ...currentOptions,
        ...nextOptions,
      }
      clearProviders()
      registerProviders()
    },
    dispose() {
      clearProviders()
    },
  }
}
