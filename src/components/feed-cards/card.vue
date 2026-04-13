<script setup lang="ts">
import type { FeedCard } from './types'

defineProps<{
  card?: FeedCard
  loading?: boolean
}>()

// function formatCount(value: number) {
//   if (value >= 100000000)
//     return `${(value / 100000000).toFixed(1).replace(/\.0$/, '')}亿`

//   if (value >= 10000)
//     return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}万`

//   return `${value}`
// }
</script>

<template>
  <article class="feed-card" :class="{ 'is-loading': loading }">
    <template v-if="loading || !card">
      <div class="feed-card__skeleton feed-card__skeleton--cover" />
      <div class="feed-card__meta">
        <div class="feed-card__avatar-skeleton" />
        <div class="feed-card__text-skeleton">
          <span class="feed-card__skeleton feed-card__skeleton--title" />
          <span class="feed-card__skeleton feed-card__skeleton--sub" />
          <span class="feed-card__skeleton feed-card__skeleton--sub short" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="feed-card__cover">
        <img
          class="feed-card__cover-image"
          :src="card.cover || `https://picsum.photos/seed/${encodeURIComponent(card.title)}/640/360`"
          :alt="card.title"
          loading="lazy"
        >
        <span v-if="card.duration" class="feed-card__duration">{{ card.duration }}</span>
        <span v-if="card.category" class="feed-card__badge">{{ card.category }}</span>
      </div>

      <div class="feed-card__meta">
        <img
          class="feed-card__avatar"
          :src="card.profile || `https://i.pravatar.cc/80?u=${encodeURIComponent(card.userName)}`"
          :alt="card.profileName || card.userName"
          loading="lazy"
        >
        <div class="feed-card__content">
          <h3 class="feed-card__title">
            {{ card.title }}
          </h3>
          <p v-if="card.description" class="feed-card__description">
            {{ card.description }}
          </p>
          <div class="feed-card__subline">
            {{ card.userName }}
          </div>
          <!-- <div class="feed-card__subline">
            {{ formatCount(card.views) }} 播放 · {{ formatCount(card.comments) }} 评论 · {{ card.createTime }}
          </div> -->
        </div>
      </div>
    </template>
  </article>
</template>

<style scoped>
.feed-card {
  min-width: 0;
}

.feed-card__cover,
.feed-card__skeleton--cover {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #dfe6f5;
}

.feed-card__cover {
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.35), transparent 28%),
    linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #334155 100%);
}

.feed-card__cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.feed-card__duration,
.feed-card__badge {
  position: absolute;
  z-index: 1;
  font-size: 12px;
  line-height: 1;
  color: #fff;
  backdrop-filter: blur(10px);
  background: rgba(15, 23, 42, 0.62);
}

.feed-card__duration {
  right: 12px;
  bottom: 12px;
  border-radius: 999px;
  padding: 6px 8px;
}

.feed-card__badge {
  left: 12px;
  top: 12px;
  border-radius: 999px;
  padding: 7px 10px;
}

.feed-card__meta {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  margin-top: 12px;
  align-items: start;
}

.feed-card__avatar,
.feed-card__avatar-skeleton {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #dfe6f5;
}

.feed-card__content,
.feed-card__text-skeleton {
  min-width: 0;
}

.feed-card__title,
.feed-card__description,
.feed-card__subline {
  margin: 0;
}

.feed-card__title {
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-card__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-card__subline {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.feed-card__skeleton {
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #e5ebf5 0%, #f4f7fb 48%, #e5ebf5 100%);
  background-size: 220% 100%;
  animation: skeleton-wave 1.2s linear infinite;
}

.feed-card__skeleton--title,
.feed-card__skeleton--sub {
  display: block;
  height: 12px;
  border-radius: 999px;
}

.feed-card__skeleton--title {
  width: 92%;
  height: 14px;
  margin-top: 2px;
}

.feed-card__skeleton--sub {
  width: 84%;
  margin-top: 10px;
}

.feed-card__skeleton--sub.short {
  width: 56%;
}

@keyframes skeleton-wave {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -20% 0;
  }
}
</style>
