<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import { MAX_LINES, diffLines, toHunks, toUnified } from './diff'

const { t } = useI18n()

const left = ref('the quick brown fox\njumps over\nthe lazy dog')
const right = ref('the quick brown fox\nvaults over\nthe lazy dog\nand naps')
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)
const contextMode = ref<'all' | '3'>('all')

const result = computed(() =>
  diffLines(left.value, right.value, {
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
  }),
)

const hunks = computed(() =>
  contextMode.value === 'all'
    ? [{ lines: result.value.lines, skipped: 0 }]
    : toHunks(result.value.lines, 3),
)

const rowClass = (op: string) =>
  op === 'insert'
    ? 'bg-accent/10 text-ink'
    : op === 'delete'
      ? 'bg-red-600/10 text-ink'
      : ''

const sign = { equal: ' ', insert: '+', delete: '-' } as const
</script>

<template>
  <ToolPage :title="t('tools.diff.name')" :description="t('tools.diff.description')">
    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.diff.left')
        }}</span>
        <textarea
          v-model="left"
          rows="12"
          spellcheck="false"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.diff.right')
        }}</span>
        <textarea
          v-model="right"
          rows="12"
          spellcheck="false"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
    </div>

    <ToolPanel>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="ignoreCase" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.diff.ignoreCase') }}
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="ignoreWhitespace" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.diff.ignoreWhitespace') }}
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.diff.view')
        }}</span>
        <select
          v-model="contextMode"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="all">{{ t('tools.diff.viewAll') }}</option>
          <option value="3">{{ t('tools.diff.viewContext') }}</option>
        </select>
      </label>
    </ToolPanel>

    <OutputBar
      :label="t('tools.diff.result')"
      :status="`+${result.added} −${result.removed} =${result.unchanged}`"
      :status-class="result.added || result.removed ? 'text-accent' : 'text-mute'"
      :copy-text="result.lines.length ? toUnified(result) : undefined"
      :download-filename="result.lines.length ? 'diff.txt' : undefined"
    />

    <p v-if="result.truncated" class="m-0 font-mono text-[12px] text-amber-600">
      {{ t('tools.diff.truncated', { n: MAX_LINES }) }}
    </p>

    <div v-if="result.lines.length" class="overflow-x-auto border border-line bg-panel">
      <template v-for="(hunk, hi) in hunks" :key="hi">
        <div
          v-if="hunk.skipped"
          class="border-b border-hair bg-paper px-3.5 py-1.5 font-mono text-[10px] text-mute"
        >
          ⋯ {{ t('tools.diff.skipped', { n: hunk.skipped }) }}
        </div>
        <div
          v-for="(line, i) in hunk.lines"
          :key="`${hi}-${i}`"
          class="grid grid-cols-[44px_44px_16px_minmax(0,1fr)] items-baseline gap-2 px-3.5 py-0.5 font-mono text-[12.5px] leading-[1.6]"
          :class="rowClass(line.op)"
        >
          <span class="text-right text-[10px] text-mute">{{ line.leftNumber ?? '' }}</span>
          <span class="text-right text-[10px] text-mute">{{ line.rightNumber ?? '' }}</span>
          <span class="text-mute">{{ sign[line.op] }}</span>
          <span class="whitespace-pre-wrap break-all">{{ line.text || ' ' }}</span>
        </div>
      </template>
    </div>
  </ToolPage>
</template>
