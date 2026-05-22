<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionStore } from "@/stores/subscriptions";

defineProps<{ disabled?: boolean }>();
const modelValue = defineModel<string | undefined>();

const { useAll } = useSubscriptionStore();
const [items, status] = useAll();
</script>

<template>
  <Skeleton v-if="status.loading" class="h-8 w-full" />
  <Select v-else v-model="modelValue" :disabled="disabled">
    <SelectTrigger>
      <SelectValue placeholder="选择订阅" />
    </SelectTrigger>
    <SelectContent :use-portal="false">
      <SelectItem v-for="item in items" :key="item.id" :value="item.id">
        {{ item.name || item.id }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
