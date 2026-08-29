<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { MAX_RANDOM, clamp } from '../ip-list/ip'

const count = ref(10)
const separator = ref<'colon' | 'hyphen' | 'none'>('colon')
const uppercase = ref(false)
const locallyAdministered = ref(true)

const results = ref<string[]>([])

function randomByte() {
  return Math.floor(Math.random() * 256)
}

function generateOne(): string {
  const bytes = Array.from({ length: 6 }, randomByte)
  // clear multicast (bit 0) and locally-administered (bit 1) bits, then set as configured
  bytes[0] &= 0b11111100
  if (locallyAdministered.value) bytes[0] |= 0b00000010

  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'))
  const cased = uppercase.value ? hex.map((h) => h.toUpperCase()) : hex
  if (separator.value === 'none') return cased.join('')
  return cased.join(separator.value === 'colon' ? ':' : '-')
}

function generate() {
  const n = clamp(count.value, 1, MAX_RANDOM)
  results.value = Array.from({ length: n }, generateOne)
}

generate()
</script>

<template>
  <ToolPage
    title="MAC-адрес генератор"
    description="Случайные unicast MAC-адреса"
  >
    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Количество
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Разделитель
        <select
          v-model="separator"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="colon">Двоеточие (aa:bb:cc)</option>
          <option value="hyphen">Дефис (aa-bb-cc)</option>
          <option value="none">Без разделителя (aabbcc)</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="uppercase" type="checkbox" class="rounded" />
        ЗАГЛАВНЫЕ
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="locallyAdministered" type="checkbox" class="rounded" />
        Локально администрируемый (U/L бит)
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
        v-for="(mac, i) in results"
        :key="i"
        class="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 font-mono text-sm dark:border-slate-800"
      >
        <span class="truncate">{{ mac }}</span>
        <CopyButton :text="mac" />
      </div>
    </div>

    <CopyButton v-if="results.length > 1" :text="results.join('\n')" />
  </ToolPage>
</template>
