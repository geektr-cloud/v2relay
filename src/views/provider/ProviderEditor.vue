<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInst, FormRules } from 'naive-ui'
import {
  NButton,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NSpin,
  useMessage,
} from 'naive-ui'
import type { EditorEmits } from '@/components/EditorModal'
import { type EditorBridgeProps, useEditorBridge } from '@/composables/useEditorBridge'
import { useProviderStore } from '@/stores/providers'
import type { Provider } from '@/types/api'

const props = defineProps<EditorBridgeProps<Provider>>()
const emit = defineEmits<EditorEmits<Provider>>()
const { editorId, isCreate, isEdit, isEditing, switchMode, notifySaved, notifyClose } = useEditorBridge<Provider>(props, emit)

const message = useMessage()
const router = useRouter()
const store = useProviderStore()

const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const provider = ref<Provider | null>(null)

const formRef = ref<FormInst | null>(null)
const form = reactive({ name: '', url: '' })
const rules: FormRules = {
  name: { required: true, message: '请填写提供商名称', trigger: ['input', 'blur'] },
}

function syncForm(p: Provider | null) {
  form.name = p?.name ?? ''
  form.url = p?.url ?? ''
}

async function load() {
  if (isCreate.value || !editorId.value) {
    provider.value = null
    loadError.value = null
    syncForm(null)
    return
  }
  loading.value = true
  loadError.value = null
  try {
    provider.value = await store.get(editorId.value)
    syncForm(provider.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    provider.value = null
  } finally {
    loading.value = false
  }
}

watch([editorId, isEditing], () => void load(), { immediate: true })

async function create() {
  try { await formRef.value?.validate() } catch { return }
  saving.value = true
  try {
    const row = await store.create(form.name.trim(), form.url.trim())
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
    const row = await store.update(editorId.value!, {
      name: form.name.trim(),
      url: form.url.trim(),
    })
    provider.value = row
    syncForm(row)
    message.success('已保存')
    if (router.currentRoute.value.name === 'provider-detail') {
      await router.replace({ name: 'provider-detail', params: { idOrName: row.id } })
    }
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
  if (isEdit.value) syncForm(provider.value)
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
        <NForm v-else ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="80">
          <NFormItem label="名称" path="name">
            <NInput v-model:value="form.name" placeholder="唯一名称，例如 company-a" :disabled="saving"
              @keydown.enter.prevent="submit" />
          </NFormItem>
          <NFormItem label="网址" path="url">
            <NInput v-model:value="form.url" type="textarea" placeholder="可选" :autosize="{ minRows: 2, maxRows: 6 }"
              :disabled="saving" />
          </NFormItem>
        </NForm>
        <div class="mt-4 flex justify-end gap-2">
          <NButton :disabled="saving" @click="onCancelForm">取消</NButton>
          <NButton type="primary" :loading="saving" @click="submit">
            保存
          </NButton>
        </div>
      </div>
    </NSpin>
  </template>
</template>
