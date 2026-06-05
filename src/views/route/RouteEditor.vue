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
import { useRouteStore } from "@/stores/routes";
import NodeFilter from "@/views/node/NodeFilter.vue";
import RulesetMultiSelect from "@/views/app-config/RulesetMultiSelect.vue";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useRouteStore();
const [form, issues, status, submit] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-2xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}路由</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="路由名称" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel>规则集</FieldLabel>
        <RulesetMultiSelect v-model="form.rulesets" />
        <FieldError :errors="issues.errors('rulesets')" />
      </Field>
      <Field>
        <FieldLabel>节点筛选</FieldLabel>
        <NodeFilter v-model="form.filter" />
        <FieldError :errors="issues.errors('filter')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
