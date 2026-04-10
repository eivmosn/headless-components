import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export interface PlaceholderController {
  update: (placeholder?: string) => void
  dispose: () => void
}

export function createPlaceholderController(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
  placeholder = '',
): PlaceholderController {
  const container = editor.getContainerDomNode()
  const node = document.createElement('div')
  const editorOptions = monaco.editor.EditorOption

  let currentPlaceholder = placeholder

  if (getComputedStyle(container).position === 'static')
    container.style.position = 'relative'

  node.className = 'monaco-editor-placeholder'
  node.setAttribute('aria-hidden', 'true')
  node.style.position = 'absolute'
  node.style.pointerEvents = 'none'
  node.style.zIndex = '3'
  node.style.color = '#98a2b3'
  node.style.whiteSpace = 'pre-wrap'
  node.style.overflow = 'hidden'
  node.style.textOverflow = 'ellipsis'

  container.appendChild(node)

  function syncLayout() {
    const layout = editor.getLayoutInfo()
    const lineHeight = editor.getOption(editorOptions.lineHeight)
    const fontSize = editor.getOption(editorOptions.fontSize)
    const fontFamily = editor.getOption(editorOptions.fontFamily)
    const padding = editor.getOption(editorOptions.padding)

    node.style.top = `${padding.top}px`
    node.style.left = `${layout.contentLeft}px`
    node.style.right = '16px'
    node.style.lineHeight = `${lineHeight}px`
    node.style.fontSize = `${fontSize}px`
    node.style.fontFamily = fontFamily
  }

  function syncVisibility() {
    const isEmpty = editor.getModel()?.getValueLength() === 0
    node.textContent = currentPlaceholder
    node.style.display = currentPlaceholder && isEmpty ? 'block' : 'none'
  }

  const disposables = [
    editor.onDidChangeModelContent(syncVisibility),
    editor.onDidLayoutChange(() => {
      syncLayout()
      syncVisibility()
    }),
    editor.onDidChangeModel(() => {
      syncLayout()
      syncVisibility()
    }),
  ]

  syncLayout()
  syncVisibility()

  return {
    update(nextPlaceholder = '') {
      currentPlaceholder = nextPlaceholder
      syncLayout()
      syncVisibility()
    },
    dispose() {
      for (const disposable of disposables)
        disposable.dispose()
      node.remove()
    },
  }
}
