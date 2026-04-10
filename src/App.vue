<script setup lang="ts">
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
      v-model="code"
      language="typescript"
      placeholder="请输入"
      :globals="globals"
      :derivations="derivations"
    />
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
}
</style>
