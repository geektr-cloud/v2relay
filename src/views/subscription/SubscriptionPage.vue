<script setup lang="ts">
import { onMounted } from 'vue'
import { useEditorModal } from '@/components/EditorModal'
import { useSubscriptionStore } from '@/stores/subscriptions'
import SubscriptionList from './SubscriptionList.vue'
import SubscriptionEditor from './SubscriptionEditor.vue'
import PageEntry from '@/components/CMS/PageEntry.vue'

const store = useSubscriptionStore()
const { showEditor } = useEditorModal(SubscriptionEditor, {
  title: '提供商',
  onSaved: () => void store.refresh(),
})

onMounted(() => void store.refresh())
</script>

<template>
  <PageEntry title="订阅条目" description="每条订阅关联一个提供商，urls 可为多行备用链接。" :loading="store.loading" :error="store.error"
    :items="store.items" @retry="void store.refresh()" @create="showEditor({})">
    <SubscriptionList />
  </PageEntry>
</template>
