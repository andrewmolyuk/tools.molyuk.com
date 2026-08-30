<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'
import { YamlUnsupported, fromYaml, toYaml } from './yaml'

const { t } = useI18n()

const direction = ref<'toYaml' | 'toJson'>('toYaml')
const input = ref('{\n  "name": "tools",\n  "tags": ["dev", "web"],\n  "nested": { "count": 2 }\n}')

const result = computed<{ output: string; error: null } | { output: null; error: string } | null>(() => {
  if (!input.value.trim()) return null
  try {
    if (direction.value === 'toYaml') return { output: toYaml(JSON.parse(input.value)), error: null }
    return { output: JSON.stringify(fromYaml(input.value), null, 2), error: null }
  } catch (e) {
    if (e instanceof YamlUnsupported) {
      return { output: null, error: `${t('tools.yaml.unsupported')} (${t('tools.yaml.line')} ${e.line}): ${e.message}` }
    }
    const message = e instanceof Error ? e.message : String(e)
    return { output: null, error: message }
  }
})

const output = computed(() => result.value?.output ?? '')
const error = computed(() => result.value?.error ?? null)

function swap() {
  const current = output.value
  direction.value = direction.value === 'toYaml' ? 'toJson' : 'toYaml'
  if (current) input.value = current
}
</script>

<template>
  <ToolPage :title="t('tools.yaml.name')" :description="t('tools.yaml.description')">
    <div class="flex flex-wrap items-center gap-4.5 border border-line bg-panel px-3.5 py-3">
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="direction" type="radio" value="toYaml" class="h-3.5 w-3.5" />
        JSON → YAML
      </label>
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="direction" type="radio" value="toJson" class="h-3.5 w-3.5" />
        YAML → JSON
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
        @click="swap"
      >
        {{ t('tools.yaml.swap') }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          direction === 'toYaml' ? 'JSON' : 'YAML'
        }}</span>
        <textarea
          v-model="input"
          rows="16"
          spellcheck="false"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
            direction === 'toYaml' ? 'YAML' : 'JSON'
          }}</span>
          <div v-if="output" class="flex items-center gap-2">
            <DownloadButton :text="output" :filename="direction === 'toYaml' ? 'out.yaml' : 'out.json'" />
            <CopyButton :text="output" />
          </div>
        </div>
        <textarea
          readonly
          rows="16"
          :value="output"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
    </div>

    <div v-if="error" class="border border-red-600/40 bg-panel px-3.5 py-3">
      <p class="m-0 font-mono text-[12.5px] leading-[1.6] text-red-600">{{ error }}</p>
    </div>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.yaml.note') }}</p>
  </ToolPage>
</template>
