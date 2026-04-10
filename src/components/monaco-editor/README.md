# Monaco Editor Extension Guide

This component is built as a thin Vue wrapper around a locally bundled `monaco-editor` instance.
The goal of this structure is to keep `index.vue` small and move Monaco customization into isolated extension modules.

## Architecture

The Monaco editor implementation is split into three layers:

- `editor.ts`
  Defines the shared Monaco runtime, worker setup, localization import, and public component types.
- `index.vue`
  Creates and disposes the editor instance, handles `v-model`, and wires extension controllers into the editor lifecycle.
- `extensions/`
  Contains feature modules for Monaco secondary development. Each module should focus on one behavior only.

## Current Extension Modules

- `placeholder.ts`
  Renders placeholder content when the editor value is empty.
- `snippet.ts`
  Registers snippet completions and exposes them through a controller-style API.
- `globals.ts`
  Injects extra TypeScript/JavaScript declarations with `addExtraLib` so runtime globals are recognized by Monaco.
- `derivation.ts`
  Derives declaration types from plain runtime objects, including nested structures, arrays, fields, and function descriptors.
- `find-widget-hack.ts`
  Applies a narrow DOM-level workaround for Monaco find widget hover behavior.
- `bindings.ts`
  Keeps runtime props such as `language`, `theme`, `placeholder`, `globals`, and `derivations` synchronized after editor creation.

## Extension Design Rules

When adding a new Monaco capability, prefer following these rules:

1. Keep `index.vue` focused on editor lifecycle only.
2. Put feature-specific logic into `extensions/`.
3. Export a controller factory, not loose setup code.
4. Make the controller disposable.
5. Add prop synchronization to `bindings.ts` only if the feature must react to prop changes after mount.

The preferred shape is:

```ts
export interface ExampleController {
  update: (value?: unknown) => void
  dispose: () => void
}

export function createExampleController(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
  initialValue?: unknown,
): ExampleController {
  return {
    update(nextValue) {
      // sync runtime state
    },
    dispose() {
      // cleanup listeners / providers / DOM nodes
    },
  }
}
```

This keeps all extensions consistent with the existing `placeholder`, `snippet`, `globals`, and `derivation` implementations.

## How Extensions Are Registered

Inside `index.vue`, the editor is created once and extension controllers are attached immediately after:

```ts
placeholderController = createPlaceholderController(editor, monaco, props.placeholder)
snippetController = createSnippetController(editor, monaco)
derivationController = createDerivationController(monaco, props.derivations)
globalDeclarationsController = createGlobalDeclarationsController(monaco, props.globals)
findWidgetHackController = createFindWidgetHackController(editor)
```

On component unmount, every controller is disposed in reverse order.

## Runtime Type Injection

Two extension modules are responsible for Monaco type augmentation:

- `globals.ts`
  Use this when you already know the exact TypeScript type string you want to inject.
- `derivation.ts`
  Use this when you want Monaco to infer a type from a plain JavaScript object shape.

### `globals`

Use `globals` for explicit declarations:

```ts
const globals = [
  {
    name: 'USER',
    description: 'Current runtime user object',
    type: `{
      id: string
      name: string
      roles: string[]
    }`,
  },
]
```

This will suppress `Cannot find name 'USER'` and provide hover/type support.

### `derivations`

Use `derivations` for shape-driven declarations:

```ts
const derivations = [
  {
    name: 'ctx',
    description: 'Runtime context object',
    value: {
      name: 'Tom',
      version: {
        $type: 'value',
        description: 'Context version',
        value: '1.0.0',
      },
      hello: {
        $type: 'function',
        description: 'Return a greeting message',
        params: [
          { name: 'name', type: 'string', description: 'User name' },
        ],
        returns: 'string',
      },
    },
  },
]
```

This is useful for `ctx.xxx` style runtime objects where the editor should still provide completion and hover information.

## When to Use an Extension

- Use an extension if the feature depends on Monaco APIs, editor DOM, extra libs, providers, markers, widgets, or editor lifecycle.
- Do not put Monaco-specific behavior directly into business pages.
- Do not make `index.vue` the home for every new editor behavior.

## Notes

- This project uses the local `monaco-editor` npm package, not a CDN loader runtime.
- Chinese localization is enabled through the local ESM entry.
- Some Monaco customizations, such as find widget behavior, are implemented as version-sensitive hacks and may need adjustments after Monaco upgrades.
