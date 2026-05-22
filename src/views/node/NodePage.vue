<script setup lang="ts">
import { useNodeStore } from "@/stores/nodes";
import NodeList from "./NodeList.vue";
import NodeEditor from "./NodeEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useNodeStore();
const { create } = useFormModel(NodeEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="节点管理"
    description="管理所有节点及其连接信息。"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <NodeList />
  </PageEntry>
</template>
