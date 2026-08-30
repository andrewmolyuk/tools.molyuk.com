<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import ToolPanel from '../../components/ToolPanel.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'
import { EC_LEVELS, type EcLevel, QrTooLong, byteCapacity, encodeQr, toSvg } from './qr'

const { t } = useI18n()

const input = ref('https://tools.molyuk.com')
const level = ref<EcLevel>('M')
const moduleSize = ref(8)

const result = computed(() => {
  if (!input.value) return null
  try {
    return { qr: encodeQr(input.value, level.value), error: null }
  } catch (e) {
    return { qr: null, error: e instanceof QrTooLong ? 'tooLong' : 'failed' }
  }
})

const svg = computed(() => {
  const qr = result.value?.qr
  return qr ? toSvg(qr, moduleSize.value) : ''
})

/** Inline SVG rather than a blob URL, so nothing is fetched to render the preview. */
const dataUri = computed(() => (svg.value ? `data:image/svg+xml;utf8,${encodeURIComponent(svg.value)}` : ''))

const byteLength = computed(() => new TextEncoder().encode(input.value).length)
const capacity = computed(() => byteCapacity(10, level.value))
</script>

<template>
  <ToolPage :title="t('tools.qr.name')" :description="t('tools.qr.description')">
    <div class="border border-line bg-panel p-3.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('tools.qr.input')
      }}</span>
      <textarea
        v-model="input"
        rows="3"
        :placeholder="t('common.inputPlaceholder')"
        class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        :class="result?.error ? 'text-red-600' : ''"
      />
      <p class="mt-2 m-0 font-mono text-[11px]" :class="byteLength > capacity ? 'text-red-600' : 'text-mute'">
        {{ byteLength }} / {{ capacity }} {{ t('tools.qr.bytes') }}
      </p>
    </div>

    <ToolPanel>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.qr.level')
        }}</span>
        <select
          v-model="level"
          class="border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        >
          <option v-for="l in EC_LEVELS" :key="l" :value="l">
            {{ l }} · {{ t(`tools.qr.level${l}`) }}
          </option>
        </select>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
          t('tools.qr.moduleSize')
        }}</span>
        <input
          v-model.number="moduleSize"
          type="number"
          min="2"
          max="24"
          class="w-[88px] border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none"
        />
      </label>
      <span v-if="result?.qr" class="pb-2 font-mono text-[11px] text-mute">
        {{ t('tools.qr.version') }} {{ result.qr.version }} · {{ result.qr.size }}×{{ result.qr.size }} ·
        {{ t('tools.qr.mask') }} {{ result.qr.mask }}
      </span>
    </ToolPanel>

    <p v-if="result?.error" class="m-0 font-mono text-[12px] text-red-600">
      {{ result.error === 'tooLong' ? t('tools.qr.tooLong') : t('tools.qr.failed') }}
    </p>

    <template v-if="svg">
      <div class="flex flex-wrap items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
          t('common.output')
        }}</span>
        <span class="h-px flex-1 bg-line"></span>
        <DownloadButton :text="svg" filename="qr.svg" />
        <CopyButton :text="svg" />
      </div>
      <div class="flex justify-center border border-line bg-panel p-6">
        <img :src="dataUri" :alt="t('tools.qr.name')" class="max-w-full" />
      </div>
    </template>

    <p class="m-0 text-[12px] leading-[1.5] text-mute">{{ t('tools.qr.note') }}</p>
  </ToolPage>
</template>
