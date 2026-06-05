<script setup lang="ts">
import { computed } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxViewport,
} from "@/components/ui/combobox";
import { useTagStore } from "@/stores/tags";
import { useNodeStore } from "@/stores/nodes";
import SubscriptionSelect from "@/views/subscription/SubscriptionSelect.vue";
import type { nodeFilter } from "@server/core/nodes";

type Filter = nodeFilter.Filter;
type FilterType = Filter["type"];

const props = withDefaults(defineProps<{ depth?: number; editable?: boolean }>(), { depth: 0, editable: true });
const model = defineModel<Filter>({ required: true });

const depth = computed(() => props.depth);
const editable = computed(() => props.editable);

const TYPE_LABELS: Record<FilterType, string> = {
  none: "空 (匹配无)",
  all: "全部 (匹配所有)",
  and: "全部满足 (AND)",
  or: "任一满足 (OR)",
  not: "取反 (NOT)",
  subscription: "订阅",
  tag: "标签",
  protocol: "协议",
  name: "名称",
  price: "最大价格",
};

function blankFilter(type: FilterType): Filter {
  switch (type) {
    case "none":
      return { type: "none" };
    case "all":
      return { type: "all" };
    case "and":
      return { type: "and", value: [] };
    case "or":
      return { type: "or", value: [] };
    case "not":
      return { type: "not", value: { type: "none" } };
    case "subscription":
      return { type: "subscription", value: "" };
    case "tag":
      return { type: "tag", value: "" };
    case "protocol":
      return { type: "protocol", value: "" };
    case "name":
      return { type: "name", value: {} };
    case "price":
      return { type: "price", value: 0 };
  }
}

function changeType(next: FilterType) {
  if (next === model.value.type) return;
  model.value = blankFilter(next);
}

// ── and / or helpers ──────────────────────────────────────────────────────────
const groupItems = computed<Filter[]>({
  get: () => (model.value.type === "and" || model.value.type === "or" ? model.value.value : []),
  set: (v) => {
    if (model.value.type === "and" || model.value.type === "or") {
      model.value = { type: model.value.type, value: v };
    }
  },
});

function addGroupItem() {
  groupItems.value = [...groupItems.value, { type: "none" }];
}

function removeGroupItem(i: number) {
  groupItems.value = groupItems.value.filter((_, idx) => idx !== i);
}

function updateGroupItem(i: number, v: Filter) {
  groupItems.value = groupItems.value.map((item, idx) => (idx === i ? v : item));
}

// ── not helpers ───────────────────────────────────────────────────────────────
const notInner = computed<Filter>({
  get: (): Filter => (model.value.type === "not" ? model.value.value : { type: "none" }),
  set: (v: Filter) => {
    if (model.value.type === "not") model.value = { type: "not", value: v };
  },
});

// ── leaf helpers ──────────────────────────────────────────────────────────────
const leafString = computed<string>({
  get: () => {
    const m = model.value;
    if (m.type === "subscription" || m.type === "tag" || m.type === "protocol") return m.value;
    return "";
  },
  set: (v) => {
    const m = model.value;
    if (m.type === "subscription" || m.type === "tag" || m.type === "protocol") {
      model.value = { type: m.type, value: v };
    }
  },
});

const nameValue = computed<{ exact?: string; include?: string; exclude?: string }>({
  get: () => (model.value.type === "name" ? model.value.value : {}),
  set: (v) => {
    if (model.value.type === "name") model.value = { type: "name", value: v };
  },
});

function setNameField(key: "exact" | "include" | "exclude", v: string) {
  const next = { ...nameValue.value };
  if (v) next[key] = v;
  else delete next[key];
  nameValue.value = next;
}

// ── price helpers ─────────────────────────────────────────────────────────────
const priceValue = computed<number>({
  get: () => (model.value.type === "price" ? model.value.value : 0),
  set: (v: number) => {
    if (model.value.type === "price") model.value = { type: "price", value: v };
  },
});

function setPrice(v: string) {
  const n = parseFloat(v);
  priceValue.value = Number.isFinite(n) && n >= 0 ? n : 0;
}

// ── tag / protocol options ────────────────────────────────────────────────────
const tagStore = useTagStore();
const [tags] = tagStore.useAll();

const nodeStore = useNodeStore();
const [nodes] = nodeStore.useAll();
const protocols = computed(() => {
  const set = new Set<string>();
  for (const n of nodes.value) if (n.protocol) set.add(n.protocol);
  return [...set].sort();
});
const tagOptions = computed(() => {
  const set = new Set<string>();
  for (const t of tags.value) if (t.name) set.add(t.name);
  for (const n of nodes.value) for (const t of n.tags) if (t) set.add(t);
  return [...set].sort();
});

