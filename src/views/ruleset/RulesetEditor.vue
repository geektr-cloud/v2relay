<script setup lang="ts">
import { computed } from "vue";
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
import { Button } from "@/components/ui/button";
import { CopyTag } from "@/components/DataView";
import { useRulesetStore } from "@/stores/rulesets";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useRulesetStore();
const [form, issues, status, submit] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}规则集</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="规则集名称" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel for="url">URL</FieldLabel>
        <Input id="url" v-model="form.url" placeholder="https://example.com/rules.yaml" @focus="issues.ingore('url')" />
        <FieldError :errors="issues.errors('url')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
