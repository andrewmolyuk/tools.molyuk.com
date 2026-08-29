<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
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

const version = ref<'v4' | 'v6'>('v4')
const mode = ref<'range' | 'random'>('range')
const cidr = ref('')
const count = ref(10)
const excludeNetworkBroadcast = ref(true)

const error = ref<string | null>(null)
const results = ref<string[]>([])
const truncated = ref(false)
const rangeSizeLabel = ref('')

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
    error.value = e instanceof Error ? e.message : 'Некорректный ввод'
  }
}
</script>

<template>
  <ToolPage
    title="Генератор списков IP"
    description="IPv4 / IPv6 — диапазон по CIDR или случайные адреса"
  >
    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Версия
        <select
          v-model="version"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="v4">IPv4</option>
          <option value="v6">IPv6</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Режим
        <select
          v-model="mode"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="range">Диапазон (CIDR)</option>
          <option value="random">Случайные</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        CIDR{{ mode === 'random' ? ' (опционально)' : '' }}
        <input
          v-model="cidr"
          type="text"
          :placeholder="version === 'v4' ? '192.168.1.0/24' : '2001:db8::/64'"
          class="w-56 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label
        v-if="mode === 'random'"
        class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300"
      >
        Количество
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label
        v-if="version === 'v4' && mode === 'range'"
        class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
      >
        <input v-model="excludeNetworkBroadcast" type="checkbox" class="rounded" />
        Без сетевого/broadcast
      </label>
      <button
        type="button"
        class="cursor-pointer rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="generate"
      >
        Сгенерировать
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <p
      v-else-if="mode === 'range' && results.length"
      class="text-xs text-slate-500 dark:text-slate-400"
    >
      Показано {{ results.length }}{{ truncated ? ` из ${rangeSizeLabel}` : '' }} адресов
    </p>

    <div v-if="results.length" class="space-y-1">
      <div class="flex justify-end">
        <CopyButton :text="results.join('\n')" />
      </div>
      <textarea
        readonly
        rows="12"
        :value="results.join('\n')"
        class="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  </ToolPage>
</template>
