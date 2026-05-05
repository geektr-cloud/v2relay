<script setup lang="ts">
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import type { CMS } from "@/components/CMS";
import { CopyTag } from "@/components/DataView";
import { computed } from "vue";
import { useProviderStore } from "@/stores/providers";
import { Button } from "@/components/ui/button";

const props = defineProps<{ id: CMS.Id | undefined }>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const id = computed(() => props.id);
const { useUpsert } = useProviderStore();

const [form, issues, upsert] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-sm">
    <FieldLegend>{{ id ? "编辑" : "创建" }}提供商</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field :data-invalid="issues.errors('name').length > 0">
        <FieldLabel for="name"> 名称 </FieldLabel>
        <Input
          id="name"
          v-model="form.name"
          autocomplete="off"
          placeholder="唯一名称，例如 company-a"
          @focus="issues.ingore('name')"
        />
        <FieldDescription>名称是唯一的，用于标识提供商。</FieldDescription>
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel for="url"> 网址 </FieldLabel>
        <Input id="url" v-model="form.url" autocomplete="off" aria-invalid />
        <FieldError :errors="issues.errors('url')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="upsert.loading" @click="upsert.submit().then(() => emit('close'))"> 保存 </Button>
    <Button variant="secondary" :disabled="upsert.loading" @click="emit('close')"> 取消 </Button>
  </div>
</template>
