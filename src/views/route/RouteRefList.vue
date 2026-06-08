<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDragAndDrop } from "@formkit/drag-and-drop/vue";
import { GripVertical, Plus, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useRouteStore } from "@/stores/routes";

const props = withDefaults(defineProps<{ modelValue: string[]; editable?: boolean }>(), { editable: true });
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const { useAll } = useRouteStore();
const [routes] = useAll();
const routeById = computed(() => new Map(routes.value.map((r) => [r.id, r])));

const [parent, values] = useDragAndDrop<string>([...props.modelValue], {
  dragHandle: ".drag-handle",
});

const sameSeq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

watch(
  values,
  (v) => {
    if (sameSeq(v, props.modelValue)) return;
    emit("update:modelValue", [...v]);
  },
  { deep: true },
);

watch(
  () => props.modelValue,
  (v) => {
    if (sameSeq(v, values.value)) return;
    values.value = [...v];
  },
);

const removeAt = (idx: number) => {
  const next = [...values.value];
  next.splice(idx, 1);
  emit("update:modelValue", next);
};

const open = ref(false);
const search = ref("");
const available = computed(() => {
  const set = new Set(values.value);
  return routes.value.filter((r) => !set.has(r.id));
});
const filtered = computed(() => {
  const term = search.value.toLowerCase();
  if (!term) return available.value;
  return available.value.filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(term));
});
const addOne = (id: string) => {
  emit("update:modelValue", [...values.value, id]);
  open.value = false;
};
</script>

<template>
  <div class="flex flex-col gap-1">
    <div ref="parent" class="flex flex-col gap-1">
      <div
        v-for="(id, i) in values"
        :key="id"
        class="flex items-center gap-2 rounded border border-input bg-zinc-800/40 px-2 py-1 text-xs"
      >
        <GripVertical v-if="editable" class="drag-handle size-3.5 shrink-0 text-muted-foreground cursor-grab" />
        <Badge variant="outline" class="text-xs">
          {{ routeById.get(id)?.overrideName || routeById.get(id)?.name || id.slice(0, 8) }}
        </Badge>
        <span class="text-muted-foreground">{{ routeById.get(id)?.outbound ?? "?" }}</span>
        <span class="flex-1"></span>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0 text-destructive"
          @click="removeAt(i)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
      <p v-if="!values.length" class="text-xs text-muted-foreground px-2 py-1">未选择路由</p>
    </div>
    <Popover v-if="editable" v-model:open="open">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="sm" class="h-6 self-start text-xs">
          <Plus class="size-3.5" /> 添加路由
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" class="w-80 max-h-80 flex flex-col">
        <Input v-model="search" class="h-6 text-xs" placeholder="搜索路由..." />
        <div class="overflow-y-auto flex-1 -mx-1 mt-1">
          <button
            v-for="r in filtered"
            :key="r.id"
            class="flex flex-col items-start gap-0 w-full px-1 py-1 rounded hover:bg-accent text-left"
            @click="addOne(r.id)"
          >
            <span class="text-xs truncate">{{ r.overrideName || r.name }}</span>
            <span class="text-xs text-muted-foreground truncate">
              {{ r.outbound }} · {{ r.rulesets.length }} 规则集
            </span>
          </button>
          <p v-if="!filtered.length" class="text-xs text-muted-foreground px-1 py-2">无可添加路由</p>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
