<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'
import { describe } from './infer'
import { emitGo, emitTypeScript } from './emit'

const { t } = useI18n()

const SAMPLE = `{
  "id": 42,
  "name": "Ada Lovelace",
  "active": true,
  "score": 9.5,
  "bio": null,
  "tags": ["math", "computing"],
  "profile": { "city": "London", "zip": "W1" },
  "posts": [
    { "id": 1, "title": "First" },
    { "id": 2, "title": "Second", "pinned": true }
  ]
}`

const input = ref(SAMPLE)
const language = ref<'ts' | 'go'>('ts')
const rootName = ref('Root')
const goPointers = ref(true)
const tsTypeAlias = ref(false)

const result = computed<{ code: string; error: null } | { code: null; error: string } | null>(() => {
  if (!input.value.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(input.value)
  } catch (e) {
    return { code: null, error: e instanceof Error ? e.message : String(e) }
  }
  const options = {
    rootName: rootName.value.trim() || 'Root',
    goPointers: goPointers.value,
    tsTypeAlias: tsTypeAlias.value,
  }
  const model = describe(parsed)
  return { code: language.value === 'ts' ? emitTypeScript(model, options) : emitGo(model, options), error: null }
})

const code = computed(() => result.value?.code ?? '')
const error = computed(() => result.value?.error ?? null)
const filename = computed(() => (language.value === 'ts' ? 'types.ts' : 'types.go'))
</script>

<template>
  <ToolPage :title="t('tools.jsonTypes.name')" :description="t('tools.jsonTypes.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.jsonTypes.language')
        }}</span>
        <select
          v-model="language"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="ts">TypeScript</option>
          <option value="go">Go</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.jsonTypes.rootName')
        }}</span>
        <input
          v-model="rootName"
          type="text"
          spellcheck="false"
          class="w-[140px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label v-if="language === 'go'" class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="goPointers" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.jsonTypes.goPointers') }}
      </label>
      <label v-else class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="tsTypeAlias" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.jsonTypes.tsTypeAlias') }}
      </label>
    </ToolPanel>

    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">JSON</span>
        <textarea
          v-model="input"
          rows="18"
          spellcheck="false"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
            language === 'ts' ? 'TypeScript' : 'Go'
          }}</span>
          <div v-if="code" class="flex items-center gap-2">
            <DownloadButton :text="code" :filename="filename" />
            <CopyButton :text="code" />
          </div>
        </div>
        <textarea
          readonly
          rows="18"
          :value="code"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
    </div>

    <div v-if="error" class="border border-red-600/40 bg-panel px-3.5 py-3">
      <span class="font-mono text-[9px] tracking-[.16em] text-red-600 uppercase">{{
        t('tools.jsonTypes.parseError')
      }}</span>
      <p class="mt-2 m-0 font-mono text-[12.5px] leading-[1.6] text-red-600">{{ error }}</p>
    </div>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.jsonTypes.note') }}</p>
  </ToolPage>
</template>
