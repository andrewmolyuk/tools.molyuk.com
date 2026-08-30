<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { tools } from '../tools/registry'

const { t } = useI18n()
</script>

<template>
  <div class="w-full max-w-[1080px] flex-1 px-6 py-9 sm:px-10 sm:py-11">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div class="max-w-[520px]">
        <h1 class="m-0 text-[32px] leading-[1.08] font-semibold tracking-[-.03em] sm:text-[38px]">
          {{ t('home.title') }}
        </h1>
        <p class="mt-3.5 text-[15px] leading-[1.55] text-mute">{{ t('home.description') }}</p>
      </div>
      <div class="text-right font-mono text-[10px] leading-[1.9] text-mute">
        <div>REV&nbsp;2026.08</div>
        <div>TOOLS&nbsp;{{ String(tools.length).padStart(2, '0') }}</div>
        <div>DEPS&nbsp;0</div>
      </div>
    </div>

    <div class="my-9 flex items-center gap-2.5">
      <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{ t('home.index') }}</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-px border border-line bg-line">
      <RouterLink
        v-for="tool in tools"
        :key="tool.meta.slug"
        :to="`/${tool.meta.slug}`"
        class="flex min-h-[150px] flex-col gap-2.5 bg-panel px-[18px] pt-5 pb-[18px] text-left transition hover:bg-paper"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono text-[11px] text-accent">{{
            String(tool.meta.order).padStart(2, '0')
          }}</span>
          <span class="font-mono text-[9px] tracking-[.14em] text-mute uppercase">{{
            t(`categories.${tool.meta.categoryId}`)
          }}</span>
        </div>
        <div class="text-[17px] font-semibold tracking-[-.02em] text-ink">{{ t(tool.meta.nameKey) }}</div>
        <p class="m-0 text-[13px] leading-[1.5] text-mute">{{ t(tool.meta.descriptionKey) }}</p>
        <div class="mt-auto flex items-center gap-1.5 font-mono text-[10px] tracking-[.1em] text-mute uppercase">
          <span class="h-px w-3.5 bg-accent"></span>{{ t('home.open') }}
        </div>
      </RouterLink>
    </div>
  </div>
</template>
