<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import {
  MAX_RANDOM,
  MAX_RANGE,
  bigIntToIPv6,
  clamp,
  intToIpv4,
  parseIPv4Cidr,
  parseIPv6Cidr,
  randomBigInt,
} from './ip'

const { t } = useI18n()

const version = ref<'v4' | 'v6'>('v4')
const mode = ref<'range' | 'random'>('range')
const cidr = ref('')
const count = ref(10)
const excludeNetworkBroadcast = ref(true)

const error = ref<string | null>(null)
const results = ref<string[]>([])
const truncated = ref(false)
const rangeSizeLabel = ref('')

const status = computed(() => {
  if (error.value || mode.value !== 'range' || !results.value.length) return undefined
  return truncated.value
    ? t('tools.ipList.shownOf', { n: results.value.length, total: rangeSizeLabel.value })
    : t('tools.ipList.shown', { n: results.value.length })
})

function generate() {
  error.value = null
  results.value = []
  truncated.value = false

  try {
    if (version.value === 'v4') {
      if (mode.value === 'range') {
        const { base, size } = parseIPv4Cidr(cidr.value)
        const limit = Math.min(size, MAX_RANGE)
        const list: string[] = []
        for (let i = 0; i < limit; i++) {
          if (excludeNetworkBroadcast.value && size > 2 && (i === 0 || i === size - 1)) continue
          list.push(intToIpv4((base + i) >>> 0))
        }
        results.value = list
        truncated.value = size > MAX_RANGE
        rangeSizeLabel.value = size.toString()
      } else {
        const n = clamp(count.value, 1, MAX_RANDOM)
        let base = 0
        let size = 2 ** 32
        if (cidr.value.trim()) {
          const parsed = parseIPv4Cidr(cidr.value)
          base = parsed.base
          size = parsed.size
        }
        results.value = Array.from({ length: n }, () =>
          intToIpv4((base + Math.floor(Math.random() * size)) >>> 0),
        )
      }
    } else {
      if (mode.value === 'range') {
        const { base, prefix } = parseIPv6Cidr(cidr.value)
        const hostBits = BigInt(128 - prefix)
        const size = 1n << hostBits
        const limit = size > BigInt(MAX_RANGE) ? MAX_RANGE : Number(size)
        const list: string[] = []
        for (let i = 0; i < limit; i++) {
          list.push(bigIntToIPv6(base + BigInt(i)))
        }
        results.value = list
        truncated.value = size > BigInt(MAX_RANGE)
        rangeSizeLabel.value = size.toString()
      } else {
        const n = clamp(count.value, 1, MAX_RANDOM)
        let base = 0n
        let hostBits = 128n
        if (cidr.value.trim()) {
          const parsed = parseIPv6Cidr(cidr.value)
          base = parsed.base
          hostBits = BigInt(128 - parsed.prefix)
        }
        results.value = Array.from({ length: n }, () => bigIntToIPv6(base | randomBigInt(hostBits)))
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.invalidInput')
  }
}
</script>

<template>
  <ToolPage :title="t('tools.ipList.name')" :description="t('tools.ipList.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.ipList.version')
        }}</span>
        <select
          v-model="version"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="v4">IPv4</option>
          <option value="v6">IPv6</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.ipList.mode')
        }}</span>
        <select
          v-model="mode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="range">{{ t('tools.ipList.modeRange') }}</option>
          <option value="random">{{ t('tools.ipList.modeRandom') }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
          {{ mode === 'random' ? t('tools.ipList.cidrOptional') : t('tools.ipList.cidr') }}
        </span>
        <input
          v-model="cidr"
          type="text"
          :placeholder="version === 'v4' ? '192.168.1.0/24' : '2001:db8::/64'"
          class="w-[220px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label v-if="mode === 'random'" class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.ipList.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label
        v-if="version === 'v4' && mode === 'range'"
        class="flex items-center gap-2 pb-2 text-[13px]"
      >
        <input v-model="excludeNetworkBroadcast" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.ipList.excludeNetBroadcast') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <OutputBar :status="status" :copy-text="results.length ? results.join('\n') : undefined" />
    <textarea
      readonly
      rows="16"
      :value="results.join('\n')"
      class="w-full resize-y border border-line bg-panel px-3.5 py-3 font-mono text-[13px] leading-[1.65] outline-none"
    />
  </ToolPage>
</template>
