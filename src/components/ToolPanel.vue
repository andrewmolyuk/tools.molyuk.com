<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ label?: string }>()
</script>

<template>
  <div class="border border-line bg-panel">
    <div class="border-b border-line px-3.5 py-2.5">
      <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
        props.label ?? t('common.parameters')
      }}</span>
    </div>
    <div class="flex flex-wrap items-end gap-5 px-3.5 py-4.5">
      <slot />
    </div>
  </div>
</template>
