<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { inspect, normalisations, summarize } from './unicode'

const { t, locale } = useI18n()

const input = ref('Héllo 🔒 café')

const points = computed(() => inspect(input.value))
const stats = computed(() => summarize(input.value, locale.value))
const forms = computed(() => (input.value ? normalisations(input.value) : []))

const counters = computed(() => {
  const s = stats.value
  return [
    { key: 'graphemes', value: s.graphemes ?? '—' },
    { key: 'codePoints', value: s.codePoints },
    { key: 'utf16Units', value: s.utf16Units },
    { key: 'utf8Bytes', value: s.utf8Bytes },
    { key: 'nonAscii', value: s.nonAscii },
    { key: 'invisible', value: s.invisible },
  ]
})

const allText = computed(() =>
  points.value.map((p) => `U+${p.hex}\t${p.invisible ? '' : p.text}\t${p.name ?? ''}`).join('\n'),
)
</script>

<template>
  <ToolPage :title="t('tools.unicode.name')" :description="t('tools.unicode.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.unicode.input') }}</span>
      <textarea
        v-model="input"
        rows="3"
        spellcheck="false"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[15px] leading-relaxed outline-none"
      />
    </div>

    <div v-if="input" class="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-6">
      <div v-for="c in counters" :key="c.key" class="bg-panel px-3.5 py-3">
        <div class="font-mono text-[9px] tracking-[.14em] text-mute uppercase">{{ t(`tools.unicode.${c.key}`) }}</div>
        <div class="mt-1 font-mono text-[20px]" :class="c.key === 'invisible' && Number(c.value) > 0 ? 'text-amber-600' : 'text-ink'">
          {{ c.value }}
        </div>
      </div>
    </div>

    <template v-if="points.length">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.unicode.characters') }}</span>
        <span class="h-px flex-1 bg-line"></span>
        <CopyButton :text="allText" />
      </div>
      <div class="overflow-x-auto border border-line bg-panel">
        <div class="grid min-w-[720px] grid-cols-[52px_96px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-line px-3.5 py-2 font-mono text-[9px] tracking-[.14em] text-mute uppercase">
          <span>{{ t('tools.unicode.char') }}</span>
          <span>{{ t('tools.unicode.code') }}</span>
          <span>{{ t('tools.unicode.name_') }}</span>
          <span>UTF-8</span>
          <span>{{ t('tools.unicode.escapes') }}</span>
        </div>
        <div
          v-for="(p, i) in points"
          :key="i"
          class="grid min-w-[720px] grid-cols-[52px_96px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-hair px-3.5 py-2 last:border-b-0 hover:bg-paper"
          :class="p.invisible ? 'bg-amber-600/5' : ''"
        >
          <span class="text-center text-[17px]">
            <template v-if="p.invisible"><span class="font-mono text-[10px] text-amber-600">∅</span></template>
            <template v-else>{{ p.text }}</template>
          </span>
          <span class="font-mono text-[12px] text-accent">U+{{ p.hex }}</span>
          <span class="font-mono text-[11.5px] text-mute">{{ p.name ?? '—' }}</span>
          <span class="font-mono text-[11.5px]">{{ p.utf8.map((b) => b.toString(16).padStart(2, '0')).join(' ') }}</span>
          <span class="font-mono text-[11.5px] break-all">{{ p.escapes.js }}<span class="text-mute"> · </span>{{ p.escapes.url }}</span>
        </div>
      </div>
    </template>

    <div v-if="forms.length" class="border border-line bg-panel">
      <div class="border-b border-line px-3.5 py-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.unicode.normalisation') }}</span>
      </div>
      <div
        v-for="form in forms"
        :key="form.form"
        class="grid grid-cols-[64px_64px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2 last:border-b-0"
      >
        <span class="font-mono text-[11px]" :class="form.same ? 'text-accent' : 'text-mute'">{{ form.form }}</span>
        <span class="font-mono text-[11px] text-mute">{{ form.bytes }} B</span>
        <span class="font-mono text-[13px] break-all">{{ form.text }}</span>
        <CopyButton :text="form.text" />
      </div>
    </div>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.unicode.note') }}</p>
  </ToolPage>
</template>
