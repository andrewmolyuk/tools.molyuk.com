<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA', 'SRV'] as const

/** Numeric record types, so answers can be labelled without a second round trip. */
const TYPE_NAMES: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX',
  16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA',
}

/** RCODEs worth naming; anything else is shown as its number. */
const STATUS_KEYS: Record<number, string> = { 0: 'ok', 2: 'servfail', 3: 'nxdomain', 5: 'refused' }

interface Answer { name: string; type: number; ttl: number; data: string }

const name = ref('molyuk.com')
const type = ref<(typeof TYPES)[number]>('A')
const answers = ref<Answer[]>([])
const authority = ref<Answer[]>([])
const status = ref<number | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function lookup() {
  const host = name.value.trim()
  if (!host) return
  loading.value = true
  error.value = null
  answers.value = []
  authority.value = []
  status.value = null
  try {
    const res = await fetch(`/api/dns?name=${encodeURIComponent(host)}&type=${type.value}`)
    const data = (await res.json()) as {
      error?: string
      status?: number
      answers?: Answer[]
      authority?: Answer[]
    }
    if (!res.ok || data.error) {
      error.value = data.error === 'invalid_name' ? t('tools.dns.invalidName') : t('tools.dns.upstreamError')
      return
    }
    status.value = data.status ?? 0
    answers.value = data.answers ?? []
    authority.value = data.authority ?? []
  } catch {
    error.value = t('tools.dns.unreachable')
  } finally {
    loading.value = false
  }
}

const statusLabel = computed(() => {
  if (status.value === null) return undefined
  const key = STATUS_KEYS[status.value]
  return key ? t(`tools.dns.status_${key}`) : `RCODE ${status.value}`
})

const allText = computed(() =>
  answers.value.length
    ? answers.value.map((a) => `${a.name}\t${a.ttl}\t${TYPE_NAMES[a.type] ?? a.type}\t${a.data}`).join('\n')
    : undefined,
)
</script>

<template>
  <ToolPage :title="t('tools.dns.name')" :description="t('tools.dns.description')">
    <ToolPanel>
      <label class="flex flex-1 flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.dns.host')
        }}</span>
        <input
          v-model="name"
          type="text"
          placeholder="example.com"
          class="w-full min-w-[200px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
          @keydown.enter="lookup"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.dns.type')
        }}</span>
        <select
          v-model="type"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option v-for="ty in TYPES" :key="ty" :value="ty">{{ ty }}</option>
        </select>
      </label>
      <button
        type="button"
        :disabled="loading"
        class="cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90 disabled:opacity-50"
        @click="lookup"
      >
        {{ loading ? t('tools.dns.loading') : t('tools.dns.lookup') }}
      </button>
    </ToolPanel>

    <p v-if="error" class="m-0 font-mono text-[12px] text-red-600">{{ error }}</p>

    <template v-if="status !== null">
      <OutputBar
        :label="t('tools.dns.answers')"
        :status="statusLabel"
        :status-class="status === 0 && answers.length ? 'text-accent' : 'text-amber-600'"
        :copy-text="allText"
        :download-filename="allText ? 'dns.txt' : undefined"
      />
      <div v-if="answers.length" class="overflow-x-auto border border-line bg-panel">
        <div
          v-for="(a, i) in answers"
          :key="i"
          class="grid grid-cols-[minmax(0,1.2fr)_64px_60px_minmax(0,2fr)_auto] items-center gap-3 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[12px] text-mute break-all">{{ a.name }}</span>
          <span class="font-mono text-[11px] text-accent">{{ TYPE_NAMES[a.type] ?? a.type }}</span>
          <span class="font-mono text-[11px] text-mute">{{ a.ttl }}s</span>
          <span class="font-mono text-[13px] break-all">{{ a.data }}</span>
          <CopyButton :text="a.data" />
        </div>
      </div>
      <p v-else class="m-0 font-mono text-[12px] text-mute">{{ t('tools.dns.noAnswers') }}</p>

      <div v-if="!answers.length && authority.length" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
            t('tools.dns.authority')
          }}</span>
        </div>
        <div
          v-for="(a, i) in authority"
          :key="i"
          class="border-b border-hair px-3.5 py-2.5 font-mono text-[12.5px] break-all last:border-b-0"
        >
          {{ a.data }}
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.dns.note') }}</p>
  </ToolPage>
</template>
