<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { MAX_RANDOM, clamp, intToIpv4, parseIPv4Cidr } from '../ip-list/ip'

const count = ref(10)

const userMode = ref<'sequential' | 'random'>('sequential')
const startNumber = ref(1000)
const digitLength = ref(4)

const hostMode = ref<'fixed' | 'random-ip'>('fixed')
const hostValue = ref('sip.example.com')
const hostCidr = ref('')

const usePort = ref(true)
const port = ref(5060)

const error = ref<string | null>(null)
const results = ref<string[]>([])

function generate() {
  error.value = null
  results.value = []

  try {
    const n = clamp(count.value, 1, MAX_RANDOM)

    const users: string[] = []
    if (userMode.value === 'sequential') {
      const start = clamp(startNumber.value, 0, 999_999_999)
      for (let i = 0; i < n; i++) users.push(String(start + i))
    } else {
      const len = clamp(digitLength.value, 1, 15)
      const max = 10 ** len
      for (let i = 0; i < n; i++) {
        users.push(String(Math.floor(Math.random() * max)).padStart(len, '0'))
      }
    }

    let ipRange: { base: number; size: number } | null = null
    if (hostMode.value === 'random-ip') {
      ipRange = hostCidr.value.trim() ? parseIPv4Cidr(hostCidr.value) : { base: 0, size: 2 ** 32 }
    } else if (!hostValue.value.trim()) {
      throw new Error('Укажите хост')
    }

    const portSuffix = usePort.value ? `:${clamp(port.value, 1, 65535)}` : ''

    results.value = users.map((user) => {
      const host =
        hostMode.value === 'random-ip'
          ? intToIpv4((ipRange!.base + Math.floor(Math.random() * ipRange!.size)) >>> 0)
          : hostValue.value.trim()
      return `sip:${user}@${host}${portSuffix}`
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Некорректный ввод'
  }
}
</script>

<template>
  <ToolPage
    title="SIP URI генератор"
    description="Список SIP-адресов вида sip:user@host:port для тестовых конфигов АТС/шлюзов"
  >
    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Количество
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Номера
        <select
          v-model="userMode"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="sequential">Последовательные</option>
          <option value="random">Случайные</option>
        </select>
      </label>
      <label
        v-if="userMode === 'sequential'"
        class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300"
      >
        Начальный номер
        <input
          v-model.number="startNumber"
          type="number"
          min="0"
          class="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label v-else class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Кол-во цифр
        <input
          v-model.number="digitLength"
          type="number"
          min="1"
          max="15"
          class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <label class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        Хост
        <select
          v-model="hostMode"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="fixed">Фиксированный</option>
          <option value="random-ip">Случайный IPv4</option>
        </select>
      </label>
      <label
        v-if="hostMode === 'fixed'"
        class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300"
      >
        Домен / IP
        <input
          v-model="hostValue"
          type="text"
          placeholder="sip.example.com"
          class="w-56 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <label v-else class="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
        CIDR (опционально)
        <input
          v-model="hostCidr"
          type="text"
          placeholder="192.168.1.0/24"
          class="w-56 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </label>

      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input v-model="usePort" type="checkbox" class="rounded" />
        Порт
      </label>
      <input
        v-if="usePort"
        v-model.number="port"
        type="number"
        min="1"
        max="65535"
        class="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
      />

      <button
        type="button"
        class="cursor-pointer rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        @click="generate"
      >
        Сгенерировать
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

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
