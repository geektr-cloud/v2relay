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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyTag } from "@/components/DataView";
import { useRouteStore } from "@/stores/routes";
import { route } from "@server/core/routes";
import NodeFilter from "@/views/node/NodeFilter.vue";
import RulesetMultiSelect from "@/views/app-config/RulesetMultiSelect.vue";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useRouteStore();
const [form, issues, status, submit] = useUpsert(id);

const FEATURE_OPTIONS: { value: route.Feature; label: string }[] = [
  { value: "auto", label: "URL测试" },
  { value: "lb", label: "负载均衡" },
];

const toggleFeature = (v: route.Feature, on: boolean) => {
  const set = new Set(form.features);
  if (on) set.add(v);
  else set.delete(v);
  form.features = [...set];
};
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
        <FieldLabel for="overrideName">显示名（可选）</FieldLabel>
        <Input
          id="overrideName"
          v-model="form.overrideName"
          placeholder="留空则用名称"
          @focus="issues.ingore('overrideName')"
        />
        <FieldDescription>生成订阅时优先用此名</FieldDescription>
        <FieldError :errors="issues.errors('overrideName')" />
      </Field>
      <Field>
        <FieldLabel>出站类型</FieldLabel>
        <Select v-model="form.outbound">
          <SelectTrigger><SelectValue placeholder="选择出站类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="v in route.OUTBOUND_VALUES" :key="v" :value="v">{{ v }}</SelectItem>
          </SelectContent>
        </Select>
        <FieldError :errors="issues.errors('outbound')" />
      </Field>
      <Field>
        <FieldLabel>规则集</FieldLabel>
        <RulesetMultiSelect v-model="form.rulesets" />
        <FieldError :errors="issues.errors('rulesets')" />
      </Field>
      <Field>
        <FieldLabel for="rules">附加规则</FieldLabel>
        <Textarea
          id="rules"
          v-model="form.rules"
          rows="6"
          placeholder="DOMAIN-SUFFIX,example.com&#10;IP-CIDR,10.0.0.0/8"
          class="font-mono text-xs"
          @focus="issues.ingore('rules')"
        />
        <FieldDescription>每行一条规则，追加于规则集之后</FieldDescription>
        <FieldError :errors="issues.errors('rules')" />
      </Field>
      <Field v-if="form.outbound === 'PROXY'">
        <FieldLabel>节点筛选</FieldLabel>
        <NodeFilter v-model="form.filter" />
        <FieldError :errors="issues.errors('filter')" />
      </Field>
      <Field v-if="form.outbound === 'PROXY'">
        <FieldLabel>组特性</FieldLabel>
        <div class="flex flex-wrap gap-3">
          <label v-for="opt in FEATURE_OPTIONS" :key="opt.value" class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              :checked="form.features.includes(opt.value)"
              @change="toggleFeature(opt.value, ($event.target as HTMLInputElement).checked)"
            />
            {{ opt.label }}
          </label>
        </div>
        <FieldError :errors="issues.errors('features')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
