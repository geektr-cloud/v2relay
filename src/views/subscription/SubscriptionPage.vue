<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NSpace } from 'naive-ui'
import { useEditorModal } from '@/components/EditorModal'
import { useProviderStore } from '@/stores/providers'
import { useSubscriptionStore } from '@/stores/subscriptions'
import SubscriptionList from './SubscriptionList.vue'
import SubscriptionEditor from './SubscriptionEditor.vue'

const router = useRouter()
const providerStore = useProviderStore()
const subStore = useSubscriptionStore()
const { showEditor } = useEditorModal(SubscriptionEditor, {
  title: '订阅',
  onSaved: () => void subStore.refresh(),
})

onMounted(() => {
  void providerStore.refresh()
  void subStore.refresh()
})
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <NSpace vertical size="large">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">
            订阅条目
          </h1>
          <p class="mt-1 text-sm text-zinc-500">
            每条订阅关联一个提供商，<code class="text-zinc-400">urls</code> 可为多行备用链接。
          </p>
        </div>
        <NSpace>
          <NButton :loading="subStore.loading" @click="subStore.refresh()">刷新</NButton>
          <NButton type="primary" :disabled="!providerStore.sorted.length && !providerStore.loading" @click="showEditor()">
            添加订阅
          </NButton>
        </NSpace>
      </div>

      <NCard v-if="!providerStore.sorted.length && !providerStore.loading" size="small" class="border-zinc-800 bg-zinc-900/40">
        <p class="text-sm text-zinc-400">
          还没有提供商，请先在首页添加提供商后再创建订阅。
        </p>
        <NButton class="mt-2" size="small" @click="router.push({ name: 'home' })">
          前往提供商
        </NButton>
      </NCard>

      <SubscriptionList empty-description="暂无订阅，点击「添加订阅」开始" />
    </NSpace>
  </main>
</template>
