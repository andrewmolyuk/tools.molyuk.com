<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t, locale } = useI18n()

const input = ref(String(Math.floor(Date.now() / 1000)))
const unit = ref<'auto' | 's' | 'ms'>('auto')

const now = ref(Date.now())
const ticker = setInterval(() => (now.value = Date.now()), 1000)
onUnmounted(() => clearInterval(ticker))

/**
 * A bare number is a Unix timestamp; anything else goes to `Date`, which covers
 * ISO 8601 and the RFC 2822-ish forms browsers accept. Under `auto`, magnitude picks
 * the unit: 1e11 seconds lands in the year 5138, so anything above it must be
 * milliseconds.
 */
function parse(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  let ms: number
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return null
    if (unit.value === 'ms') ms = n
    else if (unit.value === 's') ms = n * 1000
    else ms = Math.abs(n) >= 1e11 ? n : n * 1000
  } else {
    ms = new Date(trimmed).getTime()
  }
  // Outside ±8.64e15 ms the value is not a representable Date and toISOString() throws.
  if (Number.isNaN(ms) || Math.abs(ms) > 8.64e15) return null
  return ms
}

const ms = computed(() => parse(input.value))
const date = computed(() => (ms.value === null ? null : new Date(ms.value)))
const invalid = computed(() => input.value.trim().length > 0 && ms.value === null)

function pad(n: number, width = 2) {
  return String(n).padStart(width, '0')
}

/** ISO 8601 in the viewer's own zone, e.g. 2026-08-30T14:05:00+03:00. */
function localIso(d: Date): string {
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
]

function relative(d: Date): string {
  const diff = d.getTime() - now.value
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  for (const [unitName, size] of UNITS) {
    if (Math.abs(diff) >= size) return rtf.format(Math.round(diff / size), unitName)
  }
  return rtf.format(0, 'second')
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

const rows = computed(() => {
  const d = date.value
  if (!d) return []
  return [
    { labelKey: 'unixSeconds', value: String(Math.floor(d.getTime() / 1000)) },
    { labelKey: 'unixMillis', value: String(d.getTime()) },
    { labelKey: 'iso', value: d.toISOString() },
    { labelKey: 'utc', value: d.toUTCString() },
    { labelKey: 'localIso', value: localIso(d) },
    {
      labelKey: 'local',
      value: d.toLocaleString(locale.value, { dateStyle: 'full', timeStyle: 'long' }),
    },
    { labelKey: 'relative', value: relative(d) },
  ]
})

const nowRow = computed(() => {
  const d = new Date(now.value)
  return `${Math.floor(now.value / 1000)} · ${d.toLocaleTimeString(locale.value)}`
})

function setNow() {
  unit.value = 'auto'
  input.value = String(Math.floor(Date.now() / 1000))
}

const allText = computed(() => {
  if (!rows.value.length) return undefined
  return rows.value.map((row) => `${t(`tools.timestamp.${row.labelKey}`)}: ${row.value}`).join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.timestamp.name')" :description="t('tools.timestamp.description')">
    <ToolPanel>
      <label class="flex flex-1 flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.timestamp.input')
        }}</span>
        <input
          v-model="input"
          type="text"
          :placeholder="t('tools.timestamp.placeholder')"
          class="w-full min-w-[220px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
          :class="invalid ? 'text-red-600' : ''"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.timestamp.unit')
        }}</span>
        <select
          v-model="unit"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="auto">{{ t('tools.timestamp.unitAuto') }}</option>
          <option value="s">{{ t('tools.timestamp.unitSeconds') }}</option>
          <option value="ms">{{ t('tools.timestamp.unitMillis') }}</option>
        </select>
      </label>
      <button
        type="button"
        class="cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="setNow"
      >
        {{ t('tools.timestamp.now') }}
      </button>
    </ToolPanel>

    <p v-if="invalid" class="m-0 font-mono text-[12px] text-red-600">
      {{ t('tools.timestamp.invalid') }}
    </p>

    <template v-if="rows.length">
      <OutputBar :copy-text="allText" :download-filename="allText ? 'timestamp.txt' : undefined" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.labelKey"
          class="grid grid-cols-[minmax(120px,170px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.timestamp.${row.labelKey}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>

    <div class="flex flex-wrap items-center gap-2.5 border border-line bg-panel px-3.5 py-2.5">
      <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
        t('tools.timestamp.currentTime')
      }}</span>
      <span class="font-mono text-[12.5px] text-accent">{{ nowRow }}</span>
      <span class="ml-auto font-mono text-[11px] text-mute">{{ timeZone }}</span>
    </div>
  </ToolPage>
</template>
