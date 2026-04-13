<script setup lang="ts">
import type { MonacoEditorInstance } from './components/monaco-editor'
import type { ScrollbarDirection } from './components/scrollbar'
import { ref } from 'vue'
import { MonacoEditor } from './components/monaco-editor'
import { ScrollableTabs } from './components/scrollable-tabs'
import { Scrollbar } from './components/scrollbar'
import './components/scrollbar/src/style.css'

const lastReached = ref<ScrollbarDirection | ''>('')
const editorRef = ref<MonacoEditorInstance | null>(null)
const activeTab = ref('editor')

const tabs = [
  { label: 'Editor Playground', value: 'editor' },
  { label: 'Tabs Preview', value: 'tabs' },
  { label: 'Scrollbar Feed', value: 'scrollbar' },
  { label: 'Settings Center', value: 'settings' },
  { label: 'Audit Records', value: 'audit' },
  { label: 'Integration Hub', value: 'integration' },
]

const code = ref(`function greet(name: string) {
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
      <header class="page-header">
        <h1>Component Showcase</h1>
        <p>Simple cards for testing the custom Scrollbar, ScrollableTabs, and MonacoEditor components.</p>
      </header>

      <section class="card-grid">
        <article class="showcase-card">
          <div class="card-head">
            <h2>Scrollbar</h2>
            <p>Nested custom scrolling with edge event feedback and dense content.</p>
          </div>

          <div class="card-body">
            <div class="status-badge">
              Last edge event: <strong>{{ lastReached || 'none yet' }}</strong>
            </div>

            <Scrollbar class="inner-scrollbar" height="280px" always>
              <div class="feed-grid">
                <article v-for="card in feedCards" :key="card.title" class="feed-card">
                  <h3>{{ card.title }}</h3>
                  <p>{{ card.body }}</p>
                </article>
              </div>
            </Scrollbar>
          </div>
        </article>

        <article class="showcase-card">
          <div class="card-head">
            <h2>ScrollableTabs</h2>
            <p>Horizontal overflow, active state sync, and previous/next navigation controls.</p>
          </div>

          <div class="card-body">
            <ScrollableTabs v-model="activeTab" :tabs="tabs" />

            <div class="tab-preview">
              <strong>Current tab:</strong>
              <span>{{ activeTab }}</span>
            </div>
          </div>
        </article>

        <article class="showcase-card showcase-card--editor">
          <div class="card-head">
            <h2>MonacoEditor</h2>
            <p>Localized editor with globals, derivations, snippets, placeholder, and tag insertion.</p>
          </div>

          <div class="card-body editor-card-body">
            <div class="editor-panel">
              <MonacoEditor
                ref="editorRef"
                v-model="code"
                language="typescript"
                placeholder="Type here to test editor extensions"
                :globals="globals"
                :derivations="derivations"
                height="420px"
              />
            </div>

            <aside class="editor-tools">
              <div class="tool-block">
                <strong>Insert tags</strong>
                <p>Click a tag below to insert it at the current cursor position.</p>
              </div>

              <div class="tag-list">
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
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

:root {
  --page-bg: #f4f7ff;
  --card-bg: #ffffff;
  --card-line: #d9e2ff;
  --text-main: #1f2340;
  --text-subtle: #66708f;
  --primary: #4f46e5;
}

body {
  margin: 0;
  background: linear-gradient(180deg, #f8faff 0%, var(--page-bg) 100%);
  color: var(--text-main);
  font-family: 'IBM Plex Sans', sans-serif;
}

#app {
  min-height: 100vh;
}

.showcase-page {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 28px 0 40px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(2rem, 6vw, 3.6rem);
  line-height: 1;
}

.page-header p,
.card-head p,
.feed-card p,
.tool-block p {
  color: var(--text-subtle);
}

.card-grid {
  display: grid;
  gap: 18px;
}

.showcase-card {
  background: var(--card-bg);
  border: 1px solid var(--card-line);
  border-radius: 22px;
  padding: 20px;
  box-shadow: 0 18px 40px rgba(79, 70, 229, 0.06);
  min-width: 0;
  box-sizing: border-box;
}

.card-head {
  margin-bottom: 16px;
}

.card-head h2,
.feed-card h3 {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
}

.card-head p {
  margin: 8px 0 0;
}

.status-badge,
.tab-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--text-main);
}

.inner-scrollbar {
  border: 1px solid #e5eafc;
  border-radius: 16px;
  overflow: hidden;
}

.feed-grid {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.feed-card {
  border-radius: 16px;
  padding: 14px;
  background: #f8faff;
  border: 1px solid #e6ecff;
}

.feed-card h3 {
  font-size: 15px;
}

.editor-card-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  min-width: 0;
}

.card-body,
.editor-panel,
.tabs-showcase,
.tab-preview {
  min-width: 0;
}

.editor-tools {
  padding: 16px;
  border-radius: 16px;
  background: #f8faff;
  border: 1px solid #e6ecff;
}

.tool-block strong {
  display: block;
  margin-bottom: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tag-chip {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 9px 14px;
  background: #eef2ff;
  color: var(--text-main);
  cursor: pointer;
  font: inherit;
}

.tag-chip:hover {
  background: #e2e8ff;
}

.biz-tag--warning {
  background: #fef3c7;
  color: #92400e;
  box-shadow: inset 0 0 0 1px #f59e0b;
}

.biz-tag--primary {
  background: #dbeafe;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px #60a5fa;
}

.biz-tag--danger {
  background: #fee2e2;
  color: #b91c1c;
  box-shadow: inset 0 0 0 1px #f87171;
}

.biz-tag--success {
  background: #dcfce7;
  color: #15803d;
  box-shadow: inset 0 0 0 1px #4ade80;
}

@media (max-width: 900px) {
  .editor-card-body {
    grid-template-columns: 1fr;
  }

  .showcase-page {
    width: min(100vw - 24px, 1180px);
  }
}
</style>
