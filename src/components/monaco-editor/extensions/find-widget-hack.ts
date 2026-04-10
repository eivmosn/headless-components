import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export interface FindWidgetHackController {
  dispose: () => void
}

const blockedSelectors = '.codicon-find-selection, .codicon-widget-close'

function shouldBlock(target: EventTarget | null, container: HTMLElement) {
  if (!(target instanceof Element))
    return false

  const matched = target.closest(blockedSelectors)
  return !!matched && container.contains(matched)
}

export function createFindWidgetHackController(
  editor: Monaco.editor.IStandaloneCodeEditor,
): FindWidgetHackController {
  const container = editor.getContainerDomNode()

  const stopHoverTrigger = (event: Event) => {
    if (!shouldBlock(event.target, container))
      return

    event.stopImmediatePropagation()
    event.stopPropagation()
  }

  const removeTitle = (event: Event) => {
    if (!(event.target instanceof Element))
      return

    const matched = event.target.closest(blockedSelectors)
    if (!(matched instanceof HTMLElement) || !container.contains(matched))
      return

    matched.removeAttribute('title')
  }

  container.addEventListener('mouseenter', stopHoverTrigger, true)
  container.addEventListener('mouseover', stopHoverTrigger, true)
  container.addEventListener('mousemove', removeTitle, true)

  return {
    dispose() {
      container.removeEventListener('mouseenter', stopHoverTrigger, true)
      container.removeEventListener('mouseover', stopHoverTrigger, true)
      container.removeEventListener('mousemove', removeTitle, true)
    },
  }
}
