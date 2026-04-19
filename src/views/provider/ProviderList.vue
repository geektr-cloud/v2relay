<script setup lang="ts">
import { Edit, Eye, TrashAlt } from '@vicons/fa'
import {
  NButton,
  NEmpty,
  NSpace,
  NSpin,
  NTable,
  useMessage,
} from 'naive-ui'
import ActionButton from '@/components/ActionButton'
import Link from '@/components/DataView/Link.vue'
import Route from '@/components/DataView/Route.vue'
import { useEditorModal } from '@/components/EditorModal'
import { useProviderStore } from '@/stores/providers'
import ProviderEditor from './ProviderEditor.vue'

withDefaults(
  defineProps<{
    emptyDescription?: string
  }>(),
  { emptyDescription: '暂无数据' },
)

const message = useMessage()
const store = useProviderStore()
const { showEditor } = useEditorModal(ProviderEditor, {
  title: '提供商',
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
</script>

<template>
  <div>
    <div v-if="store.error" class="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
      <p class="text-sm text-amber-200/90">加载失败：{{ store.error }}</p>
      <NButton class="mt-2" size="small" @click="store.refresh()">重试</NButton>
    </div>

    <NSpin :show="store.loading && store.items.length === 0" class="min-h-48">
      <div v-if="store.sorted.length > 0" class="overflow-x-auto rounded-lg">
        <NTable :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>名称</th>
              <th>地址</th>
              <th class="w-[120px]">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in store.sorted" :key="row.id">
              <td>
                <Route :to="{ name: 'provider-detail', params: { idOrName: row.id } }">
                  {{ row.name }}
                </Route>
              </td>
              <td>
                <Link :href="row.url" class="max-w-[40ch]" />
              </td>
              <td>
                <NSpace :size="4" :wrap="false">
                  <ActionButton :icon="Eye" tooltip="详情"
                    :route="{ name: 'provider-detail', params: { idOrName: row.id } }" />
                  <ActionButton :icon="Edit" tooltip="编辑" @click="showEditor({ id: row.id })" />
                  <ActionButton :icon="TrashAlt" tooltip="删除" type="error" confirm="确定删除该提供商？若仍有订阅条目将无法删除。"
                    @click="onDelete(row)" />
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
