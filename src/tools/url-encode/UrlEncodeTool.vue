<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPage from '../../components/ToolPage.vue'
import CopyButton from '../../components/CopyButton.vue'
import DownloadButton from '../../components/DownloadButton.vue'

const { t } = useI18n()

const mode = ref<'encode' | 'decode'>('encode')
const input = ref('')

const output = computed(() => {
  if (!input.value) return ''
  try {
    return mode.value === 'encode' ? encodeURIComponent(input.value) : decodeURIComponent(input.value)
  } catch {
    return null
  }
})

function swap() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  if (output.value) input.value = output.value
}
</script>

<template>
  <ToolPage :title="t('tools.urlEncode.name')" :description="t('tools.urlEncode.description')">
    <div class="flex items-center gap-4.5 border border-line bg-panel px-3.5 py-3">
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="encode" class="h-3.5 w-3.5" />
        {{ t('tools.base64.encode') }}
      </label>
      <label class="flex items-center gap-2 text-[13px]">
        <input v-model="mode" type="radio" value="decode" class="h-3.5 w-3.5" />
        {{ t('tools.base64.decode') }}
      </label>
      <button
        type="button"
        class="ml-auto cursor-pointer border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] tracking-[.1em] text-ink uppercase transition hover:border-accent hover:text-accent"
        @click="swap"
      >
        {{ t('tools.base64.swap') }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-px border border-t-0 border-line bg-line sm:grid-cols-2">
      <div class="bg-panel p-3.5">
        <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
          {{ mode === 'encode' ? t('tools.urlEncode.plainText') : t('tools.urlEncode.encodedText') }}
        </span>
        <textarea
          v-model="input"
          rows="9"
          :placeholder="t('common.inputPlaceholder')"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
        />
      </div>
      <div class="bg-panel p-3.5">
        <div class="flex items-center justify-between gap-2.5">
          <span class="font-mono text-[9px] tracking-[.16em] text-mute uppercase">
            {{ mode === 'encode' ? t('tools.urlEncode.encodedText') : t('tools.urlEncode.plainText') }}
          </span>
          <div v-if="output" class="flex items-center gap-2">
            <DownloadButton
              :text="output"
              :filename="mode === 'encode' ? 'url-encoded.txt' : 'url-decoded.txt'"
            />
            <CopyButton :text="output" />
          </div>
        </div>
        <textarea
          readonly
          rows="9"
          :value="output === null ? t('tools.urlEncode.invalid') : output"
          class="mt-2.5 w-full resize-y border border-line bg-field px-2.5 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
          :class="output === null ? 'text-red-600' : ''"
        />
      </div>
    </div>
  </ToolPage>
</template>
