<script setup lang="ts">
import { computed } from "vue";
import { format as _format } from "date-fns";

const props = withDefaults(
  defineProps<{
    value: Date;
    format?: string;
  }>(),
  {
    format: "datetime",
  },
);

const dateFormatPresets: Record<string, string> = {
  date: "yyyy-MM-dd",
  datetime: "yyyy-MM-dd HH:mm:ss",
  time: "HH:mm:ss",
  timestamp: "T",
};

const dateString = computed(() => _format(props.value, dateFormatPresets[props.format] ?? props.format));
</script>

<template>
  <span>{{ dateString }}</span>
</template>
