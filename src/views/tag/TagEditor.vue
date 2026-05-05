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
import { useTagStore } from "@/stores/tags";
import { Button } from "@/components/ui/button";
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from "@/components/ui/tags-input";

const props = defineProps<{ id: CMS.Id | undefined }>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const id = computed(() => props.id);
const { useUpsert } = useTagStore();

const [form, issues, upsert] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-sm">
    <FieldLegend>{{ id ? "编辑" : "创建" }}标签</FieldLegend>
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
          placeholder="标签名称"
          @focus="issues.ingore('name')"
        />
        <FieldDescription>名称是唯一的，用于标识标签。</FieldDescription>
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel> 关键词 </FieldLabel>
        <TagsInput
          v-model="form.keywords"
          @focusin="issues.ingore('keywords')"
        >
          <TagsInputItem
            v-for="(item, index) in form.keywords"
            :key="`${item}-${index}`"
            :value="item"
          >
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput placeholder="输入关键词后按回车" />
        </TagsInput>
        <FieldError :errors="issues.errors('keywords')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="upsert.loading" @click="upsert.submit().then(() => emit('close'))"> 保存 </Button>
    <Button variant="secondary" :disabled="upsert.loading" @click="emit('close')"> 取消 </Button>
  </div>
</template>
