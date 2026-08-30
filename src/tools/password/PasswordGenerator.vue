<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { clamp } from '../ip-list/ip'
import { entropyBits, makePronounceable, syllableCountFor } from './pronounceable'

const { t } = useI18n()

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!#$%&*+-=?@^_~',
}
// Glyphs that read the same in most fonts and get mistyped from paper or a screen share.
const AMBIGUOUS = new Set('IlO01|')

const mode = ref<'random' | 'spoken'>('random')
const length = ref(20)
const count = ref(5)
const capitalize = ref(true)
const withDigits = ref(true)
const useLower = ref(true)
const useUpper = ref(true)
const useDigits = ref(true)
const useSymbols = ref(true)
const noAmbiguous = ref(false)

const passwords = ref<string[]>([])

/** Uniform integer in [0, max) — rejects the partial final bucket to avoid modulo bias. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)]
}

const activeSets = computed(() => {
  const chosen: string[] = []
  if (useLower.value) chosen.push(SETS.lower)
  if (useUpper.value) chosen.push(SETS.upper)
  if (useDigits.value) chosen.push(SETS.digits)
  if (useSymbols.value) chosen.push(SETS.symbols)
  if (!noAmbiguous.value) return chosen
  return chosen
    .map((set) => [...set].filter((c) => !AMBIGUOUS.has(c)).join(''))
    .filter((set) => set.length > 0)
})

const pool = computed(() => activeSets.value.join(''))

const syllables = computed(() => syllableCountFor(clampLength(length.value)))

const spokenOptions = computed(() => ({
  syllables: syllables.value,
  capitalize: capitalize.value,
  digits: withDigits.value,
}))

/**
 * Random mode: the conventional length × log2(pool) estimate — the one-per-set guarantee
 * below shifts the true figure slightly, hence "≈". Pronounceable mode has its own, exact
 * count; it is deliberately reported on the same scale so the cost of readability is
 * visible rather than hidden.
 */
const entropy = computed(() => {
  if (mode.value === 'spoken') return Math.round(entropyBits(spokenOptions.value))
  if (!pool.value.length) return 0
  return Math.round(clampLength(length.value) * Math.log2(pool.value.length))
})

const ready = computed(() => mode.value === 'spoken' || pool.value.length > 0)

const strength = computed(() => {
  const bits = entropy.value
  if (bits < 50) return { key: 'weak', class: 'text-red-600' }
  if (bits < 70) return { key: 'fair', class: 'text-amber-600' }
  if (bits < 100) return { key: 'good', class: 'text-ink' }
  return { key: 'strong', class: 'text-accent' }
})

function clampLength(n: number) {
  return clamp(n, 6, 128)
}

function generateOne(size: number): string {
  const sets = activeSets.value
  // Seed one character per selected set so the result always satisfies the policy,
  // then fill from the combined pool and shuffle so the seeds are not positional.
  const chars = sets.slice(0, size).map(pick)
  while (chars.length < size) chars.push(pick(pool.value))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function generate() {
  if (!ready.value) {
    passwords.value = []
    return
  }
  const n = clamp(count.value, 1, 50)
  if (mode.value === 'spoken') {
    passwords.value = Array.from({ length: n }, () => makePronounceable(spokenOptions.value, randomInt))
    return
  }
  const size = clampLength(length.value)
  passwords.value = Array.from({ length: n }, () => generateOne(size))
}

generate()

const allText = computed(() =>
  passwords.value.length > 1 ? passwords.value.join('\n') : undefined,
)
</script>

<template>
  <ToolPage :title="t('tools.password.name')" :description="t('tools.password.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.password.mode')
        }}</span>
        <select
          v-model="mode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="random">{{ t('tools.password.modeRandom') }}</option>
          <option value="spoken">{{ t('tools.password.modeSpoken') }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          mode === 'spoken' ? t('tools.password.lengthApprox') : t('tools.password.length')
        }}</span>
        <input
          v-model.number="length"
          type="number"
          min="6"
          max="128"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.password.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="50"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <template v-if="mode === 'random'">
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="useLower" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.lower') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="useUpper" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.upper') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="useDigits" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.digits') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="useSymbols" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.symbols') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="noAmbiguous" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.noAmbiguous') }}
        </label>
      </template>
      <template v-else>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="capitalize" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.capitalize') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="withDigits" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.password.withDigits') }}
        </label>
        <span class="pb-2 font-mono text-[11px] text-mute">
          {{ t('tools.password.syllableCount') }}: {{ syllables }}
        </span>
      </template>
      <button
        type="button"
        :disabled="!ready"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar
      :status="
        ready
          ? `≈ ${entropy} ${t('tools.password.bits')} · ${t(`tools.password.${strength.key}`)}`
          : t('tools.password.noSets')
      "
      :status-class="ready ? strength.class : 'text-red-600'"
      :copy-text="allText"
      :download-filename="allText ? 'passwords.txt' : undefined"
    />
    <div v-if="passwords.length" class="border border-line bg-panel">
      <div
        v-for="(pass, i) in passwords"
        :key="i"
        class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
      >
        <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="font-mono text-[13px] break-all">{{ pass }}</span>
        <CopyButton :text="pass" />
      </div>
    </div>
  </ToolPage>
</template>
