<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
</script>

<template>
  <Badge class="cursor-pointer" v-bind="$attrs">
    <slot />
  </Badge>
</template>
