<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NSpace } from 'naive-ui'
import { useEditorModal } from '@/components/EditorModal'
import { useTagStore } from '@/stores/tags'
import TagList from './TagList.vue'
import TagEditor from './TagEditor.vue'

const store = useTagStore()
const { showEditor } = useEditorModal(TagEditor, {
  title: '标签',
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
            标签管理
          </h1>
          <p class="mt-1 text-sm text-zinc-500">
            管理标签及其关键词匹配规则。
          </p>
        </div>
        <NSpace>
          <NButton :loading="store.loading" @click="store.refresh()">刷新</NButton>
          <NButton type="primary" @click="showEditor({})">添加标签</NButton>
        </NSpace>
      </div>

      <TagList empty-description="暂无标签，点击「添加标签」开始" />
    </NSpace>
  </main>
</template>
