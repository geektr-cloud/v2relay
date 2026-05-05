<script setup lang="ts">
import Button from "@/components/ui/button/Button.vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { PopoverClose } from "reka-ui";
import { Trash, Check, X } from "lucide-vue-next";
import { useRouter } from "vue-router";

const props = defineProps<{
  label?: string;
  confirm: string;
  ctx: {
    loading: boolean;
    error: unknown;
    submit: () => Promise<unknown>;
  };
}>();

const router = useRouter();

const remove = () =>
  void props.ctx
    .submit()
    .then(() => router.back())
    .catch(() => {});
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
        <Button variant="secondary" size="icon" :disabled="ctx.loading" @click="void remove()">
          <Check v-if="!ctx.loading" />
          <Spinner v-else />
        </Button>
        <PopoverClose as-child>
          <Button variant="ghost" size="icon" v-show="!ctx.loading">
            <X />
          </Button>
        </PopoverClose>
      </div>
      <p v-if="ctx.error" class="text-red-500">{{ ctx.error }}</p>
    </PopoverContent>
  </Popover>
</template>
