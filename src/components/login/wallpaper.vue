<script setup lang="ts">
const style = {
  backgroundImage: `
      radial-gradient(circle at top center, rgba(59, 130, 246, 0.5),transparent 70%)
      `,
}
</script>

<template>
  <div class="min-h-screen w-full bg-white relative overflow-hidden">
    <div
      class="absolute inset-0 z-0 bg-#fff"
      :style="style"
    />
    <div class="absolute z-1 inset-0">
      <slot />
    </div>
  </div>
</template>
