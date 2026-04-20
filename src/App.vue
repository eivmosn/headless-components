<script setup lang="ts">
import type { MonacoEditorInstance } from './components/monaco-editor'
import type { ScrollbarDirection } from './components/scrollbar'
import { shallowRef } from 'vue'
import { MonacoEditor } from './components/monaco-editor'
import { ScrollableTabs } from './components/scrollable-tabs'
import { Scrollbar } from './components/scrollbar'
import './components/scrollbar/src/style.css'

const lastReached = shallowRef<ScrollbarDirection | ''>('')
const editorRef = shallowRef<MonacoEditorInstance | null>(null)
const activeTab = shallowRef('editor')

const tabs = [
  { label: 'Editor Playground', value: 'editor' },
  { label: 'Tabs Preview', value: 'tabs' },
  { label: 'Scrollbar Feed', value: 'scrollbar' },
  { label: 'Settings Center', value: 'settings' },
  { label: 'Audit Records', value: 'audit' },
  { label: 'Integration Hub', value: 'integration' },
]

const code = shallowRef(`function greet(name: string) {
  return \`Hello, \${name}!\`
}

console.log(greet('Monaco'))
`)

const globals = [
  {
    name: 'USER',
    description: 'Current runtime user info injected after execution',
    type: `{
      id: string
      name: string
      deptId: string
      roles: string[]
    }`,
  },
]

const derivations = [
  {
    name: 'ctx',
    description: 'Runtime context object',
    value: {
      name: 'Tom',
      age: 18,
      hobbies: ['1', '2', '3'],
      get: {
        pos: '1123',
      },
      hello: {
        $type: 'function',
        description: 'Return a sample greeting string',
        params: [
          {
            name: 'name',
            type: 'string',
            description: 'Name to greet',
          },
        ],
        returns: 'string',
      },
    },
  },
]

const tags: Array<{
  name: string
  value: string
  className?: string
  type?: 'primary' | 'success' | 'warning' | 'danger'
}> = [
  { name: 'Date', value: 'DATE', className: 'biz-tag--warning', type: 'warning' },
  { name: 'Event', value: 'EVENT', className: 'biz-tag--primary', type: 'primary' },
  { name: 'Error', value: 'ERROR', className: 'biz-tag--danger', type: 'danger' },
  { name: 'Done', value: 'SUCCESS', className: 'biz-tag--success', type: 'success' },
]

const feedCards = Array.from({ length: 12 }, (_, index) => ({
  title: `Feed Item ${index + 1}`,
  body: 'Use these cards to verify custom scrollbar movement, edge callbacks, and resize updates.',
}))

const stats = [
  { value: '03', label: 'Core primitives' },
  { value: '12', label: 'Scrollable records' },
  { value: '04', label: 'Insertable tags' },
]

function insertToEditor(tag: typeof tags[number]) {
  editorRef.value?.insertTag({
    value: tag.value,
    label: tag.name,
    type: tag.type,
    className: tag.className,
  })
}

function endReached(direction: ScrollbarDirection) {
  lastReached.value = direction
}
</script>

