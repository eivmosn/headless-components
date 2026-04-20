<script setup lang="ts">
import type { ChatMessage } from './history'
import { onMounted, ref } from 'vue'
import Scrollbar from '../scrollbar/src/scrollbar.vue'
import {
  appendMessage,
  chatHistoryStorage,
  createConversation,
  createMessage,
} from './history'
// import { ref } from 'vue'
// import { Markdown } from 'vue-stream-markdown'
import 'katex/dist/katex.min.css'
import 'vue-stream-markdown/index.css'
import 'vue-stream-markdown/theme.css'
import '../scrollbar/src/style.css'

// const content = ref('# Hello World\n\nThis is a markdown content.')

const conversation = ref(createConversation({
  title: '模拟一问一答',
}))
const chatHistory = ref<ChatMessage[]>(conversation.value.messages)
const streamingAnswer = ref('')

function saveConversation(nextConversation = conversation.value) {
  conversation.value = nextConversation
  chatHistory.value = nextConversation.messages
  chatHistoryStorage.save(nextConversation)
}

function createMockAnswer(question: string) {
  return `你问的是：“${question}”。历史记录只负责保存最终消息；流式渲染交给 vue-stream-markdown 这类渲染组件处理即可。`
}

function splitAnswer(answer: string) {
  return answer.match(/.{1,8}/g) ?? []
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function askAi(question: string) {
  streamingAnswer.value = ''

  const userMessage = createMessage({
    role: 'user',
    text: question,
  })

  saveConversation(appendMessage(conversation.value, userMessage))

  for (const chunk of splitAnswer(createMockAnswer(question))) {
    await wait(80)
    streamingAnswer.value += chunk
  }

  saveConversation(appendMessage(conversation.value, createMessage({
    role: 'assistant',
    text: streamingAnswer.value,
    model: 'mock-ai',
  })))
}

onMounted(() => {
  askAi('用户上传图片和文件时，聊天历史应该怎么保存？')
})
</script>

<template>
  <div class="chat-container">
    <div class="chat-header">
      1
    </div>
    <div class="chat-content">
      <Scrollbar>
        <div class="chat-inner">
          <div
            v-for="message in chatHistory"
            :key="message.id"
            class="chat-message"
            :data-role="message.role"
          >
            <div
              v-for="(part, index) in message.content"
              :key="index"
            >
              <template v-if="part.type === 'text'">
                {{ part.text }}
              </template>
            </div>
          </div>
        </div>
      </Scrollbar>
    </div>
    <div class="chat-input">
      <div class="input" />
    </div>
    <div class="chat-footer">
      内容由 AI 生成，请仔细甄别
    </div>
  </div>
</template>

<style scoped>
@import url('./style.css');
</style>
