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

const { t } = useI18n()

const config = ref<AvatarConfig>(randomAvatarConfig())

const svgMarkup = computed(() => assembleAvatarSvg(config.value))
const previewUrl = computed(
  () => `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup.value)}`,
)

function randomize() {
  config.value = randomAvatarConfig()
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
</script>

<template>
  <ToolPage :title="t('tools.randomAvatar.name')" :description="t('tools.randomAvatar.description')">
    <div class="flex flex-col gap-6 lg:flex-row">
      <div
        class="flex shrink-0 flex-col items-center gap-3 self-start border border-line bg-panel p-5"
      >
        <div
          class="flex h-[240px] w-[228px] items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#00000010_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
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
        <p class="mt-1 max-w-[228px] text-center text-[11px] leading-snug text-mute">
          {{ t('tools.randomAvatar.credit') }}
          <a href="https://twitter.com/pablostanley" target="_blank" rel="noopener">Pablo Stanley</a>
          ·
          <a href="https://avataaars.com" target="_blank" rel="noopener">avataaars.com</a>
        </p>
      </div>

      <div class="flex-1 border border-line bg-panel">
        <div class="border-b border-line px-3.5 py-2.5">
          <span :class="labelClass">{{ t('common.parameters') }}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-4 p-3.5 sm:grid-cols-3">
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.skin') }}</span>
            <select v-model="config.skinId" :class="selectClass">
              <option v-for="o in SKIN_TONES" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.hairColor') }}</span>
            <select v-model="config.hairColorId" :class="selectClass">
              <option v-for="o in HAIR_COLORS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.top') }}</span>
            <select v-model="config.topId" :class="selectClass">
              <option v-for="o in TOPS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.accessory') }}</span>
            <select v-model="config.accessoryId" :class="selectClass">
              <option v-for="o in ACCESSORIES" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.facialHair') }}</span>
            <select v-model="config.facialHairId" :class="selectClass">
              <option v-for="o in FACIAL_HAIR" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.eyes') }}</span>
            <select v-model="config.eyesId" :class="selectClass">
              <option v-for="o in EYES" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.eyebrow') }}</span>
            <select v-model="config.eyebrowId" :class="selectClass">
              <option v-for="o in EYEBROWS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.mouth') }}</span>
            <select v-model="config.mouthId" :class="selectClass">
              <option v-for="o in MOUTHS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.clothes') }}</span>
            <select v-model="config.clothesId" :class="selectClass">
              <option v-for="o in CLOTHES" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.clothColor') }}</span>
            <select v-model="config.clothColorId" :class="selectClass">
              <option v-for="o in PALETTE_COLORS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 pb-2 text-[13px]">
            <input v-model="config.background" type="checkbox" class="h-3.5 w-3.5" />
            {{ t('tools.randomAvatar.background') }}
          </label>
          <label v-if="config.background" class="flex flex-col gap-1.5">
            <span :class="labelClass">{{ t('tools.randomAvatar.bgColor') }}</span>
            <select v-model="config.bgColorId" :class="selectClass">
              <option v-for="o in PALETTE_COLORS" :key="o.id" :value="o.id">{{ o.label }}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
