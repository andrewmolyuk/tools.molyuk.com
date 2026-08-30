<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { CronError, SHORTCUT_NAMES, describeValues, nextRuns, parseCron } from './cron'

const { t, locale } = useI18n()

const input = ref('*/15 9-17 * * mon-fri')

const FIELD_MAX: Record<string, number> = {
  minute: 60,
  hour: 24,
  dayOfMonth: 31,
  month: 12,
  dayOfWeek: 7,
}

const parsed = computed(() => {
  const text = input.value.trim()
  if (!text) return null
  try {
    return { cron: parseCron(text), error: null }
  } catch (e) {
    const key = e instanceof CronError ? e.fieldKey : 'expression'
    return { cron: null, error: key }
  }
})

const fields = computed(() => {
  const cron = parsed.value?.cron
  if (!cron) return []
  return Object.values(cron).map((field) => ({
    key: field.key,
    summary: describeValues(field, FIELD_MAX[field.key]),
    count: field.values.length,
  }))
})

const runs = computed(() => {
  const cron = parsed.value?.cron
  if (!cron) return []
  return nextRuns(cron, new Date(), 8)
})

const errorText = computed(() => {
  const key = parsed.value?.error
  if (!key) return null
  return key === 'expression'
    ? t('tools.cron.errorFields')
    : `${t('tools.cron.errorField')}: ${t(`tools.cron.${key}`)}`
})

function formatRun(date: Date) {
  return date.toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
}

const allText = computed(() =>
  runs.value.length ? runs.value.map(formatRun).join('\n') : undefined,
)
</script>

<template>
  <ToolPage :title="t('tools.cron.name')" :description="t('tools.cron.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.cron.input')
      }}</span>
      <input
        v-model="input"
        type="text"
        placeholder="*/15 9-17 * * mon-fri"
        class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
        :class="errorText ? 'text-red-600' : ''"
      />
      <p class="mt-2.5 m-0 font-mono text-[11px] text-mute">
        {{ t('tools.cron.order') }} · {{ SHORTCUT_NAMES.join(' ') }}
      </p>
    </div>

    <p v-if="errorText" class="m-0 font-mono text-[12px] text-red-600">{{ errorText }}</p>

    <template v-if="fields.length">
      <div class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
            t('tools.cron.fields')
          }}</span>
        </div>
        <div
          v-for="field in fields"
          :key="field.key"
          class="grid grid-cols-[minmax(120px,170px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.cron.${field.key}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ field.summary }}</span>
          <span class="font-mono text-[10px] text-mute">{{ field.count }}</span>
        </div>
      </div>

      <OutputBar
        :label="t('tools.cron.nextRuns')"
        :status="runs.length ? undefined : t('tools.cron.never')"
        status-class="text-amber-600"
        :copy-text="allText"
        :download-filename="allText ? 'cron-runs.txt' : undefined"
      />
      <div v-if="runs.length" class="border border-line bg-panel">
        <div
          v-for="(run, i) in runs"
          :key="i"
          class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="font-mono text-[13px]">{{ formatRun(run) }}</span>
          <CopyButton :text="run.toISOString()" />
        </div>
      </div>
      <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.cron.orNote') }}</p>
    </template>
  </ToolPage>
</template>
