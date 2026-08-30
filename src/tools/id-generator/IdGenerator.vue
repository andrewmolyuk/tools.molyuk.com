<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { NANOID_DEFAULT_SIZE, RANDOM_BITS, nanoid, ulid } from './formats'

const { t } = useI18n()

const format = ref<'uuid' | 'ulid' | 'nanoid'>('uuid')
const count = ref(5)
const size = ref(NANOID_DEFAULT_SIZE)
const uppercase = ref(false)
const noDashes = ref(false)
const ids = ref<string[]>([])

/** Case and dash options are UUID-only; ULID is already uppercase and nanoid is case-sensitive. */
function render(id: string) {
  if (format.value !== 'uuid') return id
  let out = id
  if (noDashes.value) out = out.replaceAll('-', '')
  if (uppercase.value) out = out.toUpperCase()
  return out
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function generate() {
  const n = clamp(count.value, 1, 100)
  const length = clamp(size.value, 2, 64)
  const make =
    format.value === 'ulid' ? () => ulid() : format.value === 'nanoid' ? () => nanoid(length) : () => crypto.randomUUID()
  ids.value = Array.from({ length: n }, make)
}

generate()

const entropy = computed(() =>
  format.value === 'nanoid' ? RANDOM_BITS.nanoid(clamp(size.value, 2, 64)) : RANDOM_BITS[format.value],
)

const filename = computed(() => `${format.value}-list.txt`)
</script>

<template>
  <ToolPage :title="t('tools.idGenerator.name')" :description="t('tools.idGenerator.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.idGenerator.format')
        }}</span>
        <select
          v-model="format"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="uuid">UUID v4</option>
          <option value="ulid">ULID</option>
          <option value="nanoid">nanoid</option>
        </select>
      </label>
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
      <label v-if="format === 'nanoid'" class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.idGenerator.size')
        }}</span>
        <input
          v-model.number="size"
          type="number"
          min="2"
          max="64"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <template v-if="format === 'uuid'">
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="uppercase" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.idGenerator.uppercase') }}
        </label>
        <label class="flex items-center gap-2 pb-2 text-[13px]">
          <input v-model="noDashes" type="checkbox" class="h-3.5 w-3.5" />
          {{ t('tools.idGenerator.noDash') }}
        </label>
      </template>
      <span v-if="format === 'ulid'" class="pb-2 font-mono text-[11px] text-mute">
        {{ t('tools.idGenerator.ulidSortable') }}
      </span>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90"
        @click="generate"
      >
        {{ t('common.generate') }}
      </button>
    </ToolPanel>

    <OutputBar
      :status="`${entropy} ${t('tools.idGenerator.randomBits')}`"
      :copy-text="ids.length > 1 ? ids.map(render).join('\n') : undefined"
      :download-filename="ids.length > 1 ? filename : undefined"
    />
    <div class="border border-line bg-panel">
      <div
        v-for="(id, i) in ids"
        :key="i"
        class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
      >
        <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="truncate font-mono text-[13px]">{{ render(id) }}</span>
        <CopyButton :text="render(id)" />
      </div>
    </div>
  </ToolPage>
</template>
