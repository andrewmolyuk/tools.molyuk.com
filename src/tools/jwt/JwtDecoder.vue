<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const input = ref('')

/** Claims whose numeric value is a POSIX timestamp in seconds (RFC 7519 §4.1). */
const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf', 'auth_time', 'updated_at'])

function base64UrlDecode(part: string): string {
  const padded = part.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

interface Decoded {
  header: string
  payload: string
  signature: string
  claims: Record<string, unknown>
}

const decoded = computed<Decoded | null>(() => {
  const token = input.value.trim()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const claims = JSON.parse(base64UrlDecode(parts[1]))
    if (typeof claims !== 'object' || claims === null) return null
    return {
      header: JSON.stringify(header, null, 2),
      payload: JSON.stringify(claims, null, 2),
      signature: parts[2],
      claims,
    }
  } catch {
    return null
  }
})

const invalid = computed(() => input.value.trim().length > 0 && decoded.value === null)

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

/** Time-bearing claims rendered as readable dates alongside their raw values. */
const timeRows = computed(() => {
  const claims = decoded.value?.claims
  if (!claims) return []
  return Object.entries(claims)
    .filter(([key, value]) => TIME_CLAIMS.has(key) && typeof value === 'number')
    .map(([key, value]) => ({ key, raw: value as number, human: formatTime(value as number) }))
})

/** Expiry verdict from `exp` / `nbf`. Says nothing about the signature — we never check it. */
const validity = computed(() => {
  const claims = decoded.value?.claims
  if (!claims) return null
  const now = Date.now() / 1000
  const exp = claims.exp
  const nbf = claims.nbf
  if (typeof exp === 'number' && now > exp) return { key: 'expired', class: 'text-red-600' }
  if (typeof nbf === 'number' && now < nbf) return { key: 'notYet', class: 'text-amber-600' }
  if (typeof exp === 'number') return { key: 'active', class: 'text-accent' }
  return { key: 'noExpiry', class: 'text-mute' }
})

function loadSample() {
  input.value =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.' +
    'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
}
</script>

<template>
  <ToolPage :title="t('tools.jwt.name')" :description="t('tools.jwt.description')">
    <div class="border border-line bg-panel p-3.5">
      <div class="flex items-center justify-between gap-2.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.jwt.token')
        }}</span>
        <button
          type="button"
          class="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-mono text-[10px] tracking-[.08em] text-ink uppercase transition hover:border-accent hover:text-accent"
          @click="loadSample"
        >
          {{ t('tools.jwt.sample') }}
        </button>
      </div>
      <textarea
        v-model="input"
        rows="5"
        :placeholder="t('tools.jwt.placeholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed break-all outline-none"
        :class="invalid ? 'text-red-600' : ''"
      />
      <p class="mt-2.5 m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.jwt.noVerify') }}</p>
    </div>

    <p v-if="invalid" class="m-0 font-mono text-[12px] text-red-600">{{ t('tools.jwt.invalid') }}</p>

    <template v-if="decoded">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
          t('tools.jwt.decoded')
        }}</span>
        <span class="h-px flex-1 bg-line"></span>
        <span v-if="validity" class="font-mono text-[10px]" :class="validity.class">{{
          t(`tools.jwt.${validity.key}`)
        }}</span>
      </div>

      <div class="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
        <div class="bg-panel p-3.5">
          <div class="flex items-center justify-between gap-2.5">
            <span class="font-mono text-[9px] tracking-[.16em] text-accent uppercase">{{
              t('tools.jwt.header')
            }}</span>
            <CopyButton :text="decoded.header" />
          </div>
          <pre
            class="mt-2.5 m-0 overflow-x-auto font-mono text-[12.5px] leading-[1.7]"
          >{{ decoded.header }}</pre>
        </div>
        <div class="bg-panel p-3.5">
          <div class="flex items-center justify-between gap-2.5">
            <span class="font-mono text-[9px] tracking-[.16em] text-accent uppercase">{{
              t('tools.jwt.payload')
            }}</span>
            <CopyButton :text="decoded.payload" />
          </div>
          <pre
            class="mt-2.5 m-0 overflow-x-auto font-mono text-[12.5px] leading-[1.7]"
          >{{ decoded.payload }}</pre>
        </div>
      </div>

      <div v-if="timeRows.length" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
            t('tools.jwt.timestamps')
          }}</span>
        </div>
        <div
          v-for="row in timeRows"
          :key="row.key"
          class="grid grid-cols-[80px_120px_minmax(0,1fr)] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-accent">{{ row.key }}</span>
          <span class="font-mono text-[12.5px] text-mute">{{ row.raw }}</span>
          <span class="font-mono text-[12.5px]">{{ row.human }}</span>
        </div>
      </div>

      <div class="border border-line bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
            t('tools.jwt.signature')
          }}</span>
          <CopyButton :text="decoded.signature" />
        </div>
        <p class="mt-2.5 m-0 font-mono text-[12.5px] leading-[1.7] break-all">
          {{ decoded.signature }}
        </p>
      </div>
    </template>
  </ToolPage>
</template>
