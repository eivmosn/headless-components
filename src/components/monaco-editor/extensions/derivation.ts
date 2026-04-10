import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type {
  MonacoDerivationField,
  MonacoDerivationFunction,
  MonacoDerivationObject,
  MonacoDerivationValue,
  MonacoDerivationVariable,
} from '../editor'

export interface DerivationController {
  update: (derivations?: MonacoDerivationVariable[]) => void
  dispose: () => void
}

const defaultLanguages = ['typescript', 'javascript']

function escapeComment(value: string) {
  return value.replace(/\*\//g, '*\\/')
}

function toInterfaceName(name: string, suffix: string) {
  const normalized = name
    .replace(/[^\w$]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(segment => `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`)
    .join('')

  return `${normalized || 'Anonymous'}${suffix}`
}

function isPlainObject(value: MonacoDerivationValue): value is MonacoDerivationObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFunction(value: MonacoDerivationValue): value is (...args: any[]) => any {
  return typeof value === 'function'
}

function isDerivationField(value: MonacoDerivationValue): value is MonacoDerivationField {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && value.$type === 'value'
}

function isDerivationFunction(value: MonacoDerivationValue): value is MonacoDerivationFunction {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && value.$type === 'function'
}

function inferPrimitiveType(value: MonacoDerivationValue) {
  if (value === null)
    return 'null'
  if (typeof value === 'string')
    return 'string'
  if (typeof value === 'number')
    return 'number'
  if (typeof value === 'boolean')
    return 'boolean'
  if (typeof value === 'undefined')
    return 'undefined'
  return 'unknown'
}

function inferFunctionType(value: (...args: any[]) => any) {
  const params = Array.from({ length: value.length }, (_, index) => `arg${index + 1}: any`).join(', ')
  return `(${params}) => unknown`
}

function inferFunctionDescriptorType(value: MonacoDerivationFunction) {
  if (value.params?.length) {
    const params = value.params
      .map(param => `${param.name}${param.optional ? '?' : ''}: ${param.type ?? 'any'}`)
      .join(', ')
    return `(${params}) => ${value.returns ?? 'unknown'}`
  }

  if (value.value)
    return inferFunctionType(value.value).replace('unknown', value.returns ?? 'unknown')

  return `() => ${value.returns ?? 'unknown'}`
}

function createJSDoc(description?: string) {
  if (!description)
    return ''

  return `/**\n * ${escapeComment(description).split('\n').join('\n * ')}\n */\n`
}

function createFunctionJSDoc(value: MonacoDerivationFunction) {
  const lines: string[] = []

  if (value.description)
    lines.push(...escapeComment(value.description).split('\n'))

  for (const param of value.params ?? []) {
    lines.push(`@param ${param.name} ${escapeComment(param.description ?? '')}`.trimEnd())
  }

  if (value.returns)
    lines.push(`@returns ${escapeComment(value.returns)}`)

  if (!lines.length)
    return ''

  return `/**\n * ${lines.join('\n * ')}\n */\n`
}

function createMemberLine(key: string, type: string, description?: string) {
  const member = `${JSON.stringify(key)}: ${type};`
  return description
    ? `${createJSDoc(description)}  ${member}`.trimEnd()
    : `  ${member}`
}

function inferType(
  value: MonacoDerivationValue,
  path: string,
  declarations: string[],
): string {
  if (isDerivationField(value)) {
    if (value.as)
      return value.as
    return inferType(value.value, path, declarations)
  }

  if (Array.isArray(value)) {
    if (!value.length)
      return 'unknown[]'

    const elementTypes = Array.from(new Set(value.map((item, index) => inferType(item, `${path}Item${index}`, declarations))))
    return elementTypes.length === 1
      ? `${elementTypes[0]}[]`
      : `Array<${elementTypes.join(' | ')}>`
  }

  if (isDerivationFunction(value))
    return inferFunctionDescriptorType(value)

  if (isFunction(value))
    return inferFunctionType(value)

  if (isPlainObject(value)) {
    const interfaceName = toInterfaceName(path, 'Shape')
    const members = Object.entries(value).map(([key, item]) => {
      const memberType = inferType(item, `${path}${key}`, declarations)
      if (isDerivationFunction(item))
        return `${createFunctionJSDoc(item)}  ${JSON.stringify(key)}: ${memberType};`
      if (isDerivationField(item))
        return createMemberLine(key, memberType, item.description)
      return `  ${JSON.stringify(key)}: ${memberType};`
    })

    declarations.push(`interface ${interfaceName} {\n${members.join('\n')}\n}`)
    return interfaceName
  }

  return inferPrimitiveType(value)
}

function groupByLanguage(derivations: MonacoDerivationVariable[]) {
  const grouped = new Map<string, MonacoDerivationVariable[]>()

  for (const derivation of derivations) {
    const languages = derivation.languages?.length ? derivation.languages : defaultLanguages
    for (const language of languages) {
      const items = grouped.get(language) ?? []
      items.push(derivation)
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

function createLibrarySource(derivations: MonacoDerivationVariable[]) {
  const declarations: string[] = []
  const variables = derivations.map((derivation) => {
    const type = inferType(derivation.value, derivation.name, declarations)
    const doc = createJSDoc(derivation.description)
    return `${doc}declare ${derivation.kind ?? 'const'} ${derivation.name}: ${type};`
  })

  return `${declarations.join('\n\n')}\n\n${variables.join('\n\n')}\n`
}

export function createDerivationController(
  monaco: typeof Monaco,
  derivations: MonacoDerivationVariable[] = [],
): DerivationController {
  let disposables: Monaco.IDisposable[] = []

  function apply(nextDerivations: MonacoDerivationVariable[]) {
    const grouped = groupByLanguage(nextDerivations)
    disposables = Array.from(grouped.entries()).map(([language, items], index) => {
      const uri = `ts:monaco-editor/derivations/${language}-${index}.d.ts`
      return getLanguageDefaults(monaco, language).addExtraLib(createLibrarySource(items), uri)
    })
  }

  function clear() {
    for (const disposable of disposables)
      disposable.dispose()
    disposables = []
  }

  apply(derivations)

  return {
    update(nextDerivations = []) {
      clear()
      apply(nextDerivations)
    },
    dispose() {
      clear()
    },
  }
}
