<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const HASHES = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

const message = ref('')
const key = ref('')
const hash = ref<(typeof HASHES)[number]>('SHA-256')
const keyFormat = ref<'text' | 'hex'>('text')

const hex = ref('')
const base64 = ref('')
const error = ref<string | null>(null)

/** Hex keys must be whole bytes; anything else is a typo worth reporting, not padding. */
function hexToBytes(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.replace(/\s+/g, '')
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error(t('tools.hmac.invalidHex'))
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

async function compute() {
  error.value = null
  if (!message.value && !key.value) {
    hex.value = ''
    base64.value = ''
    return
  }
  try {
    const keyBytes = keyFormat.value === 'hex' ? hexToBytes(key.value) : new TextEncoder().encode(key.value)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: hash.value },
      false,
      ['sign'],
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message.value))
    const bytes = new Uint8Array(signature)
    hex.value = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    base64.value = btoa(String.fromCharCode(...bytes))
  } catch (e) {
    hex.value = ''
    base64.value = ''
    error.value = e instanceof Error ? e.message : t('errors.invalidInput')
  }
}

watch([message, key, hash, keyFormat], compute, { immediate: true })

const allText = computed(() => (hex.value ? `HMAC-${hash.value}\nhex: ${hex.value}\nbase64: ${base64.value}` : undefined))
</script>

<template>
  <ToolPage :title="t('tools.hmac.name')" :description="t('tools.hmac.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.hmac.hash')
        }}</span>
        <select
          v-model="hash"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option v-for="h in HASHES" :key="h" :value="h">{{ h }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.hmac.keyFormat')
        }}</span>
        <select
          v-model="keyFormat"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="text">{{ t('tools.hmac.keyText') }}</option>
          <option value="hex">{{ t('tools.hmac.keyHex') }}</option>
        </select>
      </label>
    </ToolPanel>

    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.hmac.message')
        }}</span>
        <textarea
          v-model="message"
          rows="7"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.hmac.key')
        }}</span>
        <textarea
          v-model="key"
          rows="7"
          :placeholder="keyFormat === 'hex' ? 'deadbeef…' : t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
          :class="error ? 'text-red-600' : ''"
        />
      </div>
    </div>

    <p v-if="error" class="m-0 font-mono text-[12px] text-red-600">{{ error }}</p>

    <template v-if="hex">
      <OutputBar :copy-text="allText" :download-filename="allText ? 'hmac.txt' : undefined" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in [{ label: 'hex', value: hex }, { label: 'base64', value: base64 }]"
          :key="row.label"
          class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3.5 border-b border-hair px-3.5 py-3 last:border-b-0"
        >
          <span class="pt-0.5 font-mono text-[11px] tracking-[.06em] text-accent">{{ row.label }}</span>
          <span class="font-mono text-[12.5px] leading-[1.7] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.hmac.note') }}</p>
  </ToolPage>
</template>
