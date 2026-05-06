<script setup lang="ts">
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionStore } from "@/stores/subscriptions";

const { useAll } = useSubscriptionStore();
const store = useAll();
</script>

<template>
  <Skeleton v-if="store.loading" class="h-8 w-full" />
  <Select v-else>
    <SelectTrigger>
      <SelectValue placeholder="选择订阅" />
    </SelectTrigger>
    <SelectContent :use-portal="false">
      <SelectItem v-for="item in store.items" :key="item.id" :value="item.id">
        {{ item.name || item.provider.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
