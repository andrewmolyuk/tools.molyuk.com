<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'

const { t } = useI18n()

const input = ref('')
const indent = ref<'2' | '4' | 'tab' | 'min'>('2')
const sortKeys = ref(false)

/** Rebuild every object with its keys in lexicographic order; arrays keep their order. */
function withSortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withSortedKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, withSortedKeys((value as Record<string, unknown>)[key])]),
    )
  }
  return value
}

/** Turn a character offset into a line/column a person can navigate to. */
function positionOf(text: string, offset: number): { line: number; column: number } {
  const upto = text.slice(0, offset)
  const lines = upto.split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

// V8 only puts "position N" in its message for short inputs; the common message shape is
// a truncated snippet with no offset at all. So we locate the offending character with our
// own scan. JSON.parse stays the authority on *whether* the text is valid — this only
// answers *where*, and yields to the engine's offset whenever it does provide one.

const WHITESPACE = ' \t\n\r'
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/

function skipWs(text: string, i: number): number {
  while (i < text.length && WHITESPACE.includes(text[i])) i++
  return i
}

/** Each scanner returns the index just past the value it consumed, or throws that index. */
function scanString(text: string, i: number): number {
  i++
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') return i + 1
    if (ch === '\\') {
      const esc = text[i + 1]
      if (esc === undefined) throw i + 1
      if (esc === 'u') {
        if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) throw i + 2
        i += 6
        continue
      }
      if (!'"\\/bfnrt'.includes(esc)) throw i + 1
      i += 2
      continue
    }
    if (ch < ' ') throw i
    i++
  }
  throw i
}

function scanObject(text: string, i: number): number {
  i = skipWs(text, i + 1)
  if (text[i] === '}') return i + 1
  for (;;) {
    i = skipWs(text, i)
    if (text[i] !== '"') throw i
    i = skipWs(text, scanString(text, i))
    if (text[i] !== ':') throw i
    i = skipWs(text, scanValue(text, i + 1))
    if (text[i] === ',') {
      i++
      continue
    }
    if (text[i] === '}') return i + 1
    throw i
  }
}

function scanArray(text: string, i: number): number {
  i = skipWs(text, i + 1)
  if (text[i] === ']') return i + 1
  for (;;) {
    i = skipWs(text, scanValue(text, i))
    if (text[i] === ',') {
      i++
      continue
    }
    if (text[i] === ']') return i + 1
    throw i
  }
}

function scanValue(text: string, i: number): number {
  i = skipWs(text, i)
  if (i >= text.length) throw i
  const ch = text[i]
  if (ch === '"') return scanString(text, i)
  if (ch === '{') return scanObject(text, i)
  if (ch === '[') return scanArray(text, i)
  for (const literal of ['true', 'false', 'null']) {
    if (text.startsWith(literal, i)) return i + literal.length
  }
  const match = NUMBER.exec(text.slice(i))
  if (match?.[0]) return i + match[0].length
  throw i
}

function errorOffset(text: string): number | null {
  try {
    const end = skipWs(text, scanValue(text, 0))
    return end < text.length ? end : null
  } catch (e) {
    return typeof e === 'number' ? e : null
  }
}

interface Result {
  output: string
  error: null
}
interface Failure {
  output: null
  error: { message: string; line?: number; column?: number }
}

const result = computed<Result | Failure | null>(() => {
  if (!input.value.trim()) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(input.value)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const engineOffset = message.match(/position (\d+)/)
    const offset = engineOffset ? Number(engineOffset[1]) : errorOffset(input.value)
    if (offset === null) return { output: null, error: { message } }
    return { output: null, error: { message, ...positionOf(input.value, offset) } }
  }
  const value = sortKeys.value ? withSortedKeys(parsed) : parsed
  const space = indent.value === 'min' ? undefined : indent.value === 'tab' ? '\t' : Number(indent.value)
  return { output: JSON.stringify(value, null, space), error: null }
})

const output = computed(() => result.value?.output ?? '')
const error = computed(() => result.value?.error ?? null)

const stats = computed(() => {
  if (!output.value) return null
  const bytes = new TextEncoder().encode(output.value).length
  const lines = output.value.split('\n').length
  return `${lines} ${t('tools.jsonFormat.lines')} · ${bytes} B`
})
</script>

<template>
  <ToolPage :title="t('tools.jsonFormat.name')" :description="t('tools.jsonFormat.description')">
    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.jsonFormat.indent')
        }}</span>
        <select
          v-model="indent"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option value="2">{{ t('tools.jsonFormat.spaces2') }}</option>
          <option value="4">{{ t('tools.jsonFormat.spaces4') }}</option>
          <option value="tab">{{ t('tools.jsonFormat.tab') }}</option>
          <option value="min">{{ t('tools.jsonFormat.minify') }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 pb-2 text-[13px]">
        <input v-model="sortKeys" type="checkbox" class="h-3.5 w-3.5" />
        {{ t('tools.jsonFormat.sortKeys') }}
      </label>
    </ToolPanel>

    <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.jsonFormat.source')
        }}</span>
        <textarea
          v-model="input"
          rows="16"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
            t('tools.jsonFormat.result')
          }}</span>
          <div v-if="output" class="flex items-center gap-2">
            <DownloadButton :text="output" filename="formatted.json" />
            <CopyButton :text="output" />
          </div>
        </div>
        <textarea
          readonly
          rows="16"
          :value="output"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
        <p v-if="stats" class="mt-2 m-0 font-mono text-[10px] text-mute">{{ stats }}</p>
      </div>
    </div>

    <div v-if="error" class="border border-red-600/40 bg-panel px-3.5 py-3">
      <span class="font-mono text-[9px] tracking-[.16em] text-red-600 uppercase">{{
        t('tools.jsonFormat.parseError')
      }}</span>
      <p class="mt-2 m-0 font-mono text-[12.5px] leading-[1.6] text-red-600">{{ error.message }}</p>
      <p v-if="error.line" class="mt-1.5 m-0 font-mono text-[12px] text-mute">
        {{ t('tools.jsonFormat.line') }} {{ error.line }} · {{ t('tools.jsonFormat.column') }}
        {{ error.column }}
      </p>
    </div>
  </ToolPage>
</template>
