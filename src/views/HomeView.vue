<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tools } from '../tools/registry'
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10">
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Инструменты</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Набор повседневных утилит разработчика. Всё считается локально в браузере.
    </p>
    <div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="tool in tools"
        :key="tool.meta.slug"
        :to="`/tools/${tool.meta.slug}`"
        class="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-700"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          <span aria-hidden="true">{{ tool.meta.icon }}</span>
          <span>{{ tool.meta.name }}</span>
        </div>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ tool.meta.description }}</p>
      </RouterLink>
    </div>
  </div>
</template>
