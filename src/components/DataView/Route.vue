<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import type { RouteLocationRaw } from "vue-router";
import { Minus } from "lucide-vue-next";

defineOptions({ name: "DataRoute" });
defineProps<{ to?: RouteLocationRaw | null }>();
</script>

<template>
  <Badge as-child v-bind="$attrs" variant="link">
    <RouterLink :to="to ?? ''">
      <slot>
        <Minus />
      </slot>
    </RouterLink>
  </Badge>
</template>
