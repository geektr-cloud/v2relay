<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import CopyBtn from "./CopyBtn.vue";
import { VSeparator } from "./DataView.ts";
import { ExternalLink, Minus } from "lucide-vue-next";

const props = defineProps<{ label?: string; href?: string | null }>();
</script>

<template>
  <Badge v-if="href" v-bind="$attrs" class="max-w-full flex items-center gap-1" variant="link">
    <a :href="href" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1">
      <ExternalLink class="size-3.5 shrink-0" />
      <code class="inline-block truncate min-w-0">{{ label ?? href }}</code>
    </a>
    <VSeparator />
    <CopyBtn :value="href" />
  </Badge>
  <Badge v-else v-bind="$attrs" variant="link">
    <Minus class="size-3.5 shrink-0" />
  </Badge>
</template>
