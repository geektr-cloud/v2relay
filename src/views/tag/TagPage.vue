<script setup lang="ts">
import { useTagStore } from "@/stores/tags";
import TagList from "./TagList.vue";
import TagEditor from "./TagEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useTagStore();
const { create } = useFormModel(TagEditor);

const store = useAll();
</script>

<template>
  <PageEntry
    title="标签管理"
    description="管理标签及其关键词匹配规则。"
    :loading="store.loading"
    :error="store.error"
    :items="store.items"
    @retry="void store.reload()"
    @create="create()"
  >
    <TagList />
  </PageEntry>
</template>
