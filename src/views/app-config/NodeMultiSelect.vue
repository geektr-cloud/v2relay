<script setup lang="ts">
import { useNodeStore } from "@/stores/nodes";
import { EntitySelect } from "@/components/DataView";
import { node } from "@server/core/nodes";

const modelValue = defineModel<string[]>({ default: () => [] });

const { useAll } = useNodeStore();
const [items, status] = useAll();

const transformFn = (n: node.AggregatedNode) => ({
  id: n.id,
  searchText: `${n.subscription.name} ${n.name} ${n.ip} ${n.protocol} ${n.remark} ${n.tags.join(" ")}`,
  title: `${n.subscription.name} - ${n.name}`,
  summary: `${n.protocol} ${n.remark}`,
});
</script>

<template>
  <EntitySelect
    v-model="modelValue"
    :items="items"
    :status="status"
    :transform-fn="transformFn"
    placeholder="选择节点"
  />
</template>
