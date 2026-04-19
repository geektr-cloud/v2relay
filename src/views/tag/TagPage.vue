<script setup lang="ts">
import { onMounted } from 'vue'
import { useEditorModal } from '@/components/EditorModal'
import PageEntry from '@/components/CMS/PageEntry.vue'
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
  <PageEntry title="标签管理" description="管理标签及其关键词匹配规则。" :loading="store.loading" :error="store.error"
    :items="store.sorted" @retry="void store.refresh()" @create="showEditor({})">
    <TagList />
  </PageEntry>
</template>
