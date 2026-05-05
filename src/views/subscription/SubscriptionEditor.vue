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
import { CopyTag, MultiLineInput } from "@/components/DataView";
import type { CMS } from "@/components/CMS";
import { useSubscriptionStore } from "@/stores/subscriptions";
import ProviderSelect from "@/views/provider/ProviderSelect.vue";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const props = defineProps<{ id: CMS.Id | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useSubscriptionStore();
const [form, issues, upsert] = useUpsert(id);
</script>

<template>
  <FieldSet class="w-xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}订阅条目</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel>提供商</FieldLabel>
        <ProviderSelect v-model="form.providerId" :disabled="upsert.loading" @focus="issues.ingore('providerId')" />
        <FieldError :errors="issues.errors('providerId')" />
      </Field>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="可选，便于识别" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel for="remark">备注</FieldLabel>
        <Textarea id="remark" v-model="form.remark" placeholder="可选，用于描述订阅" @focus="issues.ingore('remark')" />
        <FieldError :errors="issues.errors('remark')" />
      </Field>
      <Field>
        <FieldLabel>订阅链接</FieldLabel>
        <MultiLineInput
          v-model="form.urls"
          placeholder="https://example.com/sub"
          add-text="添加链接"
          :disabled="upsert.loading"
          @focusin="issues.ingore('urls')"
        />
        <FieldError :errors="issues.errors('urls')" />
      </Field>
      <Field orientation="horizontal" class="border px-3 py-5">
        <FieldLabel>启用</FieldLabel>
        <Switch v-model="form.enabled" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="upsert.loading" @click="upsert.submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="upsert.loading" @click="emit('close')">取消</Button>
  </div>
</template>
