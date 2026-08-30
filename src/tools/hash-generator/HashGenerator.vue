<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { md5 } from './md5'

const { t } = useI18n()

// MD5 is not in Web Crypto and is broken for anything security-bearing, but it is still
// what mirrors and legacy APIs publish checksums in, so it ships from our own code.
const algorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
const WEAK = new Set(['MD5', 'SHA-1'])

const input = ref('')
const results = ref<Record<(typeof algorithms)[number], string>>({
  MD5: '',
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
    results.value[algo] =
      algo === 'MD5' ? md5(data) : toHex(await crypto.subtle.digest(algo, data))
  }
}

watch(input, compute, { immediate: true })

const allText = computed(() => {
  if (!input.value) return undefined
  return algorithms.map((algo) => `${algo}: ${results.value[algo]}`).join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.hash.name')" :description="t('tools.hash.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.hash.input')
      }}</span>
      <textarea
        v-model="input"
        rows="5"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
      />
    </div>

    <OutputBar
      :label="t('tools.hash.digests')"
      :copy-text="allText"
      :download-filename="allText ? 'hashes.txt' : undefined"
    />
    <div class="border border-line bg-panel">
      <div
        v-for="algo in algorithms"
        :key="algo"
        class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3.5 border-b border-hair px-3.5 py-3 last:border-b-0"
      >
        <span class="flex flex-col gap-0.5 pt-0.5">
          <span class="font-mono text-[11px] tracking-[.06em] text-accent">{{ algo }}</span>
          <span v-if="WEAK.has(algo)" class="font-mono text-[9px] tracking-[.06em] text-mute">{{
            t('tools.hash.weak')
          }}</span>
        </span>
        <span class="font-mono text-[12.5px] leading-[1.7] break-all">{{ results[algo] || '—' }}</span>
        <CopyButton :text="results[algo]" />
      </div>
    </div>
  </ToolPage>
</template>
