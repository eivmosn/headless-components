<script setup lang="ts">
import type { MonacoEditorInstance } from './components/monaco-editor'
import type { ScrollbarDirection } from './components/scrollbar'
import { ref } from 'vue'
import { MonacoEditor } from './components/monaco-editor'
import { ScrollableTabs } from './components/scrollable-tabs'
import { Scrollbar } from './components/scrollbar'
import './components/scrollbar/src/style.css'

function endReached(direction: ScrollbarDirection) {
  console.warn('is-end', direction)
}

const activated = ref('message')

const tabs = [
  {
    label: '我的待办',
    value: 'todo',
  },
  {
    label: '我的消息',
    value: 'message',
  },
  {
    label: '用户管理',
    value: 'users',
  },
  {
    label: '统一认证应用',
    value: 'apps',
  },
  {
    label: '人员同步日志',
    value: 'sync',
  },
  {
    label: '系统字典',
    value: 'sys-dict',
  },
  {
    label: '流程设计',
    value: 'flow',
  },
]

const code = ref(`function greet(name: string) {
  return \`Hello, \${name}!\`
}

console.log(greet('Monaco'))`)

const globals = [
  {
    name: 'USER',
    description: '当前登录用户信息，由运行时动态注入',
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
    description: '运行时上下文对象',
    value: {
      name: 'Tom',
      age: 18,
      hobbies: ['1', '2', '3'],
      food: [
        {
          name: 'apple',
          value: 'apple',
        },
      ],
      get: {
        pos: '1123',
      },
      hello: {
        $type: 'function',
        description: '返回一个示例字符串',
        params: [
          {
            name: 'name',
            type: 'string',
            description: '要问候的名字',
          },
        ],
        returns: 'string',
        value(name: string) {
          return `hello ${name}`
        },
      },
      version: {
        $type: 'value',
        description: '上下文版本号',
        value: '1.0.0',
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
  {
    name: '日期',
    value: 'DATE',
    className: 'my-warning',
    type: 'warning',
  },
  {
    name: '事件',
    value: 'EVENT',
    className: 'my-primary',
    type: 'primary',
  },
  {
    name: '事件2',
    value: 'EVENT2',
    className: 'my-error',
    type: 'danger',
  },
  {
    name: '事件3',
    value: 'EVENT3',
    className: 'my-success',
    type: 'success',
  },
]

const editorRef = ref<MonacoEditorInstance | null>(null)

function insertToEditor(tag: {
  value: string
  name: string
  type?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  editorRef.value?.insertTag({
    value: tag.value,
    label: tag.name,
    type: tag.type,
    className: tag.className,
  })
}
</script>

<template>
  <div class="container">
    <Scrollbar always @end-reached="endReached">
      <div v-for="i in 200" :key="i">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugiat saepe architecto ab, rem eum, error sit debitis mollitia reiciendis explicabo corrupti esse at atque pariatur facilis blanditiis cum amet maiores!
      </div>
    </Scrollbar>
  </div>

  <div class="gallary" style="margin-top: 10px;">
    <ScrollableTabs v-model="activated" :tabs="tabs" />
  </div>

  <div class="editor-demo" style="margin-top: 16px;">
    <MonacoEditor
      ref="editorRef"
      v-model="code"
      language="typescript"
      placeholder="请输入"
      :globals="globals"
      :derivations="derivations"
    />

    <div class="tags">
      <div>点击插入到编辑器</div>

      <div v-for="t in tags" :key="t.value" class="tag" @click="insertToEditor(t)">
        {{ t.name }}
      </div>
    </div>
  </div>
</template>

<style>
.gallary {
  border: 1px solid;
  padding: 10px;
}

.container {
  height: 500px;
  width: 500px;
  border: 1px solid;
  white-space: nowrap;
}

.editor-demo {
  width: 800px;
  display: flex;
}

.tags {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 20px;
  padding: 4px;
  width: 400px;
}

.tag {
  border: 1px solid #eee;
  border-radius: 2px;
  padding: 4px;
}

.my-warning {
  background: #fef3c7;
  color: #92400e;
  box-shadow: inset 0 0 0 1px #f59e0b;
}

.my-primary {
  background: #dbeafe;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px #60a5fa;
}

.my-error {
  background: #fee2e2;
  color: #b91c1c;
  box-shadow: inset 0 0 0 1px #f87171;
}

.my-success {
  background: #dcfce7;
  color: #15803d;
  box-shadow: inset 0 0 0 1px #4ade80;
}
</style>
