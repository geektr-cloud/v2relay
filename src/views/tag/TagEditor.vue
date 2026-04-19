<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { FormInst, FormRules } from "naive-ui";
import { NButton, NCard, NDynamicInput, NEmpty, NForm, NFormItem, NInput, NSpace, NSpin, useMessage } from "naive-ui";
import ActionButton from "@/components/ActionButton";
import type { EditorEmits } from "@/components/EditorModal";
import { type EditorBridgeProps, useEditorBridge } from "@/composables/useEditorBridge";
import { useTagStore } from "@/stores/tags";
import type { Tag } from "@/types/api";
import Badge from "@/components/ui/badge/Badge.vue";
import { DataView, DataItem, CopyBtn, VSeparator } from "@/components/DataView";

const props = defineProps<EditorBridgeProps<Tag>>();
const emit = defineEmits<EditorEmits<Tag>>();
const { editorId, isCreate, isEdit, isEditing, switchMode, notifySaved, notifyClose } = useEditorBridge<Tag>(
  props,
  emit,
);

const message = useMessage();
const store = useTagStore();

const loading = ref(false);
const loadError = ref<string | null>(null);
const saving = ref(false);
const tag = ref<Tag | null>(null);

const formRef = ref<FormInst | null>(null);
const form = reactive({
  name: "",
  keywords: [] as string[],
});

const rules: FormRules = {
  name: { required: true, message: "请填写标签名称", trigger: ["input", "blur"] },
};

function syncForm(row: Tag | null) {
  if (!row) {
    const pre = props.options?.prefill;
    form.name = (pre as Partial<Tag> | undefined)?.name ?? "";
    form.keywords = (pre as Partial<Tag> | undefined)?.keywords ?? [];
    return;
  }
  form.name = row.name;
  form.keywords = [...row.keywords];
}

async function load() {
  if (isCreate.value) {
    tag.value = null;
    loadError.value = null;
    syncForm(null);
    return;
  }
  if (!editorId.value) {
    loadError.value = "缺少 id";
    tag.value = null;
    return;
  }
  loading.value = true;
  loadError.value = null;
  try {
    tag.value = await store.get(editorId.value);
    syncForm(tag.value);
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
    tag.value = null;
  } finally {
    loading.value = false;
  }
}

watch([editorId, isEditing], () => void load(), { immediate: true });

function buildPayload() {
  return {
    name: form.name.trim(),
    keywords: form.keywords.map((k) => k.trim()).filter(Boolean),
  };
}

async function create() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const row = await store.create(buildPayload());
    message.success("已添加");
    notifySaved(row.id, row);
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

async function patch() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const row = await store.update(editorId.value!, buildPayload());
    message.success("已保存");
    tag.value = row;
    syncForm(row);
    notifySaved(row.id, row);
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

const submit = () => {
  isCreate.value ? create() : patch();
  notifyClose();
};

async function remove() {
  saving.value = true;
  try {
    await store.remove(editorId.value!);
    message.success("已删除");
    emit("deleted", editorId.value!);
  } catch (e) {
    message.error(e instanceof Error ? e.message : String(e));
  } finally {
    saving.value = false;
  }
}

function onCancelForm() {
  if (isEdit.value) syncForm(tag.value);
  notifyClose();
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
            <NFormItem label="名称" path="name">
              <NInput
                v-model:value="form.name"
                placeholder="标签名称"
                :disabled="saving"
                @keydown.enter.prevent="submit"
              />
            </NFormItem>
            <NFormItem label="关键词" path="keywords">
              <NDynamicInput v-model:value="form.keywords" :disabled="saving" placeholder="输入关键词" />
            </NFormItem>
          </NForm>
          <div class="mt-4 flex justify-end gap-2">
            <NButton :disabled="saving" @click="onCancelForm">取消</NButton>
            <NButton type="primary" :loading="saving" @click="submit">保存</NButton>
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

      <template v-else-if="tag">
        <NCard title="标签信息" size="small" class="mb-4 border-zinc-800">
          <template #header-extra>
            <NSpace size="small">
              <ActionButton label="编辑" @click="switchMode('edit')" />
              <ActionButton
                label="删除"
                type="error"
                :disabled="saving || !editorId"
                confirm="确定删除此标签？不可恢复。"
                @click="remove"
              />
            </NSpace>
          </template>
          <DataView>
            <DataItem label="ID">
              {{ tag.id }}
              <VSeparator />
              <CopyBtn :value="tag.id" />
            </DataItem>
            <DataItem label="名称">{{ tag.name }}</DataItem>
            <DataItem label="关键词">
              <div class="flex flex-wrap gap-1">
                <Badge v-for="(kw, i) in tag.keywords" :key="i" variant="outline">
                  {{ kw }}
                </Badge>
              </div>
            </DataItem>
          </DataView>
        </NCard>
      </template>
    </div>
  </NSpin>
</template>
