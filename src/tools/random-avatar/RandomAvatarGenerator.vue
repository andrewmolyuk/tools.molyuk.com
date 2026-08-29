<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import { downloadBlob, downloadText } from '../../utils/download'
import {
  ACCESSORIES,
  CLOTHES,
  EYEBROWS,
  EYES,
  FACIAL_HAIR,
  HAIR_COLORS,
  MOUTHS,
  PALETTE_COLORS,
  SKIN_TONES,
  TOPS,
  assembleAvatarSvg,
  randomAvatarConfig,
  type AvatarConfig,
} from './avatar'

const { t, locale } = useI18n()

function optLabel(o: { label: string; labelRu: string }): string {
  return locale.value === 'ru' ? o.labelRu : o.label
}

const config = ref<AvatarConfig>(randomAvatarConfig())

/** Every field the panel exposes as a select; the nose has no control. */
const FIELDS = [
  'skinId',
  'hairColorId',
  'topId',
  'accessoryId',
  'facialHairId',
  'eyesId',
  'eyebrowId',
  'mouthId',
  'clothesId',
  'clothColorId',
  'backgroundStyle',
  'bgColorId',
] as const

type Field = (typeof FIELDS)[number]

const included = ref<Record<Field, boolean>>(
  Object.fromEntries(FIELDS.map((f) => [f, true])) as Record<Field, boolean>,
)

const svgMarkup = computed(() => assembleAvatarSvg(config.value))
const previewUrl = computed(
  () => `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup.value)}`,
)

function randomize() {
  const next = randomAvatarConfig()
  const merged: Record<string, unknown> = { ...config.value }
  for (const field of FIELDS) {
    if (included.value[field]) merged[field] = next[field]
  }
  config.value = merged as unknown as AvatarConfig
}

function downloadSvg() {
  downloadText('avatar.svg', svgMarkup.value)
}

function downloadPng() {
  const svg = svgMarkup.value
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const scale = 4
    const canvas = document.createElement('canvas')
    canvas.width = 264 * scale
    canvas.height = 280 * scale
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob('avatar.png', blob)
    }, 'image/png')
  }
  img.src = url
}

const selectClass =
  'border border-line bg-field px-2.5 py-1.5 font-mono text-[13px] outline-none'
const labelClass = 'font-mono text-[9px] tracking-[.16em] text-mute uppercase'
const captionClass = 'flex cursor-pointer items-center gap-1.5'
const checkClass = 'h-3 w-3 shrink-0 cursor-pointer'
</script>

<template>
  <ToolPage :title="t('tools.randomAvatar.name')" :description="t('tools.randomAvatar.description')">
    <div class="flex flex-col gap-6 lg:flex-row">
      <div
        class="flex shrink-0 flex-col items-center gap-3 self-start border border-line bg-panel p-5"
      >
        <div
          class="flex h-[240px] w-[228px] items-center justify-center overflow-hidden"
          :class="
            config.backgroundStyle === 'full'
              ? 'bg-field'
              : 'bg-[repeating-conic-gradient(#00000010_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]'
          "
        >
          <img :src="previewUrl" width="228" height="242" alt="" class="h-full w-full" />
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            class="cursor-pointer border border-accent bg-accent px-3.5 py-1.5 font-mono text-[10px] tracking-[.1em] text-onaccent uppercase transition hover:opacity-90"
            @click="randomize"
          >
            🎲 {{ t('tools.randomAvatar.randomize') }}
          </button>
          <button
            type="button"
            class="cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
            @click="downloadPng"
          >
            {{ t('tools.randomAvatar.downloadPng') }}
          </button>
          <button
            type="button"
            class="cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
            @click="downloadSvg"
          >
            {{ t('tools.randomAvatar.downloadSvg') }}
          </button>
          <CopyButton :text="svgMarkup" />
        </div>
      </div>

      <div class="flex-1 border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span :class="labelClass">{{ t('common.parameters') }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-4 p-3.5 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.skinId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.skin') }}</span>
            </label>
            <select v-model="config.skinId" :class="selectClass">
              <option v-for="o in SKIN_TONES" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.hairColorId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.hairColor') }}</span>
            </label>
            <select v-model="config.hairColorId" :class="selectClass">
              <option v-for="o in HAIR_COLORS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.topId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.top') }}</span>
            </label>
            <select v-model="config.topId" :class="selectClass">
              <option v-for="o in TOPS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.accessoryId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.accessory') }}</span>
            </label>
            <select v-model="config.accessoryId" :class="selectClass">
              <option v-for="o in ACCESSORIES" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.facialHairId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.facialHair') }}</span>
            </label>
            <select v-model="config.facialHairId" :class="selectClass">
              <option v-for="o in FACIAL_HAIR" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.eyesId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.eyes') }}</span>
            </label>
            <select v-model="config.eyesId" :class="selectClass">
              <option v-for="o in EYES" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.eyebrowId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.eyebrow') }}</span>
            </label>
            <select v-model="config.eyebrowId" :class="selectClass">
              <option v-for="o in EYEBROWS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.mouthId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.mouth') }}</span>
            </label>
            <select v-model="config.mouthId" :class="selectClass">
              <option v-for="o in MOUTHS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.clothesId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.clothes') }}</span>
            </label>
            <select v-model="config.clothesId" :class="selectClass">
              <option v-for="o in CLOTHES" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.clothColorId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.clothColor') }}</span>
            </label>
            <select v-model="config.clothColorId" :class="selectClass">
              <option v-for="o in PALETTE_COLORS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.backgroundStyle" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.background') }}</span>
            </label>
            <select v-model="config.backgroundStyle" :class="selectClass">
              <option value="full">{{ t('tools.randomAvatar.bgFull') }}</option>
              <option value="circle">{{ t('tools.randomAvatar.bgCircle') }}</option>
              <option value="transparent">{{ t('tools.randomAvatar.bgTransparent') }}</option>
            </select>
          </div>
          <div v-if="config.backgroundStyle !== 'transparent'" class="flex flex-col gap-1.5">
            <label :class="captionClass" :title="t('tools.randomAvatar.includeHint')">
              <input v-model="included.bgColorId" type="checkbox" :class="checkClass" />
              <span :class="labelClass">{{ t('tools.randomAvatar.bgColor') }}</span>
            </label>
            <select v-model="config.bgColorId" :class="selectClass">
              <option v-for="o in PALETTE_COLORS" :key="o.id" :value="o.id">{{ optLabel(o) }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
