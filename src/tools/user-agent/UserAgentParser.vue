<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { SAMPLES, parseUserAgent } from './ua'

const { t } = useI18n()

const input = ref(typeof navigator === 'undefined' ? SAMPLES[0].value : navigator.userAgent)

const parsed = computed(() => (input.value.trim() ? parseUserAgent(input.value) : null))

const rows = computed(() => {
  const p = parsed.value
  if (!p) return []
  const out: { key: string; value: string }[] = []
  if (p.bot) out.push({ key: 'bot', value: `${p.bot.name}${p.bot.version ? ' ' + p.bot.version : ''}` })
  if (p.browser) out.push({ key: 'browser', value: `${p.browser.name} ${p.browser.version}` })
  if (p.engine) out.push({ key: 'engine', value: `${p.engine.name} ${p.engine.version}` })
  if (p.os) out.push({ key: 'os', value: `${p.os.name}${p.os.version ? ' ' + p.os.version : ''}` })
  out.push({ key: 'device', value: t(`tools.userAgent.device_${p.device}`) })
  return out
})

const unknown = computed(() => parsed.value !== null && rows.value.length <= 1)

const allText = computed(() =>
  rows.value.length ? rows.value.map((r) => `${t(`tools.userAgent.${r.key}`)}: ${r.value}`).join('\n') : undefined,
)
</script>

<template>
  <ToolPage :title="t('tools.userAgent.name')" :description="t('tools.userAgent.description')">
    <div class="border border-line bg-panel p-3.5">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.userAgent.input')
        }}</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="sample in SAMPLES"
            :key="sample.label"
            type="button"
            class="cursor-pointer border border-line bg-transparent px-2 py-1 font-mono text-[10px] text-ink transition hover:border-accent hover:text-accent"
            @click="input = sample.value"
          >
            {{ sample.label }}
          </button>
        </div>
      </div>
      <textarea
        v-model="input"
        rows="4"
        spellcheck="false"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed break-all outline-none"
      />
    </div>

    <template v-if="rows.length">
      <OutputBar
        :status="unknown ? t('tools.userAgent.unknown') : undefined"
        status-class="text-amber-600"
        :copy-text="allText"
        :download-filename="allText ? 'user-agent.txt' : undefined"
      />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.userAgent.${row.key}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.userAgent.note') }}</p>
  </ToolPage>
</template>
