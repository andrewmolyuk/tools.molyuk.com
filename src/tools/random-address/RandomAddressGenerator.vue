<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import { clamp } from '../ip-list/ip'
import { COUNTRIES, generateAddress, formatAddressText, type Address, type CountryCode } from './address'

const { t } = useI18n()

const MAX_COUNT = 500

const country = ref<CountryCode>('US')
const count = ref(5)
const format = ref<'text' | 'json'>('text')
const output = ref('')

function generate() {
  const n = clamp(count.value, 1, MAX_COUNT)
  const addresses: Address[] = Array.from({ length: n }, () => generateAddress(country.value))
  output.value =
    format.value === 'json'
      ? JSON.stringify(addresses, null, 2)
      : addresses.map(formatAddressText).join('\n\n')
}

generate()
</script>

<template>
  <ToolPage :title="t('tools.randomAddress.name')" :description="t('tools.randomAddress.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.randomAddress.country')
        }}</span>
        <select
          v-model="country"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option v-for="(def, code) in COUNTRIES" :key="code" :value="code">{{ def.label }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.randomAddress.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          :max="MAX_COUNT"
          class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.randomAddress.format')
        }}</span>
        <select
          v-model="format"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="text">{{ t('tools.randomAddress.formatText') }}</option>
          <option value="json">{{ t('tools.randomAddress.formatJson') }}</option>
        </select>
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar
      :copy-text="output || undefined"
      :download-filename="output ? (format === 'json' ? 'addresses.json' : 'addresses.txt') : undefined"
    />
    <textarea
      readonly
      rows="18"
      :value="output"
      class="w-full resize-y border border-line bg-panel px-3.5 py-3 font-mono text-[13px] leading-[1.65] outline-none"
    />
  </ToolPage>
</template>
