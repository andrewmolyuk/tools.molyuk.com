<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import {
  BLACK,
  WHITE,
  contrastRatio,
  formatHsl,
  formatOklch,
  formatRgb,
  parseColor,
  toHex,
  wcagLevel,
} from './color'

const { t } = useI18n()

const input = ref('#3366cc')

const color = computed(() => parseColor(input.value))
const invalid = computed(() => input.value.trim().length > 0 && color.value === null)

/** The native picker only speaks 6-digit hex, so alpha is dropped on the way in. */
const pickerValue = computed(() => (color.value ? toHex({ ...color.value, a: 1 }) : '#000000'))

const rows = computed(() => {
  const c = color.value
  if (!c) return []
  return [
    { key: 'hex', value: toHex(c) },
    { key: 'rgb', value: formatRgb(c) },
    { key: 'hsl', value: formatHsl(c) },
    { key: 'oklch', value: formatOklch(c) },
  ]
})

const contrast = computed(() => {
  const c = color.value
  if (!c) return null
  const onWhite = contrastRatio(c, WHITE)
  const onBlack = contrastRatio(c, BLACK)
  return [
    { key: 'onWhite', bg: '#ffffff', ratio: onWhite, level: wcagLevel(onWhite), large: wcagLevel(onWhite, true) },
    { key: 'onBlack', bg: '#000000', ratio: onBlack, level: wcagLevel(onBlack), large: wcagLevel(onBlack, true) },
  ]
})

const levelClass = (level: string) =>
  level === 'AAA' ? 'text-accent' : level === 'AA' ? 'text-ink' : 'text-red-600'

const allText = computed(() =>
  rows.value.length ? rows.value.map((r) => `${r.key}: ${r.value}`).join('\n') : undefined,
)
</script>

<template>
  <ToolPage :title="t('tools.color.name')" :description="t('tools.color.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.color.input')
      }}</span>
      <div class="mt-2.5 flex flex-wrap items-center gap-3">
        <input
          v-model="input"
          type="text"
          placeholder="#3366cc · rgb(51 102 204) · oklch(50% 0.15 260)"
          class="min-w-[240px] flex-1 border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
          :class="invalid ? 'text-red-600' : ''"
        />
        <input
          :value="pickerValue"
          type="color"
          class="h-9 w-14 cursor-pointer border border-line bg-field p-1"
          @input="input = ($event.target as HTMLInputElement).value"
        />
      </div>
    </div>

    <p v-if="invalid" class="m-0 font-mono text-[12px] text-red-600">{{ t('tools.color.invalid') }}</p>

    <template v-if="rows.length && color">
      <div
        class="flex h-24 items-end border border-line px-3.5 py-2.5"
        :style="{ backgroundColor: toHex(color) }"
      >
        <span class="font-mono text-[10px] tracking-[.12em] uppercase mix-blend-difference text-white">{{
          toHex(color)
        }}</span>
      </div>

      <OutputBar :copy-text="allText" :download-filename="allText ? 'color.txt' : undefined" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-[minmax(72px,100px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute uppercase">{{ row.key }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>

      <div v-if="contrast" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
            t('tools.color.contrast')
          }}</span>
        </div>
        <div
          v-for="row in contrast"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,150px)_72px_minmax(0,1fr)] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.color.${row.key}`)
          }}</span>
          <span class="font-mono text-[13px]">{{ row.ratio.toFixed(2) }}</span>
          <span class="font-mono text-[11px]">
            <span :class="levelClass(row.level)">{{ t('tools.color.normalText') }}: {{ row.level }}</span>
            <span class="text-mute"> · </span>
            <span :class="levelClass(row.large)">{{ t('tools.color.largeText') }}: {{ row.large }}</span>
          </span>
        </div>
      </div>
      <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.color.wcagNote') }}</p>
    </template>
  </ToolPage>
</template>
