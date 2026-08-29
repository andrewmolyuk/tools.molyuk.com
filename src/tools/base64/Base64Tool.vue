<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

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
  <ToolPage :title="t('tools.base64.name')" :description="t('tools.base64.description')">
    <div class="flex items-center gap-4.5 border border-line bg-panel px-3.5 py-3">
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="encode" class="h-3.5 w-3.5" />
        {{ t('tools.base64.encode') }}
      </label>
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="decode" class="h-3.5 w-3.5" />
        {{ t('tools.base64.decode') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
        @click="swap"
      >
        {{ t('tools.base64.swap') }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-px border border-t-0 border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
          {{ mode === 'encode' ? t('tools.base64.sourceText') : t('tools.base64.name') }}
        </span>
        <textarea
          v-model="input"
          rows="9"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
            {{ mode === 'encode' ? t('tools.base64.name') : t('tools.base64.decodedText') }}
          </span>
          <CopyButton v-if="output" :text="output" />
        </div>
        <textarea
          readonly
          rows="9"
          :value="output === null ? t('tools.base64.invalid') : output"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
          :class="output === null ? 'text-red-600' : ''"
        />
      </div>
    </div>
  </ToolPage>
</template>
