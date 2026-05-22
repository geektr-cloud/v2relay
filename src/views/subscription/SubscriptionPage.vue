<script setup lang="ts">
import { useSubscriptionStore } from "@/stores/subscriptions";
import SubscriptionList from "./SubscriptionList.vue";
import SubscriptionEditor from "./SubscriptionEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useSubscriptionStore();
const { create } = useFormModel(SubscriptionEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
title="订阅条目" description="每条订阅关联一个提供商，urls 可为多行备用链接。" :loading="status.loading"
    :error="status.error" :items="items" @retry="void refresh()" @create="create()">
    <SubscriptionList />
  </PageEntry>
</template>
