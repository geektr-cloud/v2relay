<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpace,
  NSpin,
  useMessage,
} from 'naive-ui'
import { useProviders } from '@/composables/useProviders'
import type { Provider } from '@/types/api'

const router = useRouter()
const message = useMessage()
const { sortedProviders, loading, error, refresh, createProvider } = useProviders()

const showModal = ref(false)
const submitting = ref(false)
const formName = ref('')
const formUrl = ref('')

onMounted(() => {
  void refresh()
})

function openAdd() {
  formName.value = ''
  formUrl.value = ''
  showModal.value = true
}

async function submitAdd() {
  const name = formName.value.trim()
  if (!name) {
    message.warning('请填写提供商名称')
    return
  }
  submitting.value = true
  try {
    await createProvider(name, formUrl.value.trim() || null)
    message.success('已添加')
    showModal.value = false
    await refresh()
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  } finally {
    submitting.value = false
  }
}

const columns: DataTableColumns<Provider> = [
  {
    title: '名称',
    key: 'name',
    ellipsis: { tooltip: true },
    render(row) {
      return h(
        'button',
        {
          type: 'button',
          class:
            'text-left font-medium text-cyan-400 underline-offset-2 hover:underline',
          onClick: () =>
            router.push({
              name: 'provider-detail',
              params: { idOrName: row.id },
            }),
        },
        row.name,
      )
    },
  },
  {
    title: '订阅地址',
    key: 'url',
    ellipsis: { tooltip: true },
    render(row) {
      if (!row.url) return h('span', { class: 'text-zinc-500' }, '—')
      return h(
        'a',
        {
          href: row.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-cyan-400/90 underline-offset-2 hover:underline',
          onClick: (e: MouseEvent) => e.stopPropagation(),
        },
        row.url,
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          quaternary: true,
          onClick: () =>
            router.push({
              name: 'provider-detail',
              params: { idOrName: row.id },
            }),
        },
        { default: () => '详情' },
      )
    },
  },
]
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
          <NButton :loading="loading" @click="refresh">刷新</NButton>
          <NButton type="primary" @click="openAdd">添加提供商</NButton>
        </NSpace>
      </div>

      <NCard v-if="error" size="small" class="border-amber-900/50 bg-amber-950/30">
        <p class="text-sm text-amber-200/90">加载失败：{{ error }}</p>
        <NButton class="mt-2" size="small" @click="refresh">重试</NButton>
      </NCard>

      <NSpin :show="loading && sortedProviders.length === 0" class="min-h-48">
        <NDataTable v-if="sortedProviders.length > 0" :columns="columns" :data="sortedProviders" :bordered="false"
          :single-line="false" size="small" class="rounded-lg" />
        <NEmpty v-else-if="!loading" description="暂无提供商，点击「添加提供商」开始" />
      </NSpin>
    </NSpace>

    <NModal v-model:show="showModal" preset="card" title="添加提供商" class="max-w-md" :mask-closable="!submitting">
      <NForm label-placement="left" label-width="80">
        <NFormItem label="名称" required>
          <NInput v-model:value="formName" placeholder="唯一名称，例如 company-a" :disabled="submitting"
            @keydown.enter.prevent="submitAdd" />
        </NFormItem>
        <NFormItem label="网址">
          <NInput v-model:value="formUrl" type="textarea" placeholder="可选" :autosize="{ minRows: 2, maxRows: 6 }"
            :disabled="submitting" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="submitting" @click="showModal = false">
            取消
          </NButton>
          <NButton type="primary" :loading="submitting" @click="submitAdd">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </main>
</template>
