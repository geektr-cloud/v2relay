<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import CopyTag from '@/components/CopyTag.vue'
import type { FormInst, FormRules } from 'naive-ui'
import {
  NButton,
  NCard,
  NDynamicInput,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NSpin,
  NSwitch,
  useMessage,
} from 'naive-ui'
import ActionButton from '@/components/ActionButton'
import { Descriptions, DescriptionsCode, DescriptionsDate, DescriptionsText } from '@/components/Descriptions'
import type { EditorEmits } from '@/components/EditorModal'
import { type EditorBridgeProps, useEditorBridge } from '@/composables/useEditorBridge'
import { useSubscriptionStore } from '@/stores/subscriptions'
import type { SubscriptionWithProvider } from '@/types/api'
import ProviderSelect from '@/views/provider/ProviderSelect'

const props = defineProps<EditorBridgeProps<SubscriptionWithProvider>>()
const emit = defineEmits<EditorEmits<SubscriptionWithProvider>>()

const { editorId, isCreate, isEdit, isEditing, switchMode, notifySaved, notifyClose } =
  useEditorBridge<SubscriptionWithProvider>(props, emit)

const message = useMessage()
const store = useSubscriptionStore()

const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const subscription = ref<SubscriptionWithProvider | null>(null)

const formRef = ref<FormInst | null>(null)
const form = reactive({
  name: '',
  remark: '',
  urls: [] as string[],
  enabled: true,
  providerId: null as string | null,
})

const rules: FormRules = {
  providerId: { required: true, message: '请选择提供商', trigger: ['blur', 'change'] },
  urls: {
    required: true,
    validator: () => form.urls.some((s) => s.trim()),
    message: '请填写订阅链接',
    trigger: ['input', 'change'],
  },
}

function syncForm(row: SubscriptionWithProvider | null) {
  if (!row) {
    const pre = props.options?.prefill
    form.name = pre?.name ?? ''
    form.remark = pre?.remark ?? ''
    form.urls = pre?.urls ?? []
    form.enabled = pre?.enabled ?? true
    form.providerId = pre?.providerId ?? null
    return
  }
  form.name = row.name ?? ''
  form.remark = row.remark ?? ''
  form.urls = row.urls
  form.enabled = row.enabled
  form.providerId = row.providerId
}

async function load() {
  if (isCreate.value) {
    subscription.value = null
    loadError.value = null
    syncForm(null)
    return
  }

  if (!editorId.value) {
    loadError.value = '缺少 id'
    subscription.value = null
    return
  }

  loading.value = true
  loadError.value = null
  try {
    subscription.value = await store.get(editorId.value)
    syncForm(subscription.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    subscription.value = null
  } finally {
    loading.value = false
  }
}

watch([editorId, isEditing], () => void load(), { immediate: true })

function buildPayload() {
  return {
    providerId: form.providerId ?? '',
    urls: form.urls,
    enabled: form.enabled,
    name: form.name.trim(),
    remark: form.remark.trim(),
  }
}

async function create() {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const row = await store.create(buildPayload())
    message.success('已添加')
    notifySaved(row.id, row)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  } finally {
    saving.value = false
  }
}

async function patch() {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const row = await store.update(editorId.value!, buildPayload())
    message.success('已保存')
    subscription.value = row
    syncForm(row)
    notifySaved(row.id, row)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  } finally {
    saving.value = false
  }
}

const submit = () => {
  isCreate.value ? create() : patch()
  notifyClose()
}

async function remove() {
  saving.value = true
  try {
    await store.remove(editorId.value!)
    message.success('已删除')
    emit('deleted', editorId.value!)
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e))
  } finally {
    saving.value = false
  }
}

function onCancelForm() {
  if (isEdit.value) syncForm(subscription.value)
  notifyClose()
}

</script>

<template>
  <template v-if="isEditing">
    <NSpin :show="isEdit && loading" class="min-h-24">
      <div v-if="isCreate || !loading">
        <NEmpty v-if="isEdit && loadError" :description="loadError">
          <template #extra>
            <NButton @click="load">重试</NButton>
          </template>
        </NEmpty>
        <template v-else>
          <NForm ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="88">
            <NFormItem label="提供商" path="providerId">
              <ProviderSelect v-model:value="form.providerId" :disabled="saving" />
            </NFormItem>
            <NFormItem label="名称" path="name">
              <NInput v-model:value="form.name" placeholder="可选，便于识别" :disabled="saving" />
            </NFormItem>
            <NFormItem label="备注" path="remark">
              <NInput v-model:value="form.remark" type="textarea" placeholder="可选说明"
                :autosize="{ minRows: 2, maxRows: 6 }" :disabled="saving" />
            </NFormItem>
            <NFormItem label="订阅链接" path="urls">
              <NDynamicInput v-model:value="form.urls" :disabled="saving" placeholder="输入订阅链接" :min="1" />
            </NFormItem>
            <NFormItem label="启用" path="enabled">
              <NSwitch v-model:value="form.enabled" :disabled="saving" />
            </NFormItem>
          </NForm>
          <div class="mt-4 flex justify-end gap-2">
            <NButton :disabled="saving" @click="onCancelForm">取消</NButton>
            <NButton type="primary" :loading="saving" @click="submit">
              保存
            </NButton>
          </div>
        </template>
      </div>
    </NSpin>
  </template>

  <!-- view -->
  <NSpin v-else :show="loading" class="min-h-32">
    <div v-if="!loading">
      <NEmpty v-if="loadError" :description="loadError">
        <template #extra>
          <NButton @click="load">重试</NButton>
        </template>
      </NEmpty>

      <template v-else-if="subscription">
        <NCard title="基本信息" size="small" class="mb-4 border-zinc-800">
          <template #header-extra>
            <NSpace size="small">
              <ActionButton label="编辑" @click="switchMode('edit')" />
              <ActionButton label="删除" type="error" :disabled="saving || !editorId" confirm="确定删除此订阅？不可恢复。" @click="remove" />
            </NSpace>
          </template>
          <Descriptions>
            <DescriptionsCode label="ID" :value="subscription.id" />
            <DescriptionsText label="名称" :value="subscription.name" />
            <DescriptionsText label="备注" :value="subscription.remark" />
            <DescriptionsDate label="创建时间" :value="subscription.createdAt" />
            <DescriptionsDate label="更新时间" :value="subscription.updatedAt" />
          </Descriptions>
        </NCard>

        <NCard title="订阅链接" size="small" class="border-zinc-800">
          <div class="flex flex-col gap-1.5">
            <CopyTag v-for="(url, i) in subscription.urls" :key="i" :value="url" />
          </div>
        </NCard>
      </template>
    </div>
  </NSpin>
</template>
