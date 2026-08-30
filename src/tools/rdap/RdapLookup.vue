<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t, locale } = useI18n()

interface RdapEvent { eventAction: string; eventDate: string }
interface RdapEntity { roles: string[]; vcardArray: unknown }
interface RdapResult {
  handle: string | null
  ldhName: string | null
  status: string[]
  events: RdapEvent[]
  nameservers: string[]
  entities: RdapEntity[]
  secureDNS: { delegationSigned?: boolean } | null
}

const name = ref('molyuk.com')
const result = ref<RdapResult | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function lookup() {
  const host = name.value.trim()
  if (!host) return
  loading.value = true
  error.value = null
  result.value = null
  try {
    const res = await fetch(`/api/rdap?name=${encodeURIComponent(host)}`)
    const data = await res.json()
    if (!res.ok || data.error) {
      error.value =
        data.error === 'invalid_name' ? t('tools.rdap.invalidName')
        : data.error === 'not_found' ? t('tools.rdap.notFound')
        : data.error === 'rate_limited' ? t('tools.rdap.rateLimited')
        : t('tools.rdap.upstreamError')
      return
    }
    result.value = data as RdapResult
  } catch {
    error.value = t('tools.rdap.unreachable')
  } finally {
    loading.value = false
  }
}

const dateFormat = (value: string) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
}

const events = computed(() => (result.value?.events ?? []).map((e) => ({ action: e.eventAction, date: dateFormat(e.eventDate) })))

/**
 * Registrars are carried in a jCard array, whose shape is [ "vcard", [ [name, {}, type,
 * value], ... ] ]. Only the display name is worth surfacing here.
 */
const organisations = computed(() =>
  (result.value?.entities ?? [])
    .map((entity) => {
      const card = entity.vcardArray as [string, [string, object, string, string][]] | null
      const fn = card?.[1]?.find((entry) => entry[0] === 'fn')?.[3]
      return fn ? { roles: entity.roles.join(', '), name: fn } : null
    })
    .filter((e): e is { roles: string; name: string } => e !== null),
)
</script>

<template>
  <ToolPage :title="t('tools.rdap.name')" :description="t('tools.rdap.description')">
    <ToolPanel>
      <label class="flex flex-1 flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.rdap.domain') }}</span>
        <input
          v-model="name"
          type="text"
          placeholder="example.com"
          class="w-full min-w-[200px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
          @keydown.enter="lookup"
        />
      </label>
      <button
        type="button"
        :disabled="loading"
        class="cursor-pointer border border-accent bg-accent px-[18px] py-2 font-mono text-[11px] tracking-[.12em] text-onaccent uppercase transition hover:opacity-90 disabled:opacity-50"
        @click="lookup"
      >
        {{ loading ? t('tools.rdap.loading') : t('tools.rdap.lookup') }}
      </button>
    </ToolPanel>

    <p v-if="error" class="m-0 font-mono text-[12px] text-red-600">{{ error }}</p>

    <template v-if="result">
      <div class="border border-line bg-panel">
        <div
          v-for="row in [
            { key: 'domain', value: result.ldhName ?? '—' },
            { key: 'handle', value: result.handle ?? '—' },
            { key: 'dnssec', value: result.secureDNS?.delegationSigned ? t('tools.rdap.signed') : t('tools.rdap.unsigned') },
          ]"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{ t(`tools.rdap.${row.key}`) }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="String(row.value)" />
        </div>
      </div>

      <div v-if="events.length" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.rdap.events') }}</span>
        </div>
        <div
          v-for="(event, i) in events"
          :key="i"
          class="grid grid-cols-[minmax(140px,200px)_minmax(0,1fr)] items-center gap-3.5 border-b border-hair px-3.5 py-2 last:border-b-0"
        >
          <span class="font-mono text-[11.5px] text-mute">{{ event.action }}</span>
          <span class="font-mono text-[13px]">{{ event.date }}</span>
        </div>
      </div>

      <div v-if="organisations.length" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.rdap.entities') }}</span>
        </div>
        <div
          v-for="(org, i) in organisations"
          :key="i"
          class="grid grid-cols-[minmax(140px,200px)_minmax(0,1fr)] items-center gap-3.5 border-b border-hair px-3.5 py-2 last:border-b-0"
        >
          <span class="font-mono text-[11.5px] text-accent">{{ org.roles }}</span>
          <span class="text-[13px]">{{ org.name }}</span>
        </div>
      </div>

      <div v-if="result.nameservers.length" class="border border-line bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.rdap.nameservers') }}</span>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <span v-for="ns in result.nameservers" :key="ns" class="border border-hair px-2 py-1 font-mono text-[12px]">{{ ns }}</span>
        </div>
      </div>

      <div v-if="result.status.length" class="border border-line bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.rdap.status') }}</span>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <span v-for="s in result.status" :key="s" class="border border-hair px-2 py-1 font-mono text-[12px]">{{ s }}</span>
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.rdap.note') }}</p>
  </ToolPage>
</template>
