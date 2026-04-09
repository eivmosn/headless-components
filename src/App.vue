<script setup lang="ts">
import type { ScrollbarDirection } from './components/scrollbar'
import { ref } from 'vue'
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
</style>
