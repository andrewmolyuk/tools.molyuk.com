<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { type Bump, bump, compare, format, parse, satisfies, sort } from './semver'

const { t } = useI18n()

const version = ref('1.4.2')
const range = ref('^1.2.0')
const other = ref('1.10.0')
const list = ref('1.0.0\n1.0.0-rc.1\n1.0.0-alpha\n1.10.0\n1.2.0\n0.9.9')

const parsed = computed(() => parse(version.value))
const parsedOther = computed(() => parse(other.value))

const rangeResult = computed(() => (parsed.value ? satisfies(parsed.value, range.value) : null))

const comparison = computed(() => {
  if (!parsed.value || !parsedOther.value) return null
  const result = compare(parsed.value, parsedOther.value)
  return { result, symbol: result === 0 ? '=' : result < 0 ? '<' : '>' }
})

const parts = computed(() => {
  const v = parsed.value
  if (!v) return []
  return [
    { key: 'major', value: String(v.major) },
    { key: 'minor', value: String(v.minor) },
    { key: 'patch', value: String(v.patch) },
    { key: 'prerelease', value: v.prerelease.length ? v.prerelease.join('.') : '—' },
    { key: 'build', value: v.build.length ? v.build.join('.') : '—' },
  ]
})

const bumps = computed(() => {
  const v = parsed.value
  if (!v) return []
  return (['major', 'minor', 'patch'] as Bump[]).map((kind) => ({ kind, value: format(bump(v, kind)) }))
})

const sorted = computed(() => {
  const versions = list.value.split('\n').map((line) => line.trim()).filter(Boolean)
  const good = versions.map(parse).filter((v): v is NonNullable<typeof v> => v !== null)
  const bad = versions.filter((line) => parse(line) === null)
  return { good: sort(good).map(format), bad }
})
</script>

<template>
  <ToolPage :title="t('tools.semver.name')" :description="t('tools.semver.description')">
    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.semver.version') }}</span>
        <input
          v-model="version"
          type="text"
          spellcheck="false"
          placeholder="1.4.2-rc.1+build.5"
          class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[15px] outline-none"
          :class="!parsed && version ? 'text-red-600' : ''"
        />
        <p v-if="!parsed && version" class="mt-2 m-0 font-mono text-[12px] text-red-600">{{ t('tools.semver.invalid') }}</p>
      </div>
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.semver.range') }}</span>
        <input
          v-model="range"
          type="text"
          spellcheck="false"
          placeholder="^1.2.0 || >=2.0.0 <3.0.0"
          class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[15px] outline-none"
        />
        <p
          v-if="parsed"
          class="mt-2 m-0 font-mono text-[13px]"
          :class="rangeResult === null ? 'text-red-600' : rangeResult ? 'text-accent' : 'text-mute'"
        >
          {{ rangeResult === null ? t('tools.semver.badRange') : rangeResult ? t('tools.semver.satisfies') : t('tools.semver.doesNot') }}
        </p>
      </div>
    </div>

    <template v-if="parsed">
      <div class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.semver.parts') }}</span>
        </div>
        <div
          v-for="part in parts"
          :key="part.key"
          class="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)] items-center gap-3.5 border-b border-hair px-3.5 py-2 last:border-b-0"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{ t(`tools.semver.${part.key}`) }}</span>
          <span class="font-mono text-[13px]">{{ part.value }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 border border-line bg-panel px-3.5 py-3">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.semver.bump') }}</span>
        <span v-for="b in bumps" :key="b.kind" class="flex items-center gap-2">
          <span class="font-mono text-[11px] text-mute">{{ t(`tools.semver.${b.kind}`) }}</span>
          <span class="font-mono text-[13px] text-accent">{{ b.value }}</span>
          <CopyButton :text="b.value" />
        </span>
      </div>

      <div class="border border-line bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.semver.compareWith') }}</span>
        <div class="mt-2.5 flex flex-wrap items-center gap-3">
          <span class="font-mono text-[15px]">{{ version }}</span>
          <span class="font-mono text-[18px] text-accent">{{ comparison ? comparison.symbol : '?' }}</span>
          <input
            v-model="other"
            type="text"
            spellcheck="false"
            class="w-[180px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
            :class="!parsedOther && other ? 'text-red-600' : ''"
          />
        </div>
      </div>
    </template>

    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.semver.sortList') }}</span>
      <div class="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <textarea
          v-model="list"
          rows="7"
          spellcheck="false"
          class="w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.semver.ascending') }}</span>
            <CopyButton :text="sorted.good.join('\n')" />
          </div>
          <div class="mt-2 border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed">
            <div v-for="v in sorted.good" :key="v">{{ v }}</div>
            <div v-for="v in sorted.bad" :key="v" class="text-red-600">{{ v }} ✗</div>
          </div>
        </div>
      </div>
    </div>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.semver.note') }}</p>
  </ToolPage>
</template>
