<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import OutputBar from '../../components/OutputBar.vue'
import CopyButton from '../../components/CopyButton.vue'
import { bigIntToIPv6, intToIpv4, ipv4ToInt, ipv6ToBigInt } from '../ip-list/ip'

const { t } = useI18n()

const input = ref('192.168.1.0/24')

interface Row {
  labelKey: string
  value: string
}

/** RFC 1918 / 5735 / 3927 ranges, matched by prefix length so the check stays exact. */
const IPV4_SCOPES: { base: string; prefix: number; key: string }[] = [
  { base: '10.0.0.0', prefix: 8, key: 'private' },
  { base: '172.16.0.0', prefix: 12, key: 'private' },
  { base: '192.168.0.0', prefix: 16, key: 'private' },
  { base: '127.0.0.0', prefix: 8, key: 'loopback' },
  { base: '169.254.0.0', prefix: 16, key: 'linkLocal' },
  { base: '224.0.0.0', prefix: 4, key: 'multicast' },
  { base: '100.64.0.0', prefix: 10, key: 'cgnat' },
  { base: '0.0.0.0', prefix: 8, key: 'reserved' },
]

function maskFor(prefix: number): number {
  return prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
}

function scopeOf(ip: number): string {
  for (const scope of IPV4_SCOPES) {
    const mask = maskFor(scope.prefix)
    if ((ip & mask) >>> 0 === (ipv4ToInt(scope.base) & mask) >>> 0) return scope.key
  }
  return 'public'
}

function splitCidr(text: string): { addr: string; prefixPart?: string } {
  const [addr, prefixPart] = text.trim().split('/')
  return { addr, prefixPart }
}

function calcIPv4(addr: string, prefixPart?: string): Row[] {
  const prefix = prefixPart === undefined ? 32 : Number(prefixPart)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(t('errors.prefixRange4'))
  }
  const ip = ipv4ToInt(addr)
  const mask = maskFor(prefix)
  const network = (ip & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)
  // /31 is a point-to-point link (RFC 3021) and /32 a single host: neither reserves
  // a network and broadcast address, so all of their addresses are usable.
  const usable = prefix >= 31 ? total : total - 2
  const firstHost = prefix >= 31 ? network : network + 1
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1

  return [
    { labelKey: 'network', value: `${intToIpv4(network)}/${prefix}` },
    { labelKey: 'netmask', value: intToIpv4(mask) },
    { labelKey: 'wildcard', value: intToIpv4(~mask >>> 0) },
    { labelKey: 'broadcast', value: prefix >= 31 ? '—' : intToIpv4(broadcast) },
    { labelKey: 'firstHost', value: intToIpv4(firstHost) },
    { labelKey: 'lastHost', value: intToIpv4(lastHost) },
    { labelKey: 'totalAddresses', value: total.toLocaleString('en-US') },
    { labelKey: 'usableHosts', value: usable.toLocaleString('en-US') },
    { labelKey: 'scope', value: t(`tools.cidr.scope_${scopeOf(network)}`) },
  ]
}

function calcIPv6(addr: string, prefixPart?: string): Row[] {
  const prefix = prefixPart === undefined ? 128 : Number(prefixPart)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
    throw new Error(t('errors.prefixRange6'))
  }
  const ip = ipv6ToBigInt(addr)
  const hostBits = BigInt(128 - prefix)
  const full = (1n << 128n) - 1n
  const mask = hostBits === 0n ? full : (full << hostBits) & full
  const network = ip & mask
  const last = network | (full ^ mask)

  return [
    { labelKey: 'network', value: `${bigIntToIPv6(network)}/${prefix}` },
    { labelKey: 'firstAddress', value: bigIntToIPv6(network) },
    { labelKey: 'lastAddress', value: bigIntToIPv6(last) },
    { labelKey: 'totalAddresses', value: (1n << hostBits).toLocaleString('en-US') },
    { labelKey: 'prefixLength', value: `/${prefix}` },
  ]
}

const parsed = computed<{ rows: Row[]; version: 4 | 6 } | { error: string } | null>(() => {
  const text = input.value.trim()
  if (!text) return null
  const { addr, prefixPart } = splitCidr(text)
  if (!addr) return { error: t('errors.enterCidr4') }
  try {
    const version = addr.includes(':') ? 6 : 4
    return version === 6
      ? { rows: calcIPv6(addr, prefixPart), version: 6 }
      : { rows: calcIPv4(addr, prefixPart), version: 4 }
  } catch (e) {
    return { error: e instanceof Error ? e.message : t('errors.invalidInput') }
  }
})

const rows = computed(() => (parsed.value && 'rows' in parsed.value ? parsed.value.rows : []))
const error = computed(() => (parsed.value && 'error' in parsed.value ? parsed.value.error : null))
const version = computed(() => (parsed.value && 'rows' in parsed.value ? parsed.value.version : null))

const allText = computed(() => {
  if (!rows.value.length) return undefined
  return rows.value.map((row) => `${t(`tools.cidr.${row.labelKey}`)}: ${row.value}`).join('\n')
})
</script>

<template>
  <ToolPage :title="t('tools.cidr.name')" :description="t('tools.cidr.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.cidr.input')
      }}</span>
      <input
        v-model="input"
        type="text"
        :placeholder="t('tools.cidr.placeholder')"
        class="mt-2.5 w-full border border-line bg-field px-2.5 py-2 font-mono text-[13px] outline-none"
        :class="error ? 'text-red-600' : ''"
      />
    </div>

    <p v-if="error" class="m-0 font-mono text-[12px] text-red-600">{{ error }}</p>

    <template v-if="rows.length">
      <OutputBar
        :status="version === 6 ? 'IPv6' : 'IPv4'"
        status-class="text-accent"
        :copy-text="allText"
        :download-filename="allText ? 'cidr.txt' : undefined"
      />
      <div class="border border-line bg-panel">
        <div
          v-for="row in rows"
          :key="row.labelKey"
          class="grid grid-cols-[minmax(120px,180px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{
            t(`tools.cidr.${row.labelKey}`)
          }}</span>
          <span class="font-mono text-[13px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>
  </ToolPage>
</template>
