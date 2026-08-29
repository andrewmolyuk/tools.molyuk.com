<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  text: string
}>()

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  if (!props.text) return
  await navigator.clipboard.writeText(props.text)
  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <button
    type="button"
    class="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    @click="copy"
  >
    {{ copied ? 'Скопировано' : 'Копировать' }}
  </button>
</template>
