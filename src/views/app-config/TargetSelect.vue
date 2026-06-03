<script setup lang="ts">
import { computed } from "vue";
import { useTagStore } from "@/stores/tags";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const modelValue = defineModel<string>({ default: "" });
withDefaults(defineProps<{ editable?: boolean }>(), { editable: true });

const { useAll } = useTagStore();
const [tags, status] = useAll();

const targets = computed(() => tags.value.filter((t) => t.name.startsWith("target:")).map((t) => t.name.slice(7)));
</script>

<template>
  <Skeleton v-if="status.loading" class="h-7 w-full" />
  <span v-else-if="!editable" class="bg-zinc-700 text-xs px-1.5 py-0.5 rounded">{{ modelValue || "—" }}</span>
  <Select v-else v-model="modelValue">
    <SelectTrigger class="h-7 text-xs"><SelectValue placeholder="选择 Target" /></SelectTrigger>
    <SelectContent>
      <SelectItem v-for="t in targets" :key="t" :value="t">{{ t }}</SelectItem>
    </SelectContent>
  </Select>
</template>
