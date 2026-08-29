<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { MAX_RANDOM, clamp } from '../ip-list/ip'

const { t } = useI18n()

const count = ref(10)
const separator = ref<'colon' | 'hyphen' | 'none'>('colon')
const uppercase = ref(false)
const locallyAdministered = ref(true)

const results = ref<string[]>([])

function randomByte() {
  return Math.floor(Math.random() * 256)
}

function generateOne(): string {
  const bytes = Array.from({ length: 6 }, randomByte)
  // clear multicast (bit 0) and locally-administered (bit 1) bits, then set as configured
  bytes[0] &= 0b11111100
  if (locallyAdministered.value) bytes[0] |= 0b00000010

  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'))
  const cased = uppercase.value ? hex.map((h) => h.toUpperCase()) : hex
  if (separator.value === 'none') return cased.join('')
  return cased.join(separator.value === 'colon' ? ':' : '-')
}

function generate() {
  const n = clamp(count.value, 1, MAX_RANDOM)
  results.value = Array.from({ length: n }, generateOne)
}

generate()
</script>

<template>
  <ToolPage :title="t('tools.macAddress.name')" :description="t('tools.macAddress.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.macAddress.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_RANDOM"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.macAddress.separator')
        }}</span>
        <select
          v-model="separator"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="colon">{{ t('tools.macAddress.sepColon') }}</option>
          <option value="hyphen">{{ t('tools.macAddress.sepHyphen') }}</option>
          <option value="none">{{ t('tools.macAddress.sepNone') }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="uppercase" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.macAddress.uppercase') }}
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="locallyAdministered" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.macAddress.localAdmin') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar :copy-text="results.length > 1 ? results.join('\n') : undefined" />
    <div class="max-h-[420px] overflow-y-auto border border-line bg-panel">
      <div
        v-for="(mac, i) in results"
        :key="i"
        class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
      >
        <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="truncate font-mono text-[13px]">{{ mac }}</span>
        <CopyButton :text="mac" />
      </div>
    </div>
  </ToolPage>
</template>
