<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useThrottleFn } from "@vueuse/core";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySelect } from "@/components/DataView";
import TargetSelect from "./TargetSelect.vue";
import InlineEditText from "./InlineEditText.vue";
import RulesetMultiSelect from "./RulesetMultiSelect.vue";
import NodeFilter from "@/views/node/NodeFilter.vue";
import type { ClashConfigData } from "@server/core/app-configs/adapter/clash";
import type { nodeFilter } from "@server/core/nodes";
import { route } from "@server/core/routes";

const emptyFilter = (): nodeFilter.Filter => ({ type: "none" });

function normalizeFilter(v: unknown): nodeFilter.Filter {
  if (v && typeof v === "object" && "type" in v) return v as nodeFilter.Filter;
  return emptyFilter();
}

function normalizeOutbound(v: unknown): route.Outbound {
  return (route.OUTBOUND_VALUES as readonly string[]).includes(v as string) ? (v as route.Outbound) : "PROXY";
}

function normalize(input: ClashConfigData | undefined): ClashConfigData {
  if (!input) {
    return {
      nodeGroups: [{ name: "all", filter: emptyFilter() }],
      rulesetGroups: [],
      routing: [],
    };
  }
  return {
    nodeGroups: (input.nodeGroups ?? []).map((g) => ({ name: g.name, filter: normalizeFilter(g.filter) })),
    rulesetGroups: input.rulesetGroups ?? [],
    routing: (input.routing ?? []).map((r) => ({
      target: r.target,
      outbound: normalizeOutbound(r.outbound),
      nodeGroups: r.nodeGroups ?? [],
      filter: normalizeFilter(r.filter),
    })),
  };
}

const props = withDefaults(defineProps<{ modelValue: ClashConfigData; editable?: boolean }>(), { editable: true });
const emit = defineEmits<{ "update:modelValue": [value: ClashConfigData] }>();

const config = reactive<ClashConfigData>(normalize(JSON.parse(JSON.stringify(props.modelValue ?? null))));

const throttledEmit = useThrottleFn(() => {
  emit("update:modelValue", JSON.parse(JSON.stringify(config)));
}, 700);

watch(config, throttledEmit, { deep: true });

const groupItems = computed(() =>
  config.nodeGroups
    .filter((g) => !!g.name)
    .map((g) => ({
      id: g.name,
      searchText: g.name,
      title: g.name,
    })),
);
</script>

<template>
  <div class="flex flex-col gap-4 rounded border border-input p-3 text-sm">
    <!-- 规则组 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">规则组</span>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="config.rulesetGroups.push({ target: '', rulesets: [] })"
        >
          <Plus class="size-3.5" />
        </Button>
      </div>
      <div v-for="(g, i) in config.rulesetGroups" :key="i" class="flex items-center gap-2 mb-2">
        <InlineEditText v-model="g.target" placeholder="target" :editable="editable">
          <template #edit>
            <TargetSelect v-model="g.target" :editable="editable" />
          </template>
        </InlineEditText>
        <ArrowLeft class="size-3.5 shrink-0 text-muted-foreground" />
        <RulesetMultiSelect v-model="g.rulesets" :editable="editable" />
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0 text-destructive"
          @click="config.rulesetGroups.splice(i, 1)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>

    <!-- 节点组 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">节点组</span>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="config.nodeGroups.push({ name: '', filter: emptyFilter() })"
        >
          <Plus class="size-3.5" />
        </Button>
      </div>
      <div v-for="(g, i) in config.nodeGroups" :key="i" class="flex items-center gap-2 mb-2">
        <InlineEditText v-model="g.name" placeholder="组名" :editable="editable" />
        <ArrowRight class="size-3.5 shrink-0 text-muted-foreground mt-1.5" />
        <div class="flex-1 min-w-0">
          <NodeFilter v-model="g.filter" :editable="editable" />
        </div>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0 text-destructive"
          @click="config.nodeGroups.splice(i, 1)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>

    <!-- 路由策略 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">路由策略</span>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="config.routing.push({ target: '', outbound: 'PROXY', nodeGroups: [], filter: emptyFilter() })"
        >
          <Plus class="size-3.5" />
        </Button>
      </div>
      <div v-for="(r, i) in config.routing" :key="i" class="flex items-start gap-2 mb-2">
        <InlineEditText v-model="r.target" placeholder="target" :editable="editable">
          <template #edit>
            <TargetSelect v-model="r.target" :editable="editable" />
          </template>
        </InlineEditText>
        <ArrowRight class="size-3.5 shrink-0 text-muted-foreground mt-1.5" />
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <Select v-if="editable" v-model="r.outbound">
            <SelectTrigger class="h-7 text-xs"><SelectValue placeholder="出站类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="v in route.OUTBOUND_VALUES" :key="v" :value="v">{{ v }}</SelectItem>
            </SelectContent>
          </Select>
          <span v-else class="bg-zinc-700 text-xs px-1.5 py-0.5 rounded self-start">{{ r.outbound }}</span>
          <template v-if="r.outbound === 'PROXY'">
            <EntitySelect
              v-model="r.nodeGroups"
              :items="groupItems"
              :transform-fn="(i) => i"
              placeholder="选择节点组"
              :editable="editable"
            />
            <NodeFilter v-model="r.filter" :editable="editable" />
          </template>
        </div>
        <Button
          v-if="editable"
          variant="ghost"
          size="icon"
          class="h-6 w-6 shrink-0 text-destructive"
          @click="config.routing.splice(i, 1)"
        >
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>
  </div>
</template>
