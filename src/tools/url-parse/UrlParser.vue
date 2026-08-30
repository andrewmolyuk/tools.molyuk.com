<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const input = ref('https://user:pass@example.com:8443/api/v2/items?q=hello%20world&tag=a&tag=b#section')

/** Parsed by the platform URL type, so the result matches what fetch and the address bar do. */
const parsed = computed(() => {
  const text = input.value.trim()
  if (!text) return null
  try {
    return new URL(text)
  } catch {
    return null
  }
})

const invalid = computed(() => input.value.trim().length > 0 && parsed.value === null)

const parts = computed(() => {
  const url = parsed.value
  if (!url) return []
  return [
    { key: 'href', value: url.href },
    { key: 'origin', value: url.origin },
    { key: 'protocol', value: url.protocol },
    { key: 'username', value: url.username },
    { key: 'password', value: url.password },
    { key: 'host', value: url.host },
    { key: 'hostname', value: url.hostname },
    { key: 'port', value: url.port },
    { key: 'pathname', value: url.pathname },
    { key: 'search', value: url.search },
    { key: 'hash', value: url.hash },
  ].filter((row) => row.value !== '')
})

/** Repeated keys are kept as separate rows — collapsing them would hide real data. */
const params = computed(() => {
  const url = parsed.value
  if (!url) return []
  return [...url.searchParams.entries()].map(([key, value]) => ({ key, value }))
})

const segments = computed(() => {
  const url = parsed.value
  if (!url) return []
  return url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
})

const allText = computed(() => {
  if (!parts.value.length) return undefined
  const lines = parts.value.map((row) => `${row.key}: ${row.value}`)
  if (params.value.length) {
    lines.push('', ...params.value.map((p) => `${p.key} = ${p.value}`))
  }
  return lines.join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.urlParse.name')" :description="t('tools.urlParse.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.urlParse.input')
      }}</span>
      <textarea
        v-model="input"
        rows="3"
        placeholder="https://example.com/path?a=1"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed break-all outline-none"
        :class="invalid ? 'text-red-600' : ''"
      />
    </div>

    <p v-if="invalid" class="m-0 font-mono text-[12px] text-red-600">{{ t('tools.urlParse.invalid') }}</p>

    <template v-if="parts.length">
      <OutputBar :copy-text="allText" :download-filename="allText ? 'url.txt' : undefined" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in parts"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,140px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{ row.key }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>

      <div v-if="segments.length" class="border border-line bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.urlParse.segments')
        }}</span>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <span
            v-for="(segment, i) in segments"
            :key="i"
            class="border border-hair px-2 py-1 font-mono text-[12.5px]"
            >{{ segment }}</span
          >
        </div>
      </div>

      <template v-if="params.length">
        <div class="flex items-center gap-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
            t('tools.urlParse.params')
          }}</span>
          <span class="h-px flex-1 bg-line"></span>
          <span class="font-mono text-[10px] text-mute">{{ params.length }}</span>
        </div>
        <div class="border border-line bg-panel">
          <div
            v-for="(param, i) in params"
            :key="i"
            class="grid grid-cols-[minmax(96px,180px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
          >
            <span class="font-mono text-[12.5px] text-accent break-all">{{ param.key }}</span>
            <span class="font-mono text-[13px] break-all">{{ param.value }}</span>
            <CopyButton :text="param.value" />
          </div>
        </div>
        <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.urlParse.decodedNote') }}</p>
      </template>
    </template>
  </ToolPage>
</template>
