<script setup lang="ts">
import Artplayer from 'artplayer'
import danmuku from 'artplayer-plugin-danmuku'
import Hls from 'hls.js'
import { onMounted, onUnmounted } from 'vue'

type Contextmenu = Record<string, HTMLElement>
type ArtplayerOption = Omit<Artplayer['option'], 'url' | 'container'>

const props = withDefaults(defineProps<{
  url?: string
  option?: ArtplayerOption
}>(), {
  url: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8',
})

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
  pip: true,
  autoMini: true,
  screenshot: true,
  setting: true,
  loop: false,
  flip: true,
  playbackRate: true,
  aspectRatio: false,
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

function hideContextMenuItems(contextmenu: Contextmenu, items: string[]) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const node = contextmenu[item]
    node.parentNode?.removeChild(node)
  }
}

function onVideoPlaying() {
  //
}

onMounted(() => {
  art = new Artplayer(config)
  if (art) {
    hideContextMenuItems(art.contextmenu as Contextmenu, ['info', 'version'])
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
</template>
