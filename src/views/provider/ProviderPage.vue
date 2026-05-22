<script setup lang="ts">
import { useProviderStore } from "@/stores/providers";
import ProviderList from "./ProviderList.vue";
import ProviderEditor from "./ProviderEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useProviderStore();
const { create } = useFormModel(ProviderEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="订阅服务提供商"
    description="永远怀念喵帕斯"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <ProviderList />
  </PageEntry>
</template>
