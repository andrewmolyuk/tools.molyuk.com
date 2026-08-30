<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { type Certificate, expiryOf, fingerprints, formatName, parseCertificate, splitPemChain } from './x509'

const { t, locale } = useI18n()

const input = ref('')
const prints = ref<Record<number, { sha1: string; sha256: string }>>({})

const certificates = computed<{ list: Certificate[]; error: null } | { list: []; error: string }>(() => {
  if (!input.value.trim()) return { list: [], error: null }
  try {
    return { list: splitPemChain(input.value).map(parseCertificate), error: null }
  } catch (e) {
    return { list: [], error: e instanceof Error ? e.message : String(e) }
  }
})

/** Digests are async, so they arrive after the synchronous fields. */
watch(
  certificates,
  async (value) => {
    prints.value = {}
    for (const [index, cert] of value.list.entries()) {
      prints.value = { ...prints.value, [index]: await fingerprints(cert.der) }
    }
  },
  { immediate: true },
)

const dateFormat = (d: Date) => d.toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })

function summary(cert: Certificate) {
  const expiry = expiryOf(cert)
  return {
    expiry,
    cls: expiry.state === 'valid' ? (expiry.days < 30 ? 'text-amber-600' : 'text-accent') : 'text-red-600',
  }
}

function rowsFor(cert: Certificate, index: number) {
  const fp = prints.value[index]
  return [
    { key: 'subject', value: formatName(cert.subject) },
    { key: 'issuer', value: formatName(cert.issuer) },
    { key: 'serial', value: cert.serialNumber },
    { key: 'signature', value: cert.signatureAlgorithm },
    {
      key: 'publicKey',
      value: [cert.publicKey.algorithm, cert.publicKey.size ? `${cert.publicKey.size} ${t('tools.x509.bits')}` : null, cert.publicKey.curve]
        .filter(Boolean)
        .join(' · '),
    },
    { key: 'notBefore', value: dateFormat(cert.notBefore) },
    { key: 'notAfter', value: dateFormat(cert.notAfter) },
    ...(fp ? [{ key: 'sha256', value: fp.sha256 }, { key: 'sha1', value: fp.sha1 }] : []),
  ]
}
</script>

<template>
  <ToolPage :title="t('tools.x509.name')" :description="t('tools.x509.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{ t('tools.x509.input') }}</span>
      <textarea
        v-model="input"
        rows="8"
        spellcheck="false"
        placeholder="-----BEGIN CERTIFICATE-----"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[12.5px] leading-relaxed break-all outline-none"
        :class="certificates.error ? 'text-red-600' : ''"
      />
      <p class="mt-2 m-0 font-mono text-[11px] text-mute">{{ t('tools.x509.chainHint') }}</p>
    </div>

    <p v-if="certificates.error" class="m-0 font-mono text-[12px] text-red-600">
      {{ t('tools.x509.invalid') }} — {{ certificates.error }}
    </p>

    <template v-for="(cert, index) in certificates.list" :key="index">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">
          {{ certificates.list.length > 1 ? `${t('tools.x509.certificate')} ${index + 1}` : t('tools.x509.certificate') }}
        </span>
        <span v-if="cert.isCa" class="border border-line px-2 py-0.5 font-mono text-[10px] text-accent">CA</span>
        <span class="h-px flex-1 bg-line"></span>
        <span class="font-mono text-[10px]" :class="summary(cert).cls">
          {{ t(`tools.x509.expiry_${summary(cert).expiry.state}`) }}
          <template v-if="summary(cert).expiry.state === 'valid'">
            · {{ summary(cert).expiry.days }} {{ t('tools.x509.days') }}
          </template>
        </span>
      </div>

      <div class="border border-line bg-panel">
        <div
          v-for="row in rowsFor(cert, index)"
          :key="row.key"
          class="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0 hover:bg-paper"
        >
          <span class="font-mono text-[11px] tracking-[.06em] text-mute">{{ t(`tools.x509.${row.key}`) }}</span>
          <span class="font-mono text-[12.5px] break-all">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>

      <div v-if="cert.subjectAltNames.length" class="border border-line bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
            {{ t('tools.x509.san') }} · {{ cert.subjectAltNames.length }}
          </span>
          <CopyButton :text="cert.subjectAltNames.join('\n')" />
        </div>
        <div class="mt-2.5 flex flex-wrap gap-2">
          <span v-for="name in cert.subjectAltNames" :key="name" class="border border-hair px-2 py-1 font-mono text-[12px]">
            {{ name }}
          </span>
        </div>
      </div>

      <div v-if="cert.extensions.length" class="border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('tools.x509.extensions') }}</span>
        </div>
        <div
          v-for="ext in cert.extensions"
          :key="ext.oid"
          class="grid grid-cols-[minmax(140px,200px)_minmax(0,1fr)] items-start gap-3.5 border-b border-hair px-3.5 py-2.5 last:border-b-0"
        >
          <span class="font-mono text-[11px] break-all" :class="ext.critical ? 'text-accent' : 'text-mute'">
            {{ ext.name }}<span v-if="ext.critical"> *</span>
          </span>
          <span class="font-mono text-[12px] break-all">{{ ext.value ?? ext.oid }}</span>
        </div>
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.x509.note') }}</p>
  </ToolPage>
</template>
