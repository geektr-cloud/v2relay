<script setup lang="ts">
import { useRouteStore } from "@/stores/routes";
import RouteList from "./RouteList.vue";
import RouteEditor from "./RouteEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useRouteStore();
const { create } = useFormModel(RouteEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="路由"
    description="管理路由：每条路由绑定若干规则集与节点筛选条件。"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <RouteList />
  </PageEntry>
</template>
