<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'

const { t } = useI18n()

const ip = ref<string | null>(null)
const country = ref<string | null>(null)
const loading = ref(false)
const error = ref(false)

async function load() {
  loading.value = true
  error.value = false
  ip.value = null
  country.value = null
  try {
    const res = await fetch('/api/ip')
    if (!res.ok) throw new Error('bad status')
    const data = (await res.json()) as { ip?: string; country?: string | null }
    if (!data.ip) throw new Error('no ip')
    ip.value = data.ip
    country.value = data.country ?? null
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <ToolPage :title="t('tools.myIp.name')" :description="t('tools.myIp.description')">
    <div class="border border-line bg-panel p-6">
      <div class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
        {{ t('tools.myIp.yourIp') }}
      </div>

      <div v-if="loading" class="mt-3 font-mono text-2xl text-mute">{{ t('tools.myIp.loading') }}</div>
      <p v-else-if="error" class="mt-3 text-sm text-red-600">{{ t('tools.myIp.error') }}</p>
      <div v-else class="mt-3 flex flex-wrap items-center gap-4">
        <span class="font-mono text-3xl tracking-[-.01em] text-ink break-all">{{ ip }}</span>
        <CopyButton :text="ip ?? ''" />
      </div>

      <div v-if="country" class="mt-4 font-mono text-xs text-mute">
        {{ t('tools.myIp.country') }}: {{ country }}
      </div>

      <button
        type="button"
        class="mt-6 cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
        @click="load"
      >
        {{ t('common.refresh') }}
      </button>
    </div>
  </ToolPage>
</template>
