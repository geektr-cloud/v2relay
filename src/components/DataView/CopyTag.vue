<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { useClipboard } from "@vueuse/core";
import { Check, Copy } from "lucide-vue-next";
import { VSeparator } from "./DataView.ts";

const { copy, copied } = useClipboard();

const props = defineProps<{
  label?: string;
  value: string;
}>();
</script>

<template>
  <Badge v-bind="$attrs" class="max-w-full flex items-center gap-2 cursor-pointer" @click="copy(value)">
    <code class="inline-block truncate min-w-0">{{ label ?? value }}</code>
    <VSeparator />
    <Copy class="size-3.5 shrink-0" v-if="!copied" />
    <Check class="size-3.5 shrink-0" v-else />
  </Badge>
</template>
