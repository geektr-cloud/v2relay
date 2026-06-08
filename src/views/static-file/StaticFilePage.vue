<script setup lang="ts">
import { useStaticFileStore } from "@/stores/static-files";
import StaticFileList from "./StaticFileList.vue";
import StaticFileEditor from "./StaticFileEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useStaticFileStore();
const { create } = useFormModel(StaticFileEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="静态文件"
    description="代理远端文件并按 expire 秒缓存，提供免鉴权访问入口。"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <StaticFileList />
  </PageEntry>
</template>
