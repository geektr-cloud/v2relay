<script setup lang="ts">
import { computed } from "vue";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyTag } from "@/components/DataView";
import { useStaticFileStore } from "@/stores/static-files";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useStaticFileStore();
const [form, issues, status, submit] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}静态文件</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="唯一名称，用于 /files/:name 访问" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel for="url">URL</FieldLabel>
        <Input id="url" v-model="form.url" placeholder="https://example.com/file.bin" @focus="issues.ingore('url')" />
        <FieldError :errors="issues.errors('url')" />
      </Field>
      <Field>
        <FieldLabel for="expire">缓存过期（秒）</FieldLabel>
        <Input
          id="expire"
          v-model.number="form.expire"
          type="number"
          min="60"
          placeholder="86400"
          @focus="issues.ingore('expire')"
        />
        <FieldDescription>最小 60，默认 86400 (1 天)</FieldDescription>
        <FieldError :errors="issues.errors('expire')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
