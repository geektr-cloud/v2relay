<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NSpin,
  NSpace,
} from 'naive-ui'
import { useProviders } from '@/composables/useProviders'
import type { Provider } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { getProvider } = useProviders()

const provider = ref<Provider | null>(null)
const loading = ref(true)
const err = ref<string | null>(null)

async function load() {
  const key = route.params.idOrName
  const idOrName = Array.isArray(key) ? key[0] : key
  if (!idOrName) {
    err.value = '缺少参数'
    provider.value = null
    loading.value = false
    return
  }
  loading.value = true
  err.value = null
  try {
    provider.value = await getProvider(idOrName)
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
    provider.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(
  () => route.params.idOrName,
  () => load(),
)
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8">
    <NSpace vertical size="large">
      <div class="flex flex-wrap items-center gap-3">
        <NButton quaternary @click="router.push({ name: 'home' })">
          ← 返回列表
        </NButton>
      </div>

      <NSpin :show="loading" class="min-h-32">
        <div v-if="!loading">
          <NEmpty v-if="err" :description="err">
            <template #extra>
              <NButton @click="load">重试</NButton>
            </template>
          </NEmpty>

          <NCard v-else-if="provider" :title="provider.name" segmented>
            <NDescriptions label-placement="left" :column="1">
              <NDescriptionsItem label="ID">
                <code class="text-sm break-all">{{ provider.id }}</code>
              </NDescriptionsItem>
              <NDescriptionsItem label="名称">
                {{ provider.name }}
              </NDescriptionsItem>
              <NDescriptionsItem label="订阅地址">
                <a
                  v-if="provider.url"
                  :href="provider.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-cyan-400 underline-offset-2 hover:underline"
                >
                  {{ provider.url }}
                </a>
                <span v-else class="text-zinc-500">未设置</span>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </div>
      </NSpin>
    </NSpace>
  </main>
</template>