const indentClass = computed(() => (depth.value > 0 ? "border-l-2 pl-3" : ""));
</script>

<template>
  <div class="flex flex-col gap-2" :class="indentClass">
    <div class="flex items-center gap-2">
      <Select :model-value="model.type" :disabled="!editable" @update:model-value="(v) => changeType(v as FilterType)">
        <SelectTrigger class="w-44" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent :use-portal="false">
          <SelectItem v-for="(label, key) in TYPE_LABELS" :key="key" :value="key">
            {{ label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- subscription -->
      <SubscriptionSelect v-if="model.type === 'subscription'" size="sm" v-model="leafString" :disabled="!editable" />

      <!-- tag -->
      <template v-else-if="model.type === 'tag'">
        <Combobox
          :model-value="leafString"
          :search-term="leafString"
          class="flex-1"
          @update:model-value="(v: unknown) => (leafString = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? ''))"
          @update:search-term="(v: string) => (leafString = v)"
        >
          <ComboboxAnchor class="w-full h-7">
            <ComboboxInput input-group-class="h-7" :disabled="!editable" placeholder="标签名" />
          </ComboboxAnchor>
          <ComboboxList>
            <ComboboxEmpty>无匹配标签</ComboboxEmpty>
            <ComboboxViewport>
              <ComboboxItem v-for="t in tagOptions" :key="t" :value="t">
                {{ t }}
              </ComboboxItem>
            </ComboboxViewport>
          </ComboboxList>
        </Combobox>
      </template>

      <!-- protocol -->
      <template v-else-if="model.type === 'protocol'">
        <Select v-if="protocols.length" v-model="leafString" :disabled="!editable">
          <SelectTrigger class="flex-1" size="sm">
            <SelectValue placeholder="选择协议" />
          </SelectTrigger>
          <SelectContent :use-portal="false">
            <SelectItem v-for="p in protocols" :key="p" :value="p">
              {{ p }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input v-else v-model="leafString" :disabled="!editable" placeholder="协议名" />
      </template>
    </div>

    <!-- name -->
    <div v-if="model.type === 'name'" class="grid grid-cols-3 gap-2">
      <Field>
        <FieldLabel>精确匹配</FieldLabel>
        <Input
          :model-value="nameValue.exact ?? ''"
          :disabled="!editable"
          placeholder="exact"
          @update:model-value="(v) => setNameField('exact', String(v ?? ''))"
        />
      </Field>
      <Field>
        <FieldLabel>包含</FieldLabel>
        <Input
          :model-value="nameValue.include ?? ''"
          :disabled="!editable"
          placeholder="include"
          @update:model-value="(v) => setNameField('include', String(v ?? ''))"
        />
      </Field>
      <Field>
        <FieldLabel>排除</FieldLabel>
        <Input
          :model-value="nameValue.exclude ?? ''"
          :disabled="!editable"
          placeholder="exclude"
          @update:model-value="(v) => setNameField('exclude', String(v ?? ''))"
        />
      </Field>
    </div>

    <!-- price -->
    <div v-if="model.type === 'price'" class="grid grid-cols-1 gap-2">
      <Field>
        <FieldLabel>最大价格 (¥/GiB)</FieldLabel>
        <Input
          type="number"
          min="0"
          step="0.01"
          :model-value="priceValue"
          :disabled="!editable"
          placeholder="0"
          @change="(e: Event) => setPrice((e.target as HTMLInputElement).value)"
        />
      </Field>
    </div>

    <!-- not -->
    <div v-if="model.type === 'not'" class="mt-1">
      <NodeFilter
        :model-value="notInner"
        :depth="depth + 1"
        :editable="editable"
        @update:model-value="(v: Filter) => (notInner = v)"
      />
    </div>

    <!-- and / or -->
    <div v-if="model.type === 'and' || model.type === 'or'" class="flex flex-col gap-2">
      <div v-if="groupItems.length === 0" class="text-muted-foreground text-sm">无子规则</div>
      <div v-for="(child, i) in groupItems" :key="i" class="flex items-start gap-2">
        <div class="flex-1">
          <NodeFilter
            :model-value="child"
            :depth="depth + 1"
            :editable="editable"
            @update:model-value="(v: Filter) => updateGroupItem(i, v)"
          />
        </div>
        <Button v-if="editable" variant="ghost" size="icon" type="button" @click="removeGroupItem(i)">
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
      <div v-if="editable">
        <Button variant="outline" size="sm" type="button" @click="addGroupItem">
          <Plus class="h-4 w-4" /> 添加子规则
        </Button>
      </div>
    </div>
  </div>
</template>
