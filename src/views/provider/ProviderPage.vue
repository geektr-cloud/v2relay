<script setup lang="ts">
import { useProviderStore } from "@/stores/providers";
import ProviderList from "./ProviderList.vue";
import ProviderEditor from "./ProviderEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useProviderStore();
const { create } = useFormModel(ProviderEditor);

const store = useAll();
</script>

<template>
  <PageEntry
    title="订阅服务提供商"
    description="永远怀念喵帕斯"
    :loading="store.loading"
    :error="store.error"
    :items="store.items"
    @retry="void store.reload()"
    @create="create()"
  >
    <ProviderList />
  </PageEntry>
</template>