<template>
  <Scrollbar class="page-scrollbar" height="100vh" always @end-reached="endReached">
    <main class="showcase-page">
      <section class="hero-panel">
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot" />
            Component System Lab
          </div>
          <h1>Build, scroll, inspect.</h1>
          <p>
            A denser playground for Scrollbar, ScrollableTabs, and MonacoEditor primitives,
            shaped like a working console instead of a quiet gallery.
          </p>
        </div>

        <div class="hero-board" aria-label="Component system status">
          <div v-for="item in stats" :key="item.label" class="stat-tile">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <section class="lab-grid" aria-label="Component showcase">
        <article class="lab-panel lab-panel--scrollbar">
          <div class="panel-kicker">Scrollbar</div>
          <div class="panel-head">
            <h2>Edge-aware feed rail</h2>
            <p>Nested custom scrolling with live boundary feedback and dense resize checks.</p>
          </div>

          <div class="status-row">
            <span>Last edge event</span>
            <strong>{{ lastReached || 'none yet' }}</strong>
          </div>

          <Scrollbar class="inner-scrollbar" height="320px" always>
            <div class="feed-grid">
              <article v-for="card in feedCards" :key="card.title" class="feed-card">
                <span />
                <h3>{{ card.title }}</h3>
                <p>{{ card.body }}</p>
              </article>
            </div>
          </Scrollbar>
        </article>

        <article class="lab-panel lab-panel--tabs">
          <div class="panel-kicker">ScrollableTabs</div>
          <div class="panel-head">
            <h2>Overflow command strip</h2>
            <p>Horizontal navigation, active state sync, and previous/next controls in one lane.</p>
          </div>

          <div class="tabs-stage">
            <ScrollableTabs v-model="activeTab" :tabs="tabs" />
          </div>

          <div class="tab-console">
            <span>current_tab</span>
            <strong>{{ activeTab }}</strong>
          </div>
        </article>

        <article class="lab-panel lab-panel--editor">
          <div class="panel-kicker">MonacoEditor</div>
          <div class="panel-head panel-head--split">
            <div>
              <h2>Runtime editor cockpit</h2>
              <p>Globals, derivations, snippets, placeholder behavior, and tag insertion.</p>
            </div>
            <div class="editor-meter">
              <span>TS</span>
              <strong>live</strong>
            </div>
          </div>

          <div class="editor-layout">
            <div class="editor-shell">
              <MonacoEditor
                ref="editorRef"
                v-model="code"
                language="typescript"
                placeholder="Type here to test editor extensions"
                :globals="globals"
                :derivations="derivations"
                height="460px"
              />
            </div>

            <aside class="editor-tools">
              <div class="tool-block">
                <strong>Insert tags</strong>
                <p>Click a tag to insert it at the current cursor position.</p>
              </div>

              <div class="tag-list" aria-label="Editor tag insertions">
                <button
                  v-for="tag in tags"
                  :key="tag.value"
                  class="tag-chip"
                  type="button"
                  @click="insertToEditor(tag)"
                >
                  {{ tag.name }}
                </button>
              </div>
            </aside>
          </div>
        </article>
      </section>
    </main>
  </Scrollbar>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  --page-bg: #f7f8fb;
  --ink: #12131a;
  --muted: #60677a;
  --soft: #8a91a4;
  --surface: #ffffff;
  --surface-strong: #161821;
  --line: #dfe3ec;
  --rose: #e11d48;
  --rose-soft: #fff1f2;
  --blue: #2563eb;
  --blue-soft: #eef4ff;
  --mint: #14b8a6;
  --yellow: #f9c74f;
  --focus: #2563eb;
  --ring: rgba(18, 19, 26, 0.12) 0 0 0 1px;
  --lift: rgba(18, 19, 26, 0.12) 0 18px 48px -28px;
}

body {
  margin: 0;
  background:
    linear-gradient(90deg, rgba(18, 19, 26, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(18, 19, 26, 0.035) 1px, transparent 1px),
    var(--page-bg);
  background-size: 28px 28px;
  color: var(--ink);
  font-family: 'IBM Plex Sans', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
  font-feature-settings: "liga";
}

#app {
  min-height: 100vh;
}

.showcase-page {
  width: min(1240px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 48px 0 72px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 16px;
  min-height: 360px;
  margin-bottom: 16px;
  color: #ffffff;
}

.hero-copy,
.hero-board,
.lab-panel {
  border-radius: 8px;
  box-shadow: var(--ring), var(--lift);
  box-sizing: border-box;
}

.hero-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0;
  overflow: hidden;
  padding: 32px;
  background:
    linear-gradient(135deg, rgba(225, 29, 72, 0.92), rgba(37, 99, 235, 0.76)),
    var(--surface-strong);
}

.hero-copy::before {
  position: absolute;
  inset: 18px;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
  background-size: 36px 36px;
  opacity: 0.55;
}

.hero-copy > * {
  position: relative;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 8px;
  min-height: 30px;
  margin-bottom: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 0 4px rgba(249, 199, 79, 0.18);
}

.hero-copy h1 {
  max-width: 740px;
  margin: 0;
  font-size: clamp(4rem, 11vw, 8.8rem);
  font-weight: 700;
  line-height: 0.88;
  letter-spacing: 0;
}

.hero-copy p {
  max-width: 650px;
  margin: 24px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 20px;
  line-height: 1.55;
}

.hero-board {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  overflow: hidden;
  background: var(--surface);
}

.stat-tile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 28px;
  border-bottom: 1px solid var(--line);
}

.stat-tile:last-child {
  border-bottom: 0;
}

