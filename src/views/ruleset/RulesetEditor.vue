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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyTag } from "@/components/DataView";
import { useRulesetStore } from "@/stores/rulesets";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useRulesetStore();
const [form, issues, status, submit] = useUpsert(id);

// url and rules are mutex — typing one disables the other
const urlDisabled = computed(() => form.rules.length > 0);
const rulesDisabled = computed(() => form.url.length > 0);
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
        <FieldLabel for="description">描述</FieldLabel>
        <Input
          id="description"
          v-model="form.description"
          placeholder="可选描述"
          @focus="issues.ingore('description')"
        />
        <FieldError :errors="issues.errors('description')" />
      </Field>
      <Field>
        <FieldLabel for="url">URL</FieldLabel>
        <Input
          id="url"
          v-model="form.url"
          :disabled="urlDisabled"
          placeholder="https://example.com/rules.yaml"
          @focus="issues.ingore('url')"
        />
        <FieldDescription>与下方“规则内容”互斥，二选一</FieldDescription>
        <FieldError :errors="issues.errors('url')" />
      </Field>
      <Field>
        <FieldLabel for="rules">规则内容</FieldLabel>
        <Textarea
          id="rules"
          v-model="form.rules"
          :disabled="rulesDisabled"
          rows="10"
          placeholder="DOMAIN-SUFFIX,example.com&#10;IP-CIDR,10.0.0.0/8"
          class="font-mono text-xs"
          @focus="issues.ingore('rules')"
        />
        <FieldDescription>每行一条规则；填写后将忽略 URL 拉取</FieldDescription>
        <FieldError :errors="issues.errors('rules')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
