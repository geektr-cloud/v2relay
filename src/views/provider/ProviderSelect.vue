<script setup lang="ts">
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProviderStore } from "@/stores/providers";

const { useAll } = useProviderStore();
const store = useAll();
</script>

<template>
  <Skeleton v-if="store.loading" class="w-25 h-8 p-2" />
  <Select v-else>
    <SelectTrigger>
      <SelectValue placeholder="选择提供商" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="item in store.items" :key="item.id" :value="item.id">
        {{ item.name }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
