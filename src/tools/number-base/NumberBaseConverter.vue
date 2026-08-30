<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const input = ref('255')
const base = ref(10)
const uppercase = ref(false)

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** BigInt has no radix parser, so accumulate digit by digit — arbitrary size, no float loss. */
function parseInBase(text: string, radix: number): bigint | null {
  let body = text.trim().toLowerCase().replaceAll('_', '').replaceAll(' ', '')
  if (!body) return null
  let negative = false
  if (body.startsWith('-')) {
    negative = true
    body = body.slice(1)
  }
  // Accept the usual literal prefixes when they agree with the selected base.
  const prefixes: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' }
  const prefix = prefixes[radix]
  if (prefix && body.startsWith(prefix)) body = body.slice(2)
  if (!body) return null

  const bigRadix = BigInt(radix)
  let value = 0n
  for (const char of body) {
    const digit = DIGITS.indexOf(char)
    if (digit < 0 || digit >= radix) return null
    value = value * bigRadix + BigInt(digit)
  }
  return negative ? -value : value
}

const value = computed(() => parseInBase(input.value, base.value))
const invalid = computed(() => input.value.trim().length > 0 && value.value === null)

function render(radix: number): string {
  if (value.value === null) return '—'
  const text = value.value.toString(radix)
  return uppercase.value ? text.toUpperCase() : text
}

/** Bytes of the magnitude, grouped in nibbles — the shape people actually scan bits in. */
const bitGroups = computed(() => {
  if (value.value === null) return []
  const magnitude = value.value < 0n ? -value.value : value.value
  const bits = magnitude.toString(2)
  const padded = bits.padStart(Math.ceil(bits.length / 4) * 4, '0')
  return padded.match(/.{4}/g) ?? []
})

const rows = computed(() => [
  { labelKey: 'binary', radix: 2, value: render(2) },
  { labelKey: 'octal', radix: 8, value: render(8) },
  { labelKey: 'decimal', radix: 10, value: render(10) },
  { labelKey: 'hex', radix: 16, value: render(16) },
])

const bitLength = computed(() => {
  if (value.value === null) return null
  const magnitude = value.value < 0n ? -value.value : value.value
  return magnitude === 0n ? 1 : magnitude.toString(2).length
})

const allText = computed(() => {
  if (value.value === null) return undefined
  return rows.value.map((row) => `${t(`tools.numberBase.${row.labelKey}`)}: ${row.value}`).join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.numberBase.name')" :description="t('tools.numberBase.description')">
    <ToolPanel>
      <label class="flex flex-1 flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.numberBase.value')
        }}</span>
        <input
          v-model="input"
          type="text"
          :placeholder="t('tools.numberBase.placeholder')"
          class="w-full min-w-[200px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
          :class="invalid ? 'text-red-600' : ''"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.numberBase.sourceBase')
        }}</span>
        <select
          v-model.number="base"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option :value="2">2 · bin</option>
          <option :value="8">8 · oct</option>
          <option :value="10">10 · dec</option>
          <option :value="16">16 · hex</option>
          <option :value="32">32</option>
          <option :value="36">36</option>
        </select>
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="uppercase" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.numberBase.uppercase') }}
      </label>
    </ToolPanel>

    <p v-if="invalid" class="m-0 font-mono text-[12px] text-red-600">
      {{ t('tools.numberBase.invalid') }}
    </p>

    <template v-if="value !== null">
      <OutputBar
        :status="`${bitLength} ${t('tools.numberBase.bits')}`"
        :copy-text="allText"
        :download-filename="allText ? 'number-base.txt' : undefined"
      />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.labelKey"
          class="grid grid-cols-[minmax(96px,140px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.numberBase.${row.labelKey}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>

      <div v-if="bitGroups.length" class="border border-line bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.numberBase.bitView')
        }}</span>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <span
            v-for="(group, i) in bitGroups"
            :key="i"
            class="border border-hair px-2 py-1 font-mono text-[12.5px] tracking-[.12em]"
            >{{ group }}</span
          >
        </div>
      </div>
    </template>
  </ToolPage>
</template>
