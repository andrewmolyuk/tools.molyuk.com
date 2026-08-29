<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const count = ref(5)
const uppercase = ref(false)
const noDashes = ref(false)
const ids = ref<string[]>([])

function format(id: string) {
  let out = id
  if (noDashes.value) out = out.replaceAll('-', '')
  if (uppercase.value) out = out.toUpperCase()
  return out
}

function generate() {
  const n = Math.min(Math.max(count.value || 1, 1), 100)
  ids.value = Array.from({ length: n }, () => crypto.randomUUID())
}

generate()
</script>

<template>
  <ToolPage title="ID / UUID генератор" description="Генерация случайных UUID v4 (crypto.randomUUID)">
    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Количество
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="100"
          class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="uppercase" type="checkbox" class="rounded" />
        ЗАГЛАВНЫЕ
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="noDashes" type="checkbox" class="rounded" />
        Без дефисов
      </label>
      <button
        type="button"
        class="cursor-pointer rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="generate"
      >
        Сгенерировать
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="(id, i) in ids"
        :key="i"
        class="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-800"
      >
        <span class="truncate">{{ format(id) }}</span>
        <CopyButton :text="format(id)" />
      </div>
    </div>

    <CopyButton v-if="ids.length > 1" :text="ids.map(format).join('\n')" />
  </ToolPage>
</template>
