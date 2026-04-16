<script setup lang="ts">
import Artplayer from 'artplayer'
import danmuku from 'artplayer-plugin-danmuku'
import Hls from 'hls.js'
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  url?: string
  option?: ArtplayerOption
}>(), {
  url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8',
})

Artplayer.USE_RAF = true
Artplayer.LOG_VERSION = false

type ArtplayerOption = Omit<Artplayer['option'], 'url' | 'container'>

let art: Artplayer | null = null

const config: Artplayer['option'] = {
  container: '#player',
  url: props.url,
  customType: {
    m3u8(video, url) {
      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
      }
      else {
        const canPlay = video.canPlayType('application/vnd.apple.mpegurl')
        if (canPlay === 'probably' || canPlay === 'maybe')
          video.src = url
        else
          art!.notice.show = '不支持播放格式:m3u8'
      }
    },
  },
  lang: 'zh-cn',
  autoplay: false,
  volume: 0.5,
  isLive: false,
  muted: false,
  pip: false,
  autoMini: false,
  screenshot: true,
  setting: true,
  loop: false,
  flip: true,
  playbackRate: true,
  aspectRatio: true,
  fullscreen: true,
  fullscreenWeb: true,
  subtitleOffset: true,
  miniProgressBar: true,
  mutex: true,
  backdrop: true,
  playsInline: true,
  autoPlayback: true,
  autoSize: false,
  plugins: [
    danmuku({
      theme: 'light',
      mount: '#danmuku',
      danmuku: [
        {
          text: '使用数组',
          time: 1,
        },
      ],
      antiOverlap: true,
    }),
  ],
  ...props.option,
}

function hackContextMenuItem(art: Artplayer, options?: {
  text: string
  url: string
}) {
  const link = art.template.$contextmenu.querySelector('.art-contextmenu-version a')
  if (link && options) {
    link.setAttribute('href', options.url)
    link.innerHTML = options.text
  }
}

function hackInfo(art: Artplayer) {
  const close = art.template.$info.querySelector('.art-info-close')
  if (close) {
    close.innerHTML = `<svg width="1em" height="1em" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12" />
</svg>`
  }
}

function onVideoPlaying() {
  //
}

onMounted(() => {
  art = new Artplayer(config)
  if (art) {
    hackInfo(art)
    hackContextMenuItem(art, {
      url: 'https://wkdaily.cpolar.cn/',
      text: 'custom-text',
    })
    art.on('video:playing', onVideoPlaying)
  }
})

onUnmounted(() => {
  art?.destroy()
  art = null
})
</script>

<template>
  <div class="bg-#fff shadow-md">
    <div id="player" class="h-500px" />
    <div class="p-10px">
      <div id="danmuku" />
    </div>
  </div>
  <div v-for="i in 100" :key="i">
    {{ i }}
  </div>
</template>
