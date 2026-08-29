<script setup lang="ts">
import { ref } from 'vue'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
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
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Количество</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Номера</span>
        <select
          v-model="userMode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="sequential">Последовательные</option>
          <option value="random">Случайные</option>
        </select>
      </label>
      <label v-if="userMode === 'sequential'" class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Начальный номер</span>
        <input
          v-model.number="startNumber"
          type="number"
          min="0"
          class="w-[118px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label v-else class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Кол-во цифр</span>
        <input
          v-model.number="digitLength"
          type="number"
          min="1"
          max="15"
          class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Хост</span>
        <select
          v-model="hostMode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="fixed">Фиксированный</option>
          <option value="random-ip">Случайный IPv4</option>
        </select>
      </label>
      <label v-if="hostMode === 'fixed'" class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">Домен / IP</span>
        <input
          v-model="hostValue"
          type="text"
          placeholder="sip.example.com"
          class="w-[220px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label v-else class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">CIDR (опционально)</span>
        <input
          v-model="hostCidr"
          type="text"
          placeholder="192.168.1.0/24"
          class="w-[220px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>

      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="usePort" type="checkbox" class="h-3.5 w-3.5" />
        Порт
      </label>
      <input
        v-if="usePort"
        v-model.number="port"
        type="number"
        min="1"
        max="65535"
        class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
      />

      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        Сгенерировать
      </button>
    </ToolPanel>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <OutputBar :copy-text="results.length ? results.join('\n') : undefined" />
    <textarea
      readonly
      rows="16"
      :value="results.join('\n')"
      class="w-full resize-y border border-line bg-panel px-3.5 py-3 font-mono text-[13px] leading-[1.65] outline-none"
    />
  </ToolPage>
</template>
