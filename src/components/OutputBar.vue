<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CopyButton from './CopyButton.vue'
import DownloadButton from './DownloadButton.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    label?: string
    status?: string
    statusClass?: string
    copyText?: string
    downloadFilename?: string
  }>(),
  { statusClass: 'text-mute' },
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5">
    <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
      props.label ?? t('common.output')
    }}</span>
    <span class="h-px flex-1 bg-line"></span>
    <span v-if="status" class="font-mono text-[10px]" :class="statusClass">{{ status }}</span>
    <DownloadButton v-if="copyText && downloadFilename" :text="copyText" :filename="downloadFilename" />
    <CopyButton v-if="copyText" :text="copyText" />
  </div>
</template>
