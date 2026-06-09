<script setup lang="ts">
import { computed } from "vue";
import { VueMonacoEditor } from "@guolao/vue-monaco-editor";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyTag, JsonTextArea } from "@/components/DataView";
import { useAppConfigStore } from "@/stores/app-configs";
import { appConfig } from "@server/core/app-configs";
import NodeFilter from "@/views/node/NodeFilter.vue";
import RoutesConfig from "./RoutesConfig.vue";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useAppConfigStore();
const [form, issues, status, submit] = useUpsert(id);

const templateLang = computed(() => (form.type === "clash" ? "yaml" : form.type === "v2ray" ? "json" : "plaintext"));

const editorOptions = {
  fontSize: 12,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  tabSize: 2,
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
};

const useRoutesPicker = computed(() => form.type === "clash");
</script>

<template>
  <FieldSet class="w-2xl">
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
        <FieldLabel for="overrideName">展示名称</FieldLabel>
        <FieldDescription>非空时优先用于生成 QR / 订阅 URL 的 name 参数；默认回退到“名称”。</FieldDescription>
        <Input
          id="overrideName"
          v-model="form.overrideName"
          placeholder="可选"
          @focus="issues.ingore('overrideName')"
        />
        <FieldError :errors="issues.errors('overrideName')" />
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
        <FieldLabel>节点筛选</FieldLabel>
        <FieldDescription>非 none 时，生成订阅前会先用此筛选缩小节点池；各路由的 filter 在其结果上再次筛选。</FieldDescription>
        <NodeFilter v-model="form.nodeFilter" />
        <FieldError :errors="issues.errors('nodeFilter')" />
      </Field>
      <Field>
        <FieldLabel>模板</FieldLabel>
        <FieldDescription>
          {{
            form.type === "clash" ? "YAML — 渲染时与 proxies / proxy-groups / rules 合并" : "JSON 模板"
          }}
        </FieldDescription>
        <div class="rounded border border-input">
          <VueMonacoEditor
            v-model:value="form.template"
            :language="templateLang"
            theme="vs-dark"
            :options="editorOptions"
            height="240px"
          />
        </div>
        <FieldError :errors="issues.errors('template')" />
      </Field>
      <Field>
        <FieldLabel>配置</FieldLabel>
        <RoutesConfig v-if="useRoutesPicker" v-model="form.config" />
        <JsonTextArea v-else v-model="form.config" />
        <FieldError :errors="issues.errors('config')" />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading" @click="submit().then(() => emit('close'))">保存</Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
