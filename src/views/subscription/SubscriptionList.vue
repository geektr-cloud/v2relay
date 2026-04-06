<script setup lang="ts">
import { Edit, Eye, TrashAlt } from '@vicons/fa'
import {
  NButton,
  NEmpty,
  NSpace,
  NSpin,
  NTable,
  NTag,
  useMessage,
} from 'naive-ui'
import ActionButton from '@/components/ActionButton'
import CopyTag from '@/components/CopyTag.vue'
import { Route } from '@/components/DataView'
import { useEditorModal } from '@/components/EditorModal'
import { useSubscriptionStore } from '@/stores/subscriptions'
import SubscriptionEditor from './SubscriptionEditor.vue'

withDefaults(
  defineProps<{
    emptyDescription?: string
    hideProviderColumn?: boolean
  }>(),
  {
    emptyDescription: '暂无订阅',
    hideProviderColumn: false,
  },
)

const message = useMessage()
const store = useSubscriptionStore()
const { showEditor } = useEditorModal(SubscriptionEditor, {
  title: '订阅',
  onSaved: () => void store.refresh(),
})

async function onDelete(row: { id: string }) {
  try {
    await store.remove(row.id)
    message.success('已删除')
    void store.refresh()
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  }
}

function formatTime(d: Date) {
  return d.toLocaleString('zh-CN')
}

function displayName(row: { name?: string | null }) {
  const t = (row.name ?? '').trim()
  return t || null
}

function displayRemark(row: { remark?: string | null }) {
  const t = (row.remark ?? '').trim()
  return t || null
}
</script>

<template>
  <div>
    <div v-if="store.error" class="mb-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
      <p class="text-sm text-amber-200/90">加载失败：{{ store.error }}</p>
      <NButton class="mt-2" size="small" @click="store.refresh()">重试</NButton>
    </div>

    <NSpin :show="store.loading && store.items.length === 0" class="min-h-24">
      <div v-if="store.sortedByUpdated.length > 0" class="overflow-x-auto rounded-lg">
        <NTable :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th class="max-w-[100px]">名称</th>
              <th class="max-w-[100px]">备注</th>
              <th v-if="!hideProviderColumn" class="max-w-[140px]">
                提供商
              </th>
              <th>订阅链接</th>
              <th class="w-[90px]">状态</th>
              <th class="w-[170px]">更新于</th>
              <th class="w-[120px]">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in store.sortedByUpdated" :key="row.id">
              <td>
                <span v-if="displayName(row)" class="block max-w-[120px] truncate"
                  :title="displayName(row) ?? undefined">
                  {{ displayName(row) }}
                </span>
                <span v-else class="text-zinc-500">—</span>
              </td>
              <td>
                <span v-if="displayRemark(row)" class="block max-w-[120px] truncate"
                  :title="displayRemark(row) ?? undefined">
                  {{ displayRemark(row) }}
                </span>
                <span v-else class="text-zinc-500">—</span>
              </td>
              <td v-if="!hideProviderColumn">
                <Route :to="{ name: 'provider-detail', params: { idOrName: row.provider.id } }"
                  class="max-w-[140px] truncate block" :title="row.provider.name">
                  {{ row.provider.name }}
                </Route>
              </td>
              <td>
                <div class="flex max-w-[40ch] flex-col gap-1">
                  <CopyTag v-for="(url, i) in row.urls" :key="i" :value="url" truncate />
                </div>
              </td>
              <td>
                <NTag :type="row.enabled ? 'success' : 'default'" size="small">
                  {{ row.enabled ? '启用' : '停用' }}
                </NTag>
              </td>
              <td class="whitespace-nowrap text-sm text-zinc-400">
                {{ formatTime(row.updatedAt) }}
              </td>
              <td>
                <NSpace :size="4" :wrap="false">
                  <ActionButton :icon="Eye" tooltip="详情" :route="{ name: 'subscription-detail', params: { id: row.id } }" />
                  <ActionButton :icon="Edit" tooltip="编辑" @click="showEditor({ id: row.id })" />
                  <ActionButton :icon="TrashAlt" tooltip="删除" type="error" confirm="确定删除此订阅？不可恢复。" @click="onDelete(row)" />
                </NSpace>
              </td>
            </tr>
          </tbody>
        </NTable>
      </div>
      <NEmpty v-else-if="!store.loading" :description="emptyDescription" class="py-24" />
    </NSpin>
  </div>
</template>
