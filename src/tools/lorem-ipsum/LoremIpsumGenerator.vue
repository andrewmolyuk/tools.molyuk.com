<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import { generateLorem, type LoremUnit } from './lorem'

const { t } = useI18n()

const unit = ref<LoremUnit>('paragraphs')
const count = ref(3)
const startWithLorem = ref(true)
const output = ref('')

function generate() {
  output.value = generateLorem(unit.value, count.value, startWithLorem.value)
}

generate()
</script>

<template>
  <ToolPage :title="t('tools.loremIpsum.name')" :description="t('tools.loremIpsum.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.loremIpsum.unit')
        }}</span>
        <select
          v-model="unit"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="paragraphs">{{ t('tools.loremIpsum.unitParagraphs') }}</option>
          <option value="sentences">{{ t('tools.loremIpsum.unitSentences') }}</option>
          <option value="words">{{ t('tools.loremIpsum.unitWords') }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.loremIpsum.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="50"
          class="w-24 border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="startWithLorem" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.loremIpsum.startWithLorem') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar :copy-text="output || undefined" :download-filename="output ? 'lorem-ipsum.txt' : undefined" />
    <textarea
      readonly
      rows="16"
      :value="output"
      class="w-full resize-y border border-line bg-panel px-3.5 py-3 text-[14px] leading-[1.65] outline-none"
    />
  </ToolPage>
</template>