.stat-tile strong {
  color: var(--ink);
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(2.75rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.stat-tile span {
  margin-top: 8px;
  color: var(--muted);
  font-size: 15px;
  font-weight: 600;
}

.lab-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.lab-panel {
  min-width: 0;
  padding: 24px;
  background: var(--surface);
}

.lab-panel--editor {
  grid-column: 1 / -1;
}

.panel-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  margin-bottom: 18px;
  padding: 0 10px;
  border-radius: 6px;
  background: var(--ink);
  color: #ffffff;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.panel-head {
  margin-bottom: 22px;
}

.panel-head--split {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-head h2,
.feed-card h3 {
  margin: 0;
  color: var(--ink);
  font-weight: 700;
  letter-spacing: 0;
}

.panel-head h2 {
  font-size: clamp(1.85rem, 4vw, 3.25rem);
  line-height: 0.98;
}

.panel-head p,
.feed-card p,
.tool-block p {
  color: var(--muted);
}

.panel-head p {
  max-width: 660px;
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 1.55;
}

.status-row,
.tab-console,
.editor-meter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  min-width: 0;
  min-height: 34px;
  border-radius: 6px;
  padding: 0 12px;
  background: var(--rose-soft);
  color: #881337;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(225, 29, 72, 0.16);
}

.status-row {
  margin-bottom: 14px;
}

.status-row strong,
.tab-console strong,
.editor-meter strong {
  color: var(--ink);
}

.inner-scrollbar {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--ring);
}

.feed-grid {
  display: grid;
  gap: 10px;
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(37, 99, 235, 0.08)),
    #fbfcff;
}

.feed-card {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  min-height: 84px;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
  box-shadow: rgba(18, 19, 26, 0.1) 0 0 0 1px;
}

.feed-card span {
  width: 10px;
  height: 100%;
  min-height: 56px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--rose), var(--blue), var(--mint));
}

.feed-card h3 {
  font-size: 16px;
  line-height: 1.35;
}

.feed-card p {
  grid-column: 2;
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
}

.tabs-stage {
  min-width: 0;
  border-radius: 8px;
  padding: 14px;
  background: var(--blue-soft);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.14);
}

.tab-console {
  width: 100%;
  justify-content: space-between;
  margin-top: 14px;
  background: #ecfeff;
  color: #0f766e;
  box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.22);
}

.tab-console strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-meter {
  flex: 0 0 auto;
  background: var(--blue-soft);
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.18);
}

.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 16px;
  min-width: 0;
}

.editor-shell {
  min-width: 0;
  overflow: hidden;
  border-radius: 8px;
  background: #111827;
  box-shadow: var(--ring), rgba(17, 24, 39, 0.28) 0 24px 60px -34px;
}

.editor-tools {
  min-width: 0;
  border-radius: 8px;
  padding: 18px;
  background: var(--surface-strong);
  color: #ffffff;
  box-shadow: var(--ring);
}

.tool-block strong {
  display: block;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
}

.tool-block p {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 14px;
  line-height: 1.5;
}

.tag-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.tag-chip {
  appearance: none;
  min-width: 0;
  min-height: 42px;
  border: 0;
  border-radius: 6px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  cursor: pointer;
  font: 700 13px / 1 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow-wrap: anywhere;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.tag-chip:hover {
  background: #ffffff;
  color: var(--ink);
  transform: translateY(-1px);
}

.tag-chip:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.biz-tag--warning {
  background: #fff7ed;
  color: #c2410c;
  box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.35);
}

.biz-tag--primary {
  background: #eef4ff;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.28);
}

.biz-tag--danger {
  background: #fff1f2;
  color: #be123c;
  box-shadow: inset 0 0 0 1px rgba(225, 29, 72, 0.28);
}

.biz-tag--success {
  background: #ecfdf5;
  color: #047857;
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .tag-chip {
    transition: none;
  }

  .tag-chip:hover {
    transform: none;
  }
}

@media (max-width: 980px) {
  .hero-panel,
  .lab-grid,
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .hero-board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .stat-tile {
    border-right: 1px solid var(--line);
    border-bottom: 0;
  }

  .stat-tile:last-child {
    border-right: 0;
  }
}

@media (max-width: 640px) {
  .showcase-page {
    width: min(100vw - 24px, 1240px);
    padding: 24px 0 48px;
  }

  .hero-copy,
  .lab-panel {
    padding: 18px;
  }

  .hero-copy h1 {
    font-size: clamp(3rem, 18vw, 5.5rem);
  }

  .hero-copy p,
  .panel-head p {
    font-size: 15px;
    line-height: 1.5;
  }

  .hero-board {
    grid-template-columns: 1fr;
  }

  .stat-tile {
    min-height: 116px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding: 20px;
  }

  .panel-head--split {
    display: block;
  }

  .editor-meter {
    margin-top: 14px;
  }

  .tag-list {
    grid-template-columns: 1fr;
  }
}
</style>
