<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="w-full max-w-[1080px] flex-1 px-6 py-9 sm:px-10 sm:py-11">
    <h1 class="m-0 text-[28px] font-semibold tracking-[-.025em] sm:text-[30px]">{{ title }}</h1>
    <p class="mt-2.5 text-sm text-mute">
      <slot name="description">{{ description }}</slot>
    </p>
    <div class="mt-6 flex flex-col gap-6">
      <slot />
    </div>
  </div>
</template>
