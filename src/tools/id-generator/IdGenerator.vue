<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const count = ref(5)
const uppercase = ref(false)
const noDashes = ref(false)
const ids = ref<string[]>([])

function format(id: string) {
  let out = id
  if (noDashes.value) out = out.replaceAll('-', '')
  if (uppercase.value) out = out.toUpperCase()
  return out
}

function generate() {
  const n = Math.min(Math.max(count.value || 1, 1), 100)
  ids.value = Array.from({ length: n }, () => crypto.randomUUID())
}

generate()
</script>

<template>
  <ToolPage :title="t('tools.idGenerator.name')" :description="t('tools.idGenerator.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.idGenerator.count')
        }}</span>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="100"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="uppercase" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.idGenerator.uppercase') }}
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="noDashes" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.idGenerator.noDash') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar :copy-text="ids.length > 1 ? ids.map(format).join('\n') : undefined" />
    <div class="border border-line bg-panel">
      <div
        v-for="(id, i) in ids"
        :key="i"
        class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
      >
        <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="truncate font-mono text-[13px]">{{ format(id) }}</span>
        <CopyButton :text="format(id)" />
      </div>
    </div>
  </ToolPage>
</template>
