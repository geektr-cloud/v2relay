<script setup lang="ts">
import { useNodeStore } from "@/stores/nodes";
import NodeList from "./NodeList.vue";
import NodeEditor from "./NodeEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useNodeStore();
const { create } = useFormModel(NodeEditor);

const store = useAll();
</script>

<template>
  <PageEntry
    title="节点管理"
    description="管理所有节点及其连接信息。"
    :loading="store.loading"
    :error="store.error"
    :items="store.items"
    @retry="void store.reload()"
    @create="create()"
  >
    <NodeList />
  </PageEntry>
</template>
