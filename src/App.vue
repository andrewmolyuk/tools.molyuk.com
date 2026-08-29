<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { tools } from './tools/registry'
</script>

<template>
  <div class="flex min-h-screen">
    <aside
      class="hidden w-64 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 sm:block"
    >
      <RouterLink to="/" class="block px-2 py-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        tools.molyuk.com
      </RouterLink>
      <nav class="mt-6 space-y-0.5">
        <RouterLink
          v-for="tool in tools"
          :key="tool.meta.slug"
          :to="`/tools/${tool.meta.slug}`"
          class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          active-class="bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100"
        >
          <span aria-hidden="true">{{ tool.meta.icon }}</span>
          <span>{{ tool.meta.name }}</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="min-w-0 flex-1">
      <RouterView />
    </main>
  </div>
</template>
