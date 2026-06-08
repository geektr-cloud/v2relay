<script setup lang="ts">
import { computed } from "vue";
import RouteRefList from "@/views/route/RouteRefList.vue";
import type { ClashConfigData } from "@server/core/app-configs/adapter/clash";

const props = withDefaults(
  defineProps<{ modelValue: ClashConfigData | undefined; editable?: boolean }>(),
  { editable: true },
);
const emit = defineEmits<{ "update:modelValue": [value: ClashConfigData] }>();

const routes = computed<string[]>({
  get: () => props.modelValue?.routes ?? [],
  set: (v) => emit("update:modelValue", { routes: v }),
});
</script>

<template>
  <div class="flex flex-col gap-2 rounded border border-input p-3 text-sm">
    <span class="text-sm font-medium">路由</span>
    <RouteRefList v-model="routes" :editable="editable" />
  </div>
</template>
