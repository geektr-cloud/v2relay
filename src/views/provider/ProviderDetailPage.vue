<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NSpace } from 'naive-ui'
import { useEditorModal } from '@/components/EditorModal'
import { useSubscriptionStore } from '@/stores/subscriptions'
import ProviderEditor from './ProviderEditor.vue'
import SubscriptionList from '@/views/subscription/SubscriptionList.vue'
import SubscriptionEditor from '@/views/subscription/SubscriptionEditor.vue'

const route = useRoute()
const router = useRouter()

const providerId = computed(() => {
  const k = route.params.idOrName
  return Array.isArray(k) ? k[0] : k
})

const { refresh } = useSubscriptionStore()

watch(providerId, (id) => id && refresh(id), { immediate: true })

const { showEditor } = useEditorModal(SubscriptionEditor, { title: '订阅' })
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <NSpace vertical size="large">
      <div class="flex flex-wrap items-center gap-3">
        <NButton quaternary @click="router.push({ name: 'home' })">
          ← 返回列表
        </NButton>
      </div>

      <ProviderEditor v-if="providerId" :id="providerId" mode="view" @deleted="router.push({ name: 'home' })" />

      <NCard v-if="providerId" title="此提供商下的订阅" segmented>
        <template #header-extra>
          <NButton size="small" type="primary" :disabled="!providerId"
            @click="showEditor({ prefill: { providerId }, onSaved: () => void refresh(providerId) })">
            添加订阅
          </NButton>
        </template>

        <SubscriptionList hide-provider-column empty-description="暂无订阅条目" />
      </NCard>
    </NSpace>
  </main>
</template>
