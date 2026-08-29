<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

const input = ref('')
const results = ref<Record<(typeof algorithms)[number], string>>({
  'SHA-1': '',
  'SHA-256': '',
  'SHA-384': '',
  'SHA-512': '',
})

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function compute() {
  const data = new TextEncoder().encode(input.value)
  for (const algo of algorithms) {
    if (!input.value) {
      results.value[algo] = ''
      continue
    }
    const digest = await crypto.subtle.digest(algo, data)
    results.value[algo] = toHex(digest)
  }
}

watch(input, compute, { immediate: true })
</script>

<template>
  <ToolPage title="Hash генератор" description="Хэширование текста с помощью Web Crypto API">
    <textarea
      v-model="input"
      rows="4"
      placeholder="Введите текст…"
      class="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
    />

    <div class="space-y-2">
      <div v-for="algo in algorithms" :key="algo" class="space-y-1">
        <div class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ algo }}</div>
        <div
          class="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 font-mono text-sm break-all dark:border-slate-800"
        >
          <span class="text-slate-700 dark:text-slate-300">{{ results[algo] || '—' }}</span>
          <CopyButton :text="results[algo]" />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
