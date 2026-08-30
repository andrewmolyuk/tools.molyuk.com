<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import type { RegexMatch, RegexRequest, RegexResponse } from './regex-worker'

const { t } = useI18n()

const FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const
/** Long enough for a real pattern to finish, short enough that a runaway one is noticed. */
const TIMEOUT_MS = 1000

const pattern = ref('(\\w+)@(\\w+)\\.(\\w{2,})')
const flags = ref<string[]>(['g'])
const input = ref('ada@example.com, grace@navy.mil — not-an-email@x')
const useReplace = ref(false)
const replacement = ref('$1 [at] $2')

const matches = ref<RegexMatch[]>([])
const truncated = ref(false)
const replaced = ref<string | null>(null)
const error = ref<string | null>(null)
const timedOut = ref(false)

let worker: Worker | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function spawn(): Worker {
  const next = new Worker(new URL('./regex-worker.ts', import.meta.url), { type: 'module' })
  next.onmessage = (event: MessageEvent<RegexResponse>) => {
    clearTimeout(timer)
    const data = event.data
    if (data.ok) {
      matches.value = data.matches
      truncated.value = data.truncated
      replaced.value = data.replaced
      error.value = null
    } else {
      matches.value = []
      replaced.value = null
      error.value = data.error
    }
  }
  return next
}

function reset() {
  matches.value = []
  truncated.value = false
  replaced.value = null
}

function run() {
  timedOut.value = false
  if (!pattern.value) {
    reset()
    error.value = null
    return
  }
  worker ??= spawn()
  const request: RegexRequest = {
    pattern: pattern.value,
    flags: flags.value.join(''),
    input: input.value,
    replacement: useReplace.value ? replacement.value : null,
  }
  clearTimeout(timer)
  timer = setTimeout(() => {
    // The thread is wedged inside the engine and will not read another message —
    // killing it is the only way to get back to a usable state.
    worker?.terminate()
    worker = null
    reset()
    error.value = null
    timedOut.value = true
  }, TIMEOUT_MS)
  worker.postMessage(request)
}

watch([pattern, flags, input, useReplace, replacement], run, { immediate: true, deep: true })

onUnmounted(() => {
  clearTimeout(timer)
  worker?.terminate()
})

/** Splits the subject into plain and matched runs so the matches can be highlighted in place. */
const highlighted = computed(() => {
  const parts: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (const m of matches.value) {
    if (m.index > cursor) parts.push({ text: input.value.slice(cursor, m.index), hit: false })
    if (m.match.length) parts.push({ text: m.match, hit: true })
    cursor = m.index + m.match.length
  }
  if (cursor < input.value.length) parts.push({ text: input.value.slice(cursor), hit: false })
  return parts
})

const status = computed(() => {
  if (timedOut.value) return { text: t('tools.regex.timeout'), cls: 'text-red-600' }
  if (error.value) return { text: error.value, cls: 'text-red-600' }
  if (!pattern.value) return null
  const label = `${matches.value.length}${truncated.value ? '+' : ''} ${t('tools.regex.matchCount')}`
  return { text: label, cls: matches.value.length ? 'text-accent' : 'text-mute' }
})

function toggleFlag(flag: string) {
  flags.value = flags.value.includes(flag)
    ? flags.value.filter((f) => f !== flag)
    : [...flags.value, flag]
}
</script>

<template>
  <ToolPage :title="t('tools.regex.name')" :description="t('tools.regex.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.regex.pattern')
      }}</span>
      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <span class="font-mono text-[15px] text-mute">/</span>
        <input
          v-model="pattern"
          type="text"
          spellcheck="false"
          class="min-w-[220px] flex-1 border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
          :class="error || timedOut ? 'text-red-600' : ''"
        />
        <span class="font-mono text-[15px] text-mute">/</span>
        <div class="flex gap-1">
          <button
            v-for="flag in FLAGS"
            :key="flag"
            type="button"
            class="w-7 cursor-pointer border px-0 py-1.5 font-mono text-[12px] transition"
            :class="
              flags.includes(flag)
                ? 'border-accent bg-accent text-onaccent'
                : 'border-line bg-transparent text-mute hover:border-accent hover:text-accent'
            "
            @click="toggleFlag(flag)"
          >
            {{ flag }}
          </button>
        </div>
      </div>
      <p v-if="status" class="mt-2.5 m-0 font-mono text-[12px]" :class="status.cls">{{ status.text }}</p>
    </div>

    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.regex.subject')
      }}</span>
      <textarea
        v-model="input"
        rows="6"
        spellcheck="false"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
      />
      <div v-if="matches.length" class="mt-3">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.regex.highlight')
        }}</span>
        <p class="mt-2 m-0 border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all">
          <span
            v-for="(part, i) in highlighted"
            :key="i"
            :class="part.hit ? 'bg-accent text-onaccent' : ''"
            >{{ part.text }}</span
          >
        </p>
      </div>
    </div>

    <div class="border border-line bg-panel p-3.5">
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="useReplace" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.regex.replaceMode') }}
      </label>
      <template v-if="useReplace">
        <input
          v-model="replacement"
          type="text"
          spellcheck="false"
          :placeholder="t('tools.regex.replacementPlaceholder')"
          class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
        />
        <div v-if="replaced !== null" class="mt-2.5">
          <div class="flex items-center justify-between gap-2.5">
            <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
              t('tools.regex.result')
            }}</span>
            <CopyButton :text="replaced" />
          </div>
          <textarea
            readonly
            rows="4"
            :value="replaced"
            class="mt-2 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
          />
        </div>
      </template>
    </div>

    <template v-if="matches.length">
      <div class="flex items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
          t('tools.regex.matches')
        }}</span>
        <span class="h-px flex-1 bg-line"></span>
        <span v-if="truncated" class="font-mono text-[10px] text-amber-600">{{
          t('tools.regex.truncated')
        }}</span>
      </div>
      <div class="border border-line bg-panel">
        <div
          v-for="(m, i) in matches"
          :key="i"
          class="border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <div class="grid grid-cols-[34px_56px_minmax(0,1fr)_auto] items-center gap-3">
            <span class="font-mono text-[10px] text-mute">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="font-mono text-[10px] text-mute">@{{ m.index }}</span>
            <span class="font-mono text-[13px] break-all">{{ m.match }}</span>
            <CopyButton :text="m.match" />
          </div>
          <div v-if="m.groups.length" class="mt-2 flex flex-wrap gap-2 pl-[92px]">
            <span
              v-for="(group, gi) in m.groups"
              :key="gi"
              class="border border-hair px-2 py-0.5 font-mono text-[11.5px]"
            >
              <span class="text-mute">{{ gi + 1 }}:</span> {{ group ?? '—' }}
            </span>
            <span
              v-for="(value, name) in m.named"
              :key="name"
              class="border border-hair px-2 py-0.5 font-mono text-[11.5px]"
            >
              <span class="text-accent">{{ name }}:</span> {{ value ?? '—' }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.regex.workerNote') }}</p>
  </ToolPage>
</template>
