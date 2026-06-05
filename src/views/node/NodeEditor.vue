<script setup lang="ts">
import { computed, ref } from "vue";
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
import { CopyTag, JsonTextArea } from "@/components/DataView";
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from "@/components/ui/tags-input";
import { useNodeStore } from "@/stores/nodes";
import SubscriptionSelect from "@/views/subscription/SubscriptionSelect.vue";

const props = defineProps<{ id: string | undefined }>();
const emit = defineEmits<{ (e: "close"): void }>();

const id = computed(() => props.id);
const { useUpsert } = useNodeStore();
const [form, issues, status, submit] = useUpsert(id);

const jsonInvalid = ref(false);
</script>

<template>
  <FieldSet class="w-xl">
    <FieldLegend>{{ id ? "编辑" : "创建" }}节点</FieldLegend>
    <FieldDescription>
      <CopyTag :value="id" variant="raw" />
    </FieldDescription>
    <FieldGroup>
      <Field>
        <FieldLabel>所属订阅</FieldLabel>
        <SubscriptionSelect v-model="form.subscriptionId" :disabled="status.loading" />
        <FieldError :errors="issues.errors('subscriptionId')" />
      </Field>
      <Field>
        <FieldLabel for="name">名称</FieldLabel>
        <Input id="name" v-model="form.name" placeholder="节点名称" @focus="issues.ingore('name')" />
        <FieldError :errors="issues.errors('name')" />
      </Field>
      <Field>
        <FieldLabel for="protocol">协议</FieldLabel>
        <Input
          id="protocol"
          v-model="form.protocol"
          placeholder="vmess / vless / trojan …"
          @focus="issues.ingore('protocol')"
        />
        <FieldError :errors="issues.errors('protocol')" />
      </Field>
      <Field>
        <FieldLabel for="ip">IP</FieldLabel>
        <Input id="ip" v-model="form.ip" placeholder="1.2.3.4" @focus="issues.ingore('ip')" />
        <FieldError :errors="issues.errors('ip')" />
      </Field>
      <Field>
        <FieldLabel for="priceRate">倍率</FieldLabel>
        <Input
          id="priceRate"
          type="number"
          min="0"
          :model-value="form.priceRate"
          @change="(e: Event) => (form.priceRate = parseFloat((e.target as HTMLInputElement).value) || 1)"
          @focus="issues.ingore('priceRate')"
        />
        <FieldError :errors="issues.errors('priceRate')" />
      </Field>
      <Field>
        <FieldLabel for="price">价格 (¥/GiB)</FieldLabel>
        <Input
          id="price"
          type="number"
          min="0"
          step="0.01"
          :model-value="form.price"
          @change="(e: Event) => (form.price = parseFloat((e.target as HTMLInputElement).value) || 0)"
          @focus="issues.ingore('price')"
        />
        <FieldDescription>由订阅单价 × 倍率自动计算；同步订阅时会覆盖。</FieldDescription>
        <FieldError :errors="issues.errors('price')" />
      </Field>
      <Field>
        <FieldLabel>标签</FieldLabel>
        <TagsInput v-model="form.tags" @focusin="issues.ingore('tags')">
          <TagsInputItem v-for="(tag, i) in form.tags" :key="`${tag}-${i}`" :value="tag">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput placeholder="输入标签后按回车" />
        </TagsInput>
        <FieldError :errors="issues.errors('tags')" />
      </Field>
      <Field>
        <FieldLabel for="remark">备注</FieldLabel>
        <Textarea id="remark" v-model="form.remark" @focus="issues.ingore('remark')" />
        <FieldError :errors="issues.errors('remark')" />
      </Field>
      <Field>
        <FieldLabel for="connInfo">连接信息 (JSON)</FieldLabel>
        <JsonTextArea
          id="connInfo"
          v-model="form.connInfo"
          :disabled="status.loading"
          @update:invalid="jsonInvalid = $event"
        />
      </Field>
    </FieldGroup>
  </FieldSet>
  <div class="mt-4 flex justify-end gap-2">
    <Button :disabled="status.loading || jsonInvalid" @click="submit().then(() => emit('close'))"> 保存 </Button>
    <Button variant="secondary" :disabled="status.loading" @click="emit('close')">取消</Button>
  </div>
</template>
