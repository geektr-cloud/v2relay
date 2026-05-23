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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyTag, JsonTextArea } from "@/components/DataView";
import { useAppConfigStore } from "@/stores/app-configs";
import { appConfig } from "@server/core/app-configs";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useAppConfigStore();
const [form, issues, status, submit] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}配置</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="配置名称" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel>类型</FieldLabel>
        <Select v-model="form.type" @update:model-value="issues.ingore('type')">
          <SelectTrigger>
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="t in appConfig.appConfigTypes" :key="t" :value="t">
              {{ t }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FieldError :errors="issues.errors('type')" />
      </Field>
      <Field>
        <FieldLabel for="template">模板</FieldLabel>
        <Textarea
          id="template"
          v-model="form.template"
          placeholder="模板内容"
          rows="6"
          @focus="issues.ingore('template')"
        />
        <FieldError :errors="issues.errors('template')" />
      </Field>
      <Field>
        <FieldLabel>配置 (JSON)</FieldLabel>
        <JsonTextArea v-model="form.config" />
        <FieldError :errors="issues.errors('config')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
