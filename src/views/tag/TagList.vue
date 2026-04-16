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
import { useEditorModal } from '@/components/EditorModal'
import { useTagStore } from '@/stores/tags'
import TagEditor from './TagEditor.vue'

withDefaults(
  defineProps<{
    emptyDescription?: string
  }>(),
  { emptyDescription: '暂无标签' },
)

const message = useMessage()
const store = useTagStore()
const { showEditor } = useEditorModal(TagEditor, {
  title: '标签',
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
    <div v-if="store.error" class="mb-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
      <p class="text-sm text-amber-200/90">加载失败：{{ store.error }}</p>
      <NButton class="mt-2" size="small" @click="store.refresh()">重试</NButton>
    </div>

    <NSpin :show="store.loading && store.items.length === 0" class="min-h-24">
      <div v-if="store.sorted.length > 0" class="overflow-x-auto rounded-lg">
        <NTable :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>名称</th>
              <th>关键词</th>
              <th class="w-[120px]">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in store.sorted" :key="row.id">
              <td class="font-medium">
                <NTag type="primary" :bordered="false" size="small">{{ row.name }}</NTag>
              </td>
              <td>
                <div v-if="row.keywords.length" class="flex flex-wrap gap-1">
                  <NTag v-for="(kw, i) in row.keywords" :key="i" size="small" :bordered="false">
                    {{ kw }}
                  </NTag>
                </div>
                <span v-else class="text-zinc-500">—</span>
              </td>
              <td>
                <NSpace :size="4" :wrap="false">
                  <ActionButton :icon="Eye" tooltip="详情" @click="showEditor({ id: row.id, viewMode: true })" />
                  <ActionButton :icon="Edit" tooltip="编辑" @click="showEditor({ id: row.id })" />
                  <ActionButton :icon="TrashAlt" tooltip="删除" type="error" confirm="确定删除此标签？不可恢复。"
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
