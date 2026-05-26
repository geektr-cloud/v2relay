<script setup lang="ts">
import { ref } from "vue";
import { Check, Pencil } from "lucide-vue-next";

defineProps<{ labels: string[]; placeholder?: string }>();
const editing = ref(false);
</script>

<template>
  <div class="flex-1 min-w-0">
    <template v-if="editing">
      <div class="flex items-center gap-1">
        <div class="flex-1 min-w-0">
          <slot />
        </div>
        <button class="text-muted-foreground hover:text-foreground shrink-0" @click="editing = false">
          <Check class="size-3.5" />
        </button>
      </div>
    </template>
    <div v-else class="flex items-center gap-1 flex-wrap">
      <span
        v-for="(label, i) in labels"
        :key="i"
        class="bg-zinc-700 text-xs px-1.5 py-0.5 rounded truncate max-w-[8rem]"
        >{{ label }}</span
      >
      <span v-if="!labels.length" class="text-xs text-muted-foreground">{{ placeholder ?? "未选择" }}</span>
      <button class="text-muted-foreground hover:text-foreground shrink-0" @click="editing = true">
        <Pencil class="size-3" />
      </button>
    </div>
  </div>
</template>
