import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker'

import 'monaco-editor/esm/nls.messages.zh-cn.js'
import 'monaco-editor/esm/vs/editor/editor.main.js'

export interface MonacoGlobalVariable {
  name: string
  type: string
  description?: string
  kind?: 'const' | 'let' | 'var'
  languages?: string[]
}

export interface MonacoDerivationParameter {
  name: string
  type?: string
  description?: string
  optional?: boolean
}

export interface MonacoDerivationFunction {
  $type: 'function'
  description?: string
  params?: MonacoDerivationParameter[]
  returns?: string
  value?: (...args: any[]) => any
}

export interface MonacoDerivationField {
  $type: 'value'
  value: MonacoDerivationValue
  description?: string
  as?: string
}

export type MonacoDerivationValue
  = | string
    | number
    | boolean
    | null
    | undefined
    | ((...args: any[]) => any)
    | MonacoDerivationField
    | MonacoDerivationFunction
    | MonacoDerivationObject
    | MonacoDerivationValue[]

export interface MonacoDerivationObject {
  [key: string]: MonacoDerivationValue
}

export interface MonacoDerivationVariable {
  name: string
  value: MonacoDerivationValue
  description?: string
  kind?: 'const' | 'let' | 'var'
  languages?: string[]
}

export interface MonacoEditorInsertTag {
  value: string
  label?: string
  type?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

export interface MonacoEditorProps {
  modelValue?: string
  language?: string
  theme?: string
  height?: string
  placeholder?: string
  derivations?: MonacoDerivationVariable[]
  globals?: MonacoGlobalVariable[]
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

export interface MonacoEditorInstance {
  focus: () => void
  insertTag: (tag: MonacoEditorInsertTag) => void
}

export function ensureMonacoEnvironment() {
  ;(globalThis as typeof globalThis & { MonacoEnvironment?: { getWorker: (_: unknown, label: string) => Worker } }).MonacoEnvironment = {
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

export const languages = monaco.languages

export { monaco }
