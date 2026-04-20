<script setup lang="ts">
import { ref } from 'vue'
import { MonacoEditor } from '../monaco-editor/index'

const code = ref('')
</script>

<template>
  <MonacoEditor v-model="code" />

  <div class="mt-4">
    <pre>{{ code }}</pre>
  </div>
</template>
