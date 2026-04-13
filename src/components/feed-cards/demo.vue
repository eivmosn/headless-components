<script setup lang="ts">
import type { FeedCards } from './types'
import FeedCardsLayout from './index.vue'

const cards: FeedCards = Array.from({ length: 80 }, (_, index) => {
  const rank = index + 1
  const author = `创作者 ${rank}`

  return {
    type: 'video',
    title: `视频流布局演示片段 ${rank}`,
    description: '首屏只渲染可视区域，向下滚动后按整行增量渲染，新增卡片先显示骨架屏。',
    duration: `${String(3 + index % 8).padStart(2, '0')}:${String(10 + index % 50).padStart(2, '0')}`,
    category: ['推荐', '直播回放', '产品介绍', '教程', '热点'][index % 5],
    views: 1500 + rank * 783,
    comments: 20 + rank * 9,
    userName: author,
    createTime: `${1 + index % 9} 小时前`,
    profileName: author,
  }
})
</script>

<template>
  <FeedCardsLayout
    :cards="cards"
    :cols="5"
    :max-cols="5"
    :min-card-width="220"
    :gap="20"
    :render-ahead-rows="1"
    :batch-rows="2"
    :max-concurrent-loads="5"
    :skeleton-delay="260"
    scroll-root=".feed-demo-scroll"
  />
</template>
