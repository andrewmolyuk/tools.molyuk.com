<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { CASE_STYLES, splitWords } from './cases'

const { t } = useI18n()

const input = ref('parseHTTPResponse v2')

const words = computed(() => splitWords(input.value))

const rows = computed(() =>
  words.value.length ? CASE_STYLES.map((style) => ({ key: style.key, value: style.convert(words.value) })) : [],
)

const allText = computed(() => {
  if (!rows.value.length) return undefined
  return rows.value.map((row) => `${t(`tools.caseConvert.${row.key}`)}: ${row.value}`).join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.caseConvert.name')" :description="t('tools.caseConvert.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.caseConvert.input')
      }}</span>
      <textarea
        v-model="input"
        rows="3"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
      />
      <p v-if="words.length" class="mt-2.5 m-0 font-mono text-[11px] text-mute">
        {{ t('tools.caseConvert.words') }}: {{ words.join(' · ') }}
      </p>
    </div>

    <template v-if="rows.length">
      <OutputBar :copy-text="allText" :download-filename="allText ? 'cases.txt' : undefined" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-[minmax(120px,180px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.caseConvert.${row.key}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>
  </ToolPage>
</template>
