<script setup lang="ts">
import type { ComboboxInputEmits, ComboboxInputProps } from "reka-ui";

import type { HTMLAttributes } from "vue";
import { SearchIcon } from "lucide-vue-next";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxInput, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<
  ComboboxInputProps & {
    inputGroupClass?: HTMLAttributes["class"];
    class?: HTMLAttributes["class"];
  }
>();

const emits = defineEmits<ComboboxInputEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <InputGroup :class="props.inputGroupClass">
    <InputGroupAddon>
      <SearchIcon class="size-4 shrink-0 opacity-50" />
    </InputGroupAddon>
    <ComboboxInput
      data-slot="combobox-input"
      :class="cn('flex-1 outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
      v-bind="{ ...$attrs, ...forwarded }"
    />
  </InputGroup>
</template>
