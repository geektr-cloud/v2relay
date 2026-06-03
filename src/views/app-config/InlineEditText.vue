<script setup lang="ts">
import { ref, watch } from "vue";
import { Check, Pencil } from "lucide-vue-next";
import { Input } from "@/components/ui/input";

const modelValue = defineModel<string>({ default: "" });
const props = withDefaults(defineProps<{ placeholder?: string; editable?: boolean }>(), { editable: true });

const editing = ref(false);

watch(
  modelValue,
  (v) => {
    if (!v && props.editable) editing.value = true;
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex items-center gap-1 shrink-0">
    <template v-if="!editable">
      <span class="bg-zinc-700 text-xs px-1.5 py-0.5 rounded truncate max-w-[8rem]">{{
        modelValue || placeholder
      }}</span>
    </template>
    <template v-else-if="editing">
      <slot name="edit">
        <Input
          v-model="modelValue"
          class="h-6 text-xs w-24"
          :placeholder="placeholder"
          @keydown.enter="editing = false"
        />
      </slot>
      <button class="text-muted-foreground hover:text-foreground" @click="editing = false">
        <Check class="size-3.5" />
      </button>
    </template>
    <template v-else>
      <span class="bg-zinc-700 text-xs px-1.5 py-0.5 rounded truncate max-w-[8rem]">{{
        modelValue || placeholder
      }}</span>
      <button class="text-muted-foreground hover:text-foreground" @click="editing = true">
        <Pencil class="size-3" />
      </button>
    </template>
  </div>
</template>
