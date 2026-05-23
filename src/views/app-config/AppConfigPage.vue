<script setup lang="ts">
import { useAppConfigStore } from "@/stores/app-configs";
import AppConfigList from "./AppConfigList.vue";
import AppConfigEditor from "./AppConfigEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useAppConfigStore();
const { create } = useFormModel(AppConfigEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="应用配置"
    description="管理应用配置模板，每条配置包含名称、类型、模板和 JSON 配置。"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <AppConfigList />
  </PageEntry>
</template>
