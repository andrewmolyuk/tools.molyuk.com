<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  text: string
  /**
   * Optional renderer for a bitmap of the same content. When given, the
   * clipboard gets both: an image, so pasting into a chat or a document
   * yields a picture, and `text` as the plain-text flavour for editors.
   */
  image?: () => Promise<Blob>
}>()

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  if (!props.text) return
  if (props.image) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': props.image(),
        'text/plain': new Blob([props.text], { type: 'text/plain' }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(props.text)
  }
  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <button
    type="button"
    class="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-mono text-[10px] tracking-[.08em] text-ink uppercase transition hover:border-accent hover:text-accent"
    @click="copy"
  >
    {{ copied ? t('common.copied') : t('common.copy') }}
  </button>
</template>
