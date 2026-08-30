<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { tools } from '../tools/registry'

const { t } = useI18n()
const route = useRoute()

/**
 * Suggests tools whose slug is close to what was typed. Slugs are top-level paths now,
 * so a near miss like /base46 is the likeliest way to land here — and the fix is one
 * click away rather than a trip back through the index.
 */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) rows[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1][j - 1]
          : 1 + Math.min(rows[i - 1][j - 1], rows[i - 1][j], rows[i][j - 1])
    }
  }
  return rows[a.length][b.length]
}

const attempted = computed(() => route.path.replace(/^\/+/, '').toLowerCase())

const suggestions = computed(() => {
  const typed = attempted.value
  if (!typed) return []
  // The tolerance has to scale with what was typed. A flat allowance of three edits
  // makes every short path match something — "/x" would land on "qr" — and a wrong
  // suggestion is worse than none, so short inputs get almost no slack.
  const tolerance = typed.length <= 4 ? 1 : typed.length <= 7 ? 2 : 3

  return tools
    .map((tool) => {
      const slug = tool.meta.slug
      // Containment beats edit distance ("qrcode" → "qr"), but only once the typed text
      // is long enough that the overlap means something.
      const contained = typed.length >= 3 && (slug.includes(typed) || typed.includes(slug))
      return { tool, score: contained ? 0 : distance(typed, slug) }
    })
    .filter(({ score }) => score <= tolerance)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ tool }) => tool)
})
</script>

<template>
  <div class="w-full max-w-[1080px] flex-1 px-6 py-9 sm:px-10 sm:py-11">
    <div class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">
      {{ t('notFound.kicker') }}
    </div>
    <h1 class="mt-2.5 m-0 text-[64px] leading-none font-semibold tracking-[-.04em] text-accent sm:text-[80px]">
      404
    </h1>
    <p class="mt-4 mb-0 max-w-[560px] text-[15px] leading-[1.55] text-mute">
      {{ t('notFound.description') }}
    </p>

    <div v-if="attempted" class="mt-5 inline-flex max-w-full items-center gap-2.5 border border-line bg-panel px-3.5 py-2.5">
      <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">{{
        t('notFound.requested')
      }}</span>
      <span class="truncate font-mono text-[13px]">/{{ attempted }}</span>
    </div>

    <template v-if="suggestions.length">
      <div class="mt-9 flex items-center gap-2.5">
        <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
          t('notFound.didYouMean')
        }}</span>
        <span class="h-px flex-1 bg-line"></span>
      </div>
      <div class="mt-3.5 flex flex-wrap gap-3">
        <RouterLink
          v-for="tool in suggestions"
          :key="tool.meta.slug"
          :to="`/${tool.meta.slug}`"
          class="flex w-[260px] max-w-full flex-col gap-1.5 border border-line bg-panel px-[18px] py-4 text-left transition hover:bg-paper"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono text-[11px] text-accent">{{
              String(tool.meta.order).padStart(2, '0')
            }}</span>
            <span class="font-mono text-[9px] tracking-[.14em] text-mute uppercase">{{
              t(`categories.${tool.meta.categoryId}`)
            }}</span>
          </div>
          <div class="text-[15px] font-semibold tracking-[-.02em] text-ink">
            {{ t(tool.meta.nameKey) }}
          </div>
          <div class="font-mono text-[11px] text-mute">/{{ tool.meta.slug }}</div>
        </RouterLink>
      </div>
    </template>

    <div class="mt-9">
      <!--
        text-onaccent needs the ! here: style.css sets `a { color: var(--color-accent) }`
        outside any cascade layer, and unlayered rules beat Tailwind's layered utilities
        no matter the specificity. Without it the label is accent-on-accent, i.e. invisible.
      -->
      <RouterLink
        to="/"
        class="inline-block border border-accent bg-accent px-[18px] py-2.5 font-mono text-[11px] tracking-[.12em] text-onaccent! uppercase transition hover:opacity-90"
      >
        {{ t('notFound.backHome') }}
      </RouterLink>
    </div>
  </div>
</template>
