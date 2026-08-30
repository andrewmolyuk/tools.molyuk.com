<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { ChmodError, PRESETS, type Permissions, notes, parse, toOctal, toSymbolic } from './chmod'

const { t } = useI18n()

const input = ref('755')

const parsed = computed<{ perms: Permissions; error: null } | { perms: null; error: string }>(() => {
  try {
    return { perms: parse(input.value), error: null }
  } catch (e) {
    return { perms: null, error: e instanceof ChmodError ? t('tools.chmod.invalid') : String(e) }
  }
})

const perms = computed(() => parsed.value.perms)

/** Editing a checkbox rewrites the input, so the text field stays the single source. */
function setBit(cls: 'user' | 'group' | 'other', bit: number, on: boolean) {
  const current = perms.value
  if (!current) return
  const next: Permissions = { ...current, [cls]: on ? current[cls] | bit : current[cls] & ~bit }
  input.value = toOctal(next)
}

function setSpecial(key: 'setuid' | 'setgid' | 'sticky', on: boolean) {
  const current = perms.value
  if (!current) return
  input.value = toOctal({ ...current, [key]: on })
}

const grid = computed(() => {
  const p = perms.value
  if (!p) return []
  return (['user', 'group', 'other'] as const).map((name) => ({
    name,
    read: (p[name] & 4) !== 0,
    write: (p[name] & 2) !== 0,
    execute: (p[name] & 1) !== 0,
  }))
})

const octal = computed(() => (perms.value ? toOctal(perms.value) : ''))
const symbolic = computed(() => (perms.value ? toSymbolic(perms.value) : ''))
const command = computed(() => (perms.value ? `chmod ${octal.value.replace(/^0/, '')} file` : ''))
const flags = computed(() => (perms.value ? notes(perms.value) : []))
</script>

<template>
  <ToolPage :title="t('tools.chmod.name')" :description="t('tools.chmod.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.chmod.input') }}</span>
      <input
        v-model="input"
        type="text"
        spellcheck="false"
        placeholder="755 · rwxr-xr-x · 4755 · -rw-r--r--"
        class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[15px] tracking-[.08em] outline-none"
        :class="parsed.error ? 'text-red-600' : ''"
      />
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="preset in PRESETS"
          :key="preset.octal"
          type="button"
          class="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-mono text-[11px] text-ink transition hover:border-accent hover:text-accent"
          @click="input = preset.octal"
        >
          {{ preset.octal }} · {{ t(`tools.chmod.preset_${preset.key}`) }}
        </button>
      </div>
    </div>

    <p v-if="parsed.error" class="m-0 font-mono text-[12px] text-red-600">{{ parsed.error }}</p>

    <template v-if="perms">
      <OutputBar :copy-text="`${octal}\n${symbolic}\n${command}`" />
      <div class="border border-line bg-panel">
        <div
          v-for="row in [
            { key: 'octal', value: octal },
            { key: 'symbolic', value: symbolic },
            { key: 'command', value: command },
          ]"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,140px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-3 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{ t(`tools.chmod.${row.key}`) }}</span>
          <span class="font-mono text-[15px] tracking-[.08em] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>

      <div class="overflow-x-auto border border-line bg-panel">
        <div class="grid min-w-[420px] grid-cols-[minmax(96px,1fr)_repeat(3,72px)] items-center gap-2 border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.chmod.class') }}</span>
          <span v-for="c in ['read', 'write', 'execute']" :key="c" class="text-center font-mono text-[9px] tracking-[.14em] text-mute uppercase">
            {{ t(`tools.chmod.${c}`) }}
          </span>
        </div>
        <div
          v-for="row in grid"
          :key="row.name"
          class="grid min-w-[420px] grid-cols-[minmax(96px,1fr)_repeat(3,72px)] items-center gap-2 border-b border-hair px-3.5 py-2.5 last:border-b-0"
        >
          <span class="text-[13px]">{{ t(`tools.chmod.class_${row.name}`) }}</span>
          <span class="text-center">
            <input type="checkbox" class="h-3.5 w-3.5" :checked="row.read" @change="setBit(row.name, 4, ($event.target as HTMLInputElement).checked)" />
          </span>
          <span class="text-center">
            <input type="checkbox" class="h-3.5 w-3.5" :checked="row.write" @change="setBit(row.name, 2, ($event.target as HTMLInputElement).checked)" />
          </span>
          <span class="text-center">
            <input type="checkbox" class="h-3.5 w-3.5" :checked="row.execute" @change="setBit(row.name, 1, ($event.target as HTMLInputElement).checked)" />
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-5 border border-line bg-panel px-3.5 py-3">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.chmod.special') }}</span>
        <label class="flex items-center gap-2 text-[13px]">
          <input type="checkbox" class="h-3.5 w-3.5" :checked="perms.setuid" @change="setSpecial('setuid', ($event.target as HTMLInputElement).checked)" />
          setuid
        </label>
        <label class="flex items-center gap-2 text-[13px]">
          <input type="checkbox" class="h-3.5 w-3.5" :checked="perms.setgid" @change="setSpecial('setgid', ($event.target as HTMLInputElement).checked)" />
          setgid
        </label>
        <label class="flex items-center gap-2 text-[13px]">
          <input type="checkbox" class="h-3.5 w-3.5" :checked="perms.sticky" @change="setSpecial('sticky', ($event.target as HTMLInputElement).checked)" />
          sticky
        </label>
      </div>

      <ul v-if="flags.length" class="m-0 flex list-none flex-col gap-1.5 p-0">
        <li v-for="flag in flags" :key="flag" class="text-[12px] leading-[1.5] text-mute">
          — {{ t(`tools.chmod.note_${flag}`) }}
        </li>
      </ul>
    </template>
  </ToolPage>
</template>
