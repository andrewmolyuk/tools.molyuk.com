<script setup lang="ts">
import CopyButton from './CopyButton.vue'

withDefaults(
  defineProps<{
    label?: string
    status?: string
    statusClass?: string
    copyText?: string
  }>(),
  { label: 'Вывод', statusClass: 'text-mute' },
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5">
    <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ label }}</span>
    <span class="h-px flex-1 bg-line"></span>
    <span v-if="status" class="font-mono text-[10px]" :class="statusClass">{{ status }}</span>
    <CopyButton v-if="copyText" :text="copyText" />
  </div>
</template>
