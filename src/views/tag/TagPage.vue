<script setup lang="ts">
import { useTagStore } from "@/stores/tags";
import TagList from "./TagList.vue";
import TagEditor from "./TagEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useTagStore();
const { create } = useFormModel(TagEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
title="标签管理" description="管理标签及其关键词匹配规则。" :loading="status.loading" :error="status.error"
    :items="items" @retry="void refresh()" @create="create()">
    <TagList />
  </PageEntry>
</template>
