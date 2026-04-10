import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { MonacoEditorInsertTag } from '../editor'

export interface TagTokenController {
  insertTag: (tag: MonacoEditorInsertTag) => void
  dispose: () => void
}

const legacyTagRegex = /\{\{[^{}\n]+\}\}/g
const commentTagPrefix = '/*__MONACO_TAG__'
const commentTagSuffix = '__*/'
const commentTagRegex = /\/\*__MONACO_TAG__[\s\S]*?__\*\//g
const classNameRegex = /\s+/

interface ParsedTagToken {
  value: string
  label: string
  type?: MonacoEditorInsertTag['type']
  className?: string
}

function encodeTokenPart(value?: string) {
  return encodeURIComponent(value ?? '')
}

function decodeTokenPart(value?: string) {
  return decodeURIComponent(value ?? '')
}

function serializeTagToken(tag: MonacoEditorInsertTag) {
  const parts = [
    encodeTokenPart(tag.value),
    encodeTokenPart(tag.label),
    tag.type ?? '',
    encodeTokenPart(tag.className),
  ]

  while (parts.length > 1 && !parts[parts.length - 1])
    parts.pop()

  return `${commentTagPrefix}${parts.join('|')}${commentTagSuffix}`
}

function parseTagToken(token: string): ParsedTagToken {
  const content = token.startsWith(commentTagPrefix)
    ? token.slice(commentTagPrefix.length, -commentTagSuffix.length)
    : token.slice(2, -2)
  const [valuePart, labelPart, typePart, classNamePart] = content.split('|')
  const value = decodeTokenPart(valuePart)

  return {
    value,
    label: decodeTokenPart(labelPart) || value,
    type: (typePart || undefined) as MonacoEditorInsertTag['type'],
    className: decodeTokenPart(classNamePart) || undefined,
  }
}

function getInlineClassName(parsedTag: ParsedTagToken) {
  const classes = ['monaco-editor-inline-tag']

  if (parsedTag.type)
    classes.push(`monaco-editor-inline-tag--${parsedTag.type}`)

  if (parsedTag.className)
    classes.push(...parsedTag.className.split(classNameRegex).filter(Boolean))

  return classes.join(' ')
}

function collectTagMatches(lineContent: string) {
  const matches: Array<{ index: number, text: string }> = []

  for (const pattern of [legacyTagRegex, commentTagRegex]) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(lineContent))) {
      matches.push({
        index: match.index,
        text: match[0],
      })
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}

function findTagRangeAtPosition(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  position: Monaco.Position,
  direction: 'backspace' | 'delete',
) {
  const lineContent = model.getLineContent(position.lineNumber)
  const matches = collectTagMatches(lineContent)

  for (const match of matches) {
    const startColumn = match.index + 1
    const endColumn = match.index + match.text.length + 1
    const isInside = position.column > startColumn && position.column < endColumn
    const isBackspaceEdge = direction === 'backspace' && position.column === endColumn
    const isDeleteEdge = direction === 'delete' && position.column === startColumn

    if (isInside || isBackspaceEdge || isDeleteEdge) {
      return new monaco.Range(position.lineNumber, startColumn, position.lineNumber, endColumn)
    }
  }

  return null
}

function createTokenDecorations(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
) {
  const decorations: Monaco.editor.IModelDeltaDecoration[] = []

  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
    const lineContent = model.getLineContent(lineNumber)
    const matches = collectTagMatches(lineContent)

    for (const match of matches) {
      const parsedTag = parseTagToken(match.text)

      decorations.push({
        range: new monaco.Range(
          lineNumber,
          match.index + 1,
          lineNumber,
          match.index + match.text.length + 1,
        ),
        options: {
          inlineClassName: 'monaco-editor-inline-tag-source',
          inlineClassNameAffectsLetterSpacing: true,
          after: {
            content: parsedTag.label,
            inlineClassName: getInlineClassName(parsedTag),
            inlineClassNameAffectsLetterSpacing: true,
            cursorStops: monaco.editor.InjectedTextCursorStops.None,
          },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })
    }
  }

  return decorations
}

export function createTagTokenController(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
): TagTokenController {
  const decorations = editor.createDecorationsCollection()

  function deleteTagIfNeeded(direction: 'backspace' | 'delete') {
    const model = editor.getModel()
    const position = editor.getPosition()
    const selection = editor.getSelection()
    if (!model || !position || !selection || !selection.isEmpty())
      return false

    const range = findTagRangeAtPosition(monaco, model, position, direction)
    if (!range)
      return false

    editor.executeEdits('delete-tag-token', [{
      range,
      text: '',
      forceMoveMarkers: true,
    }])

    editor.setPosition(range.getStartPosition())
    syncDecorations()
    return true
  }

  function syncDecorations() {
    const model = editor.getModel()
    if (!model) {
      decorations.clear()
      return
    }

    decorations.set(createTokenDecorations(monaco, model))
  }

  const disposables = [
    editor.onDidChangeModel(syncDecorations),
    editor.onDidChangeModelContent(syncDecorations),
  ]

  editor.addCommand(monaco.KeyCode.Backspace, () => {
    if (deleteTagIfNeeded('backspace'))
      return

    editor.trigger('keyboard', 'deleteLeft', null)
  })

  editor.addCommand(monaco.KeyCode.Delete, () => {
    if (deleteTagIfNeeded('delete'))
      return

    editor.trigger('keyboard', 'deleteRight', null)
  })

  syncDecorations()

  return {
    insertTag(tag) {
      const model = editor.getModel()
      if (!model)
        return

      const selection = editor.getSelection()
      const range = selection ?? new monaco.Range(1, 1, 1, 1)
      const text = serializeTagToken(tag)

      editor.executeEdits('insert-tag-token', [{
        range,
        text,
        forceMoveMarkers: true,
      }])

      editor.setPosition(new monaco.Position(range.startLineNumber, range.startColumn + text.length))
      editor.focus()
      syncDecorations()
    },
    dispose() {
      for (const disposable of disposables)
        disposable.dispose()
      decorations.clear()
    },
  }
}
