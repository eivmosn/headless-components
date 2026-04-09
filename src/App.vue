<script setup lang="ts">
import type { ScrollbarDirection } from './components/scrollbar'
import { Scrollbar } from './components/scrollbar'

function endReached(direction: ScrollbarDirection) {
  console.warn('is-end', direction)
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
</template>

<style>
.container {
  height: 500px;
  width: 500px;
  border: 1px solid;
  white-space: nowrap;
}
</style>
