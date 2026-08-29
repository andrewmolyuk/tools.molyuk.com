<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const output = computed(() => {
  if (!input.value) return ''
  try {
    if (mode.value === 'encode') {
      return bytesToBase64(new TextEncoder().encode(input.value))
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(input.value))
  } catch {
    return null
  }
})

function swap() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  if (output.value) input.value = output.value
}
</script>

<template>
  <ToolPage title="Base64" description="Кодирование и декодирование Base64 (UTF-8 safe)">
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="mode" type="radio" value="encode" />
        Encode
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="mode" type="radio" value="decode" />
        Decode
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="swap"
      >
        ⇄ Поменять местами
      </button>
    </div>

    <label class="block space-y-1">
      <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
        {{ mode === 'encode' ? 'Исходный текст' : 'Base64' }}
      </span>
      <textarea
        v-model="input"
        rows="5"
        placeholder="Введите данные…"
        class="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </label>

    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ mode === 'encode' ? 'Base64' : 'Декодированный текст' }}
        </span>
        <CopyButton v-if="output" :text="output" />
      </div>
      <textarea
        readonly
        rows="5"
        :value="output === null ? 'Некорректные данные для декодирования' : output"
        class="w-full rounded-md border px-3 py-2 font-mono text-sm"
        :class="
          output === null
            ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
            : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
        "
      />
    </div>
  </ToolPage>
</template>
