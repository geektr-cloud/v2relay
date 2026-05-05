<script setup lang="ts">
import { useSubscriptionStore } from "@/stores/subscriptions";
import SubscriptionList from "./SubscriptionList.vue";
import SubscriptionEditor from "./SubscriptionEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useSubscriptionStore();
const { create } = useFormModel(SubscriptionEditor);
const store = useAll();
</script>

<template>
  <PageEntry
    title="订阅条目"
    description="每条订阅关联一个提供商，urls 可为多行备用链接。"
    :loading="store.loading"
    :error="store.error"
    :items="store.items"
    @retry="void store.reload()"
    @create="create()"
  >
    <SubscriptionList />
  </PageEntry>
</template>
