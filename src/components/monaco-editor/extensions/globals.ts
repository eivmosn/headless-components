import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoGlobalVariable } from '../editor'

export interface GlobalDeclarationsController {
  update: (globals?: MonacoGlobalVariable[]) => void
  dispose: () => void
}

const defaultLanguages = ['typescript', 'javascript']

function escapeComment(value: string) {
  return value.replace(/\*\//g, '*\\/')
}

function createDeclaration(globalVariable: MonacoGlobalVariable) {
  const description = globalVariable.description
    ? `/**\n * ${escapeComment(globalVariable.description).split('\n').join('\n * ')}\n */\n`
    : ''

  return `${description}declare ${globalVariable.kind ?? 'const'} ${globalVariable.name}: ${globalVariable.type};`
}

function groupGlobalsByLanguage(globals: MonacoGlobalVariable[]) {
  const grouped = new Map<string, MonacoGlobalVariable[]>()

  for (const globalVariable of globals) {
    const languages = globalVariable.languages?.length
      ? globalVariable.languages
      : defaultLanguages

    for (const language of languages) {
      const items = grouped.get(language) ?? []
      items.push(globalVariable)
      grouped.set(language, items)
    }
  }

  return grouped
}

function getLanguageDefaults(monaco: typeof Monaco, language: string) {
  const typescriptApi = monaco.languages.typescript as unknown as {
    javascriptDefaults: {
      addExtraLib: (content: string, filePath?: string) => Monaco.IDisposable
    }
    typescriptDefaults: {
      addExtraLib: (content: string, filePath?: string) => Monaco.IDisposable
    }
  }

  return language === 'javascript'
    ? typescriptApi.javascriptDefaults
    : typescriptApi.typescriptDefaults
}

export function createGlobalDeclarationsController(
  monaco: typeof Monaco,
  globals: MonacoGlobalVariable[] = [],
): GlobalDeclarationsController {
  let disposables: Monaco.IDisposable[] = []

  function apply(nextGlobals: MonacoGlobalVariable[]) {
    const grouped = groupGlobalsByLanguage(nextGlobals)

    disposables = Array.from(grouped.entries()).map(([language, items], index) => {
      const source = `${items.map(createDeclaration).join('\n\n')}\n`
      const uri = `ts:monaco-editor/globals/${language}-${index}.d.ts`

      return getLanguageDefaults(monaco, language).addExtraLib(source, uri)
    })
  }

  function clear() {
    for (const disposable of disposables)
      disposable.dispose()
    disposables = []
  }

  apply(globals)

  return {
    update(nextGlobals = []) {
      clear()
      apply(nextGlobals)
    },
    dispose() {
      clear()
    },
  }
}
