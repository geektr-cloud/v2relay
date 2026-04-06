<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpace } from 'naive-ui'
import SubscriptionEditor from './SubscriptionEditor.vue'

const route = useRoute()
const router = useRouter()

const subscriptionId = computed(() => {
  const k = route.params.id
  return Array.isArray(k) ? k[0] : k
})
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <NSpace vertical size="large">
      <div class="flex flex-wrap items-center gap-3">
        <NButton quaternary @click="router.push({ name: 'subscriptions' })">
          ← 返回订阅列表
        </NButton>
      </div>

      <SubscriptionEditor
        v-if="subscriptionId"
        :id="subscriptionId"
        mode="view"
        @deleted="router.push({ name: 'subscriptions' })"
      />
    </NSpace>
  </main>
</template>
