<script setup lang="ts">
import { computed } from "vue";
import Button from "@/components/ui/button/Button.vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { PopoverClose } from "reka-ui";
import { Trash, Check, X } from "lucide-vue-next";
import { useAsyncState } from "@vueuse/core";
import { useRouter } from "vue-router";

const props = defineProps<{
  label?: string;
  action: () => Promise<void>;
  confirm: string;
}>();

const { isLoading, execute, error } = useAsyncState(props.action, null, {
  immediate: false,
  onSuccess: () => router.back(),
});

const router = useRouter();
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="destructive">
        <Trash />
        <slot>{{ label }}</slot>
      </Button>
    </PopoverTrigger>
    <PopoverContent side="left" class="w-auto">
      <div class="flex flex-row items-center gap-2">
        <div>{{ confirm }}</div>
        <Button variant="secondary" size="icon" :disabled="isLoading" @click="execute()">
          <Check v-if="!isLoading" />
          <Spinner v-else />
        </Button>
        <PopoverClose as-child>
          <Button variant="ghost" size="icon" v-show="!isLoading">
            <X />
          </Button>
        </PopoverClose>
      </div>
      <p v-if="error" class="text-red-500">{{ error }}</p>
    </PopoverContent>
  </Popover>
</template>
