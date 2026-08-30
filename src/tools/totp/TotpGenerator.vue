<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'
import {
  Base32Error, DEFAULTS, type TotpAlgorithm, base32Decode, base32Encode,
  buildOtpAuth, counterFor, parseOtpAuth, secondsRemaining, totp,
} from './totp'

const { t } = useI18n()

const ALGORITHMS: TotpAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-512']

const secret = ref('JBSWY3DPEHPK3PXP')
const digits = ref(DEFAULTS.digits)
const period = ref(DEFAULTS.period)
const algorithm = ref<TotpAlgorithm>(DEFAULTS.algorithm)
const issuer = ref('')
const account = ref('')

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 500)
onUnmounted(() => clearInterval(timer))

const options = computed(() => ({ digits: digits.value, period: period.value, algorithm: algorithm.value }))

const decoded = computed<{ bytes: Uint8Array; error: null } | { bytes: null; error: string }>(() => {
  try {
    const bytes = base32Decode(secret.value)
    if (!bytes.length) return { bytes: null, error: t('tools.totp.emptySecret') }
    return { bytes, error: null }
  } catch (e) {
    return { bytes: null, error: e instanceof Base32Error ? `${t('tools.totp.badChar')}: ${e.message}` : String(e) }
  }
})

const current = ref('')
const next = ref('')

/** Recomputed whenever the counter advances, not on every tick. */
const counter = computed(() => counterFor(now.value / 1000, period.value))

watch(
  [counter, decoded, options],
  async () => {
    const bytes = decoded.value.bytes
    if (!bytes) {
      current.value = ''
      next.value = ''
      return
    }
    const seconds = now.value / 1000
    current.value = await totp(bytes, seconds, options.value)
    next.value = await totp(bytes, seconds + period.value, options.value)
  },
  { immediate: true, deep: true },
)

const remaining = computed(() => secondsRemaining(now.value / 1000, period.value))
const progress = computed(() => (remaining.value / period.value) * 100)

const uri = computed(() =>
  decoded.value.bytes ? buildOtpAuth(secret.value.replace(/\s/g, '').toUpperCase(), issuer.value.trim(), account.value.trim(), options.value) : '',
)

/** Pasting an otpauth:// URI fills every field at once — that is how secrets arrive. */
function onSecretInput(value: string) {
  const parsed = parseOtpAuth(value)
  if (!parsed) {
    secret.value = value
    return
  }
  secret.value = parsed.secret
  digits.value = parsed.options.digits
  period.value = parsed.options.period
  algorithm.value = parsed.options.algorithm
  if (parsed.issuer) issuer.value = parsed.issuer
  if (parsed.account) account.value = parsed.account
}

function randomSecret() {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  secret.value = base32Encode(bytes)
}
</script>

<template>
  <ToolPage :title="t('tools.totp.name')" :description="t('tools.totp.description')">
    <div class="border border-line bg-panel p-3.5">
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.totp.secret')
        }}</span>
        <button
          type="button"
          class="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-mono text-[10px] tracking-[.08em] text-ink uppercase transition hover:border-accent hover:text-accent"
          @click="randomSecret"
        >
          {{ t('tools.totp.random') }}
        </button>
      </div>
      <input
        :value="secret"
        type="text"
        spellcheck="false"
        :placeholder="t('tools.totp.secretPlaceholder')"
        class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
        :class="decoded.error ? 'text-red-600' : ''"
        @input="onSecretInput(($event.target as HTMLInputElement).value)"
      />
      <p class="mt-2 m-0 font-mono text-[11px] text-mute">{{ t('tools.totp.pasteHint') }}</p>
    </div>

    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.digits') }}</span>
        <select v-model.number="digits" class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none">
          <option :value="6">6</option>
          <option :value="7">7</option>
          <option :value="8">8</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.period') }}</span>
        <select v-model.number="period" class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none">
          <option :value="30">30 s</option>
          <option :value="60">60 s</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.algorithm') }}</span>
        <select v-model="algorithm" class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none">
          <option v-for="a in ALGORITHMS" :key="a" :value="a">{{ a }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.issuer') }}</span>
        <input v-model="issuer" type="text" class="w-[130px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.account') }}</span>
        <input v-model="account" type="text" class="w-[150px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none" />
      </label>
    </ToolPanel>

    <p v-if="decoded.error" class="m-0 font-mono text-[12px] text-red-600">{{ decoded.error }}</p>

    <template v-if="current">
      <div class="border border-line bg-panel p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.code') }}</div>
            <div class="mt-2 font-mono text-[52px] leading-none tracking-[.12em] text-accent tabular-nums">
              {{ current }}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.next') }}</div>
              <div class="mt-1 font-mono text-[18px] tracking-[.1em] text-mute tabular-nums">{{ next }}</div>
            </div>
            <CopyButton :text="current" />
          </div>
        </div>
        <div class="mt-5 flex items-center gap-3">
          <div class="h-1.5 flex-1 bg-hair">
            <div
              class="h-full bg-accent transition-[width] duration-500 ease-linear"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <span class="w-10 text-right font-mono text-[12px] text-mute tabular-nums">{{ remaining }}s</span>
        </div>
      </div>

      <div class="border border-line bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.totp.uri') }}</span>
          <CopyButton :text="uri" />
        </div>
        <p class="mt-2.5 m-0 font-mono text-[12.5px] leading-[1.6] break-all">{{ uri }}</p>
        <p class="mt-2 m-0 text-[12px] text-mute">{{ t('tools.totp.qrHint') }}</p>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.totp.note') }}</p>
  </ToolPage>
</template>
