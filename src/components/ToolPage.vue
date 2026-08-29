<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10">
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ description }}</p>
    <div class="mt-8 space-y-6">
      <slot />
    </div>
  </div>
</template>
