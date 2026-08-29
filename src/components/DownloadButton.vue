<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { downloadText } from '../utils/download'

const { t } = useI18n()

const props = defineProps<{
  text: string
  filename: string
}>()

function download() {
  if (!props.text) return
  downloadText(props.filename, props.text)
}
</script>

<template>
  <button
    type="button"
    class="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-mono text-[10px] tracking-[.08em] text-ink uppercase transition hover:border-accent hover:text-accent"
    @click="download"
  >
    {{ t('common.download') }}
  </button>
</template>
