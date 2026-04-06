<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NSpace } from 'naive-ui'
import { useEditorModal } from '@/components/EditorModal'
import { useProviderStore } from '@/stores/providers'
import ProviderList from './ProviderList.vue'
import ProviderEditor from './ProviderEditor.vue'

const store = useProviderStore()
const { showEditor } = useEditorModal(ProviderEditor, {
  title: '提供商',
  onSaved: () => void store.refresh(),
})

onMounted(() => void store.refresh())
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <NSpace vertical size="large">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">
            订阅服务提供商
          </h1>
          <p class="mt-1 text-sm text-zinc-500">
            永远怀念 RixCloud, 喵帕斯
          </p>
        </div>
        <NSpace>
          <NButton :loading="store.loading" @click="store.refresh()">刷新</NButton>
          <NButton type="primary" @click="showEditor({})">添加提供商</NButton>
        </NSpace>
      </div>

      <ProviderList empty-description="暂无提供商，点击「添加提供商」开始" />
    </NSpace>
  </main>
</template>
