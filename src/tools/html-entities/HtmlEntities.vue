<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'
import { type EncodeMode, decodeEntities, encodeEntities } from './entities'

const { t } = useI18n()

const mode = ref<'encode' | 'decode'>('encode')
const encodeMode = ref<EncodeMode>('minimal')
const input = ref('')

const output = computed(() =>
  mode.value === 'encode' ? encodeEntities(input.value, encodeMode.value) : decodeEntities(input.value),
)

function swap() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  if (output.value) input.value = output.value
}
</script>

<template>
  <ToolPage :title="t('tools.htmlEntities.name')" :description="t('tools.htmlEntities.description')">
    <div class="flex flex-wrap items-center gap-4.5 border border-line bg-panel px-3.5 py-3">
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="encode" class="h-3.5 w-3.5" />
        {{ t('tools.htmlEntities.encode') }}
      </label>
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="decode" class="h-3.5 w-3.5" />
        {{ t('tools.htmlEntities.decode') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
        @click="swap"
      >
        {{ t('tools.htmlEntities.swap') }}
      </button>
    </div>

    <ToolPanel v-if="mode === 'encode'">
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.htmlEntities.scope')
        }}</span>
        <select
          v-model="encodeMode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="minimal">{{ t('tools.htmlEntities.scopeMinimal') }}</option>
          <option value="named">{{ t('tools.htmlEntities.scopeNamed') }}</option>
          <option value="numeric">{{ t('tools.htmlEntities.scopeNumeric') }}</option>
        </select>
      </label>
      <span class="pb-2 font-mono text-[11px] text-mute">{{ t('tools.htmlEntities.scopeHint') }}</span>
    </ToolPanel>

    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.htmlEntities.source')
        }}</span>
        <textarea
          v-model="input"
          rows="10"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
            t('tools.htmlEntities.result')
          }}</span>
          <div v-if="output" class="flex items-center gap-2">
            <DownloadButton :text="output" filename="entities.txt" />
            <CopyButton :text="output" />
          </div>
        </div>
        <textarea
          readonly
          rows="10"
          :value="output"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
    </div>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.htmlEntities.note') }}</p>
  </ToolPage>
</template>
