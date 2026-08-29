<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

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

    <OutputBar :label="t('tools.hash.digests')" />
    <div class="border border-line bg-panel">
      <div
        v-for="algo in algorithms"
        :key="algo"
        class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-3.5 border-b border-hair px-3.5 py-3 last:border-b-0"
      >
        <span class="pt-0.5 font-mono text-[11px] tracking-[.06em] text-accent">{{ algo }}</span>
        <span class="font-mono text-[12.5px] leading-[1.7] break-all">{{ results[algo] || '—' }}</span>
        <CopyButton :text="results[algo]" />
      </div>
    </div>
  </ToolPage>
</template>
