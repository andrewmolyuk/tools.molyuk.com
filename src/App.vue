<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { setLocale, type Locale } from './i18n'
import { tools, toolGroups } from './tools/registry'

const { t, locale } = useI18n()
const route = useRoute()

const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return toolGroups
  return toolGroups
    .map((group) => ({
      categoryId: group.categoryId,
      tools: group.tools.filter((tool) => t(tool.meta.nameKey).toLowerCase().includes(q)),
    }))
    .filter((group) => group.tools.length > 0)
})

const activeTool = computed(() => tools.find((tool) => `/tools/${tool.meta.slug}` === route.path))

type Theme = 'auto' | 'light' | 'dark'
const THEME_KEY = 'tm-theme'
const theme = ref<Theme>((localStorage.getItem(THEME_KEY) as Theme | null) ?? 'auto')

function applyTheme(value: Theme) {
  if (value === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = value
}

function setTheme(value: Theme) {
  theme.value = value
  localStorage.setItem(THEME_KEY, value)
  applyTheme(value)
}

applyTheme(theme.value)

function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="bg-grid flex min-h-screen bg-paper text-ink">
    <aside
      class="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-line bg-panel sm:flex"
    >
      <div class="relative border-b border-line px-5 pt-[22px] pb-4">
        <div class="absolute bottom-[-1px] left-0 h-3.5 w-3.5 border-b border-l border-accent"></div>
        <div class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">
          {{ t('app.kicker') }}
        </div>
        <RouterLink to="/" class="mt-[9px] flex items-baseline gap-1.5">
          <span class="text-[17px] font-semibold tracking-[-.02em] text-ink">tools</span>
          <span class="font-mono text-xs text-mute">.molyuk.com</span>
        </RouterLink>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 bg-accent"></span>
          <span class="font-mono text-[10px] tracking-[.1em] text-mute uppercase">
            {{ t('app.badge') }}
          </span>
        </div>
      </div>

      <div class="px-4 pt-3.5 pb-2.5">
        <div class="flex items-center gap-2 border border-line bg-field px-2.5 py-1.5">
          <span class="font-mono text-[11px] text-mute">/</span>
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            :placeholder="t('app.filterPlaceholder')"
            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-mute"
          />
        </div>
      </div>

      <nav class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-1.5 pb-4">
        <div v-for="group in filteredGroups" :key="group.categoryId" class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[9px] tracking-[.18em] text-mute uppercase">{{
              t(`categories.${group.categoryId}`)
            }}</span>
            <span class="h-px flex-1 bg-hair"></span>
          </div>
          <div class="flex flex-col">
            <RouterLink
              v-for="tool in group.tools"
              :key="tool.meta.slug"
              :to="`/tools/${tool.meta.slug}`"
              class="grid grid-cols-[26px_1fr] items-center gap-2 border-l-2 border-transparent px-2 py-1.5 text-[13px] font-medium text-ink transition hover:bg-hair"
              active-class="border-accent bg-hair"
            >
              <span class="font-mono text-[10px] text-mute">{{
                String(tool.meta.order).padStart(2, '0')
              }}</span>
              <span>{{ t(tool.meta.nameKey) }}</span>
            </RouterLink>
          </div>
        </div>
        <p v-if="filteredGroups.length === 0" class="px-2 font-mono text-xs text-mute">
          {{ t('app.noResults') }}
        </p>
      </nav>

      <div class="border-t border-line px-4 pt-3 pb-2.5">
        <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
          {{ t('app.lang.label') }}
        </div>
        <div class="mt-2 grid grid-cols-2 gap-px border border-line bg-line">
          <button
            v-for="opt in (['ru', 'en'] as const)"
            :key="opt"
            type="button"
            class="cursor-pointer border-0 py-1.5 font-mono text-[10px] tracking-[.08em] uppercase transition hover:opacity-85"
            :class="locale === opt ? 'bg-accent text-onaccent' : 'bg-field text-ink'"
            @click="setLocale(opt as Locale)"
          >
            {{ opt }}
          </button>
        </div>
      </div>

      <div class="border-t border-line px-4 pt-3 pb-2.5">
        <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
          {{ t('app.theme.label') }}
        </div>
        <div class="mt-2 grid grid-cols-3 gap-px border border-line bg-line">
          <button
            v-for="opt in (['light', 'dark', 'auto'] as const)"
            :key="opt"
            type="button"
            class="cursor-pointer border-0 py-1.5 font-mono text-[10px] tracking-[.08em] uppercase transition hover:opacity-85"
            :class="theme === opt ? 'bg-accent text-onaccent' : 'bg-field text-ink'"
            @click="setTheme(opt)"
          >
            {{ t(`app.theme.${opt}`) }}
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="border-b border-line bg-panel">
        <div class="grid grid-cols-[72px_minmax(0,1fr)_120px_110px] sm:grid-cols-[96px_minmax(0,1fr)_160px_132px]">
          <div class="border-r border-line px-3.5 py-3">
            <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
              {{ t('header.sheet') }}
            </div>
            <div class="mt-1 font-mono text-sm text-accent">
              {{ activeTool ? String(activeTool.meta.order).padStart(2, '0') : '00' }}
            </div>
          </div>
          <div class="min-w-0 border-r border-line px-3.5 py-3">
            <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
              {{ t('header.tool') }}
            </div>
            <div class="mt-1 truncate text-sm font-semibold tracking-[-.01em]">
              {{ activeTool ? t(activeTool.meta.nameKey) : t('header.overview') }}
            </div>
          </div>
          <div class="border-r border-line px-3.5 py-3">
            <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
              {{ t('header.category') }}
            </div>
            <div class="mt-1 truncate font-mono text-xs">
              {{ activeTool ? t(`categories.${activeTool.meta.categoryId}`) : t('header.none') }}
            </div>
          </div>
          <div class="px-3.5 py-3">
            <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
              {{ t('header.compute') }}
            </div>
            <div class="mt-1 font-mono text-xs">{{ t('header.computeValue') }}</div>
          </div>
        </div>
      </header>

      <main class="flex flex-1 flex-col">
        <RouterView />
      </main>

      <footer
        class="flex flex-wrap items-center justify-between gap-4 border-t border-line bg-panel px-6 py-3.5 sm:px-10"
      >
        <span class="font-mono text-[10px] tracking-[.1em] text-mute uppercase">
          tools.molyuk.com · vue 3 · cloudflare workers
        </span>
        <span class="font-mono text-[10px] tracking-[.1em] text-mute uppercase">
          {{ t('app.footer.privacy') }}
        </span>
      </footer>
    </div>
  </div>
</template>
