<script setup lang="ts">
import { type Reactive } from "vue";
import Button from "@/components/ui/button/Button.vue";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { PopoverPortal, type ReferenceElement } from "reka-ui";
import { Check, X } from "lucide-vue-next";
import { type useAsyncState } from "@vueuse/core";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
  anchor?: ReferenceElement;
  confirm: string;
  removal: Reactive<ReturnType<typeof useAsyncState>>;
}>();

const remove = () =>
  void props.removal
    .execute()
    .then(() => {
      open.value = false;
    })
    .catch(() => {});
</script>

<template>
  <Popover :open="open">
    <PopoverAnchor :reference="anchor" />
    <PopoverPortal>
      <PopoverContent side="left" class="w-auto">
        <div class="flex flex-row items-center gap-2">
          <div>{{ confirm }}</div>
          <Button variant="secondary" size="icon" :disabled="removal.isLoading" @click="void remove()">
            <Check v-if="!removal.isLoading" />
            <Spinner v-else />
          </Button>
          <Button variant="ghost" size="icon" v-show="!removal.isLoading" @click="open = false">
            <X />
          </Button>
        </div>
        <p v-if="removal.error" class="text-red-500">{{ removal.error }}</p>
      </PopoverContent>
    </PopoverPortal>
  </Popover>
</template>
