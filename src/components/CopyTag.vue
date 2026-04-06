<script setup lang="ts">
import { CopyRegular } from '@vicons/fa'
import { useClipboard } from '@vueuse/core'
import { useMessage } from 'naive-ui'

const props = withDefaults(
  defineProps<{
    value: string
    truncate?: boolean
  }>(),
  { truncate: false },
)

const message = useMessage()
const { copy } = useClipboard()

function onCopy() {
  void copy(props.value).then(() => message.success('已复制'))
}
</script>

<template>
  <span class="inline-flex items-center gap-1" :class="truncate && 'min-w-0'">
    <code
      class="rounded bg-zinc-800/60 px-1.5 py-0.5 text-xs text-zinc-300"
      :class="truncate ? 'block min-w-0 truncate' : 'break-all'"
      :title="value"
    >{{ value }}</code>
    <button
      type="button"
      class="shrink-0 cursor-pointer text-zinc-500 transition-colors hover:text-cyan-400"
      title="复制"
      @click.stop="onCopy"
    >
      <CopyRegular class="size-3.5" />
    </button>
  </span>
</template>
