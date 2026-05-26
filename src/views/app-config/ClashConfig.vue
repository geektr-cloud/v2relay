<script setup lang="ts">
import { computed, reactive, watch, toRaw} from "vue";
import { useThrottleFn } from "@vueuse/core";
import { ArrowRight, Plus, Trash2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/DataView";
import TargetSelect from "./TargetSelect.vue";
import InlineEditText from "./InlineEditText.vue";
import NodeMultiSelect from "./NodeMultiSelect.vue";
import RulesetMultiSelect from "./RulesetMultiSelect.vue";

interface NodeGroup {
  name: string;
  nodes: string[];
}
interface RulesetGroup {
  target: string;
  rulesets: string[];
}
interface Routing {
  target: string;
  nodeGroups: string[];
  nodes: string[];
}
interface ClashConfig {
  nodeGroups: NodeGroup[];
  rulesetGroups: RulesetGroup[];
  routing: Routing[];
}

const defaultConfig = (): ClashConfig => ({ nodeGroups: [{ name: "default", nodes: [] }], rulesetGroups: [], routing: [] });

const props = defineProps<{ modelValue: ClashConfig }>();
const emit = defineEmits<{ "update:modelValue": [value: ClashConfig] }>();

const config = reactive<ClashConfig>(defaultConfig());

let initialized = false;
let skipWatch = false;
watch(
  () => props.modelValue,
  (v) => {
    skipWatch = true;
    const src = v ?? defaultConfig();
    config.nodeGroups = src.nodeGroups?.length ? src.nodeGroups : defaultConfig().nodeGroups;
    config.rulesetGroups = src.rulesetGroups ?? [];
    config.routing = src.routing ?? [];
    if (v) initialized = true;
    skipWatch = false;
  },
  { immediate: true },
);

const throttledEmit = useThrottleFn(() => {
  emit("update:modelValue", structuredClone(toRaw(config)));
}, 700);
watch(config, () => { if (!skipWatch && initialized) throttledEmit(); }, { deep: true });

const groupItems = computed(() => config.nodeGroups.filter(g => !!g.name).map((g) => ({
  id: g.name,
  searchText: g.name,
  title: g.name,
})));
</script>

<template>
  <div class="flex flex-col gap-4 rounded border border-input p-3 text-sm">
    <!-- 规则组 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">规则组</span>
        <Button variant="ghost" size="icon" class="h-6 w-6" @click="config.rulesetGroups.push({ target: '', rulesets: [] })"><Plus class="size-3.5" /></Button>
      </div>
      <div v-for="(g, i) in config.rulesetGroups" :key="i" class="flex items-center gap-2 mb-2">
        <InlineEditText v-model="g.target" placeholder="target">
          <template #edit>
            <TargetSelect v-model="g.target" />
          </template>
        </InlineEditText>
        <ArrowRight class="size-3.5 shrink-0 text-muted-foreground" />
        <RulesetMultiSelect v-model="g.rulesets" />
        <Button variant="ghost" size="icon" class="h-6 w-6 shrink-0 text-destructive" @click="config.rulesetGroups.splice(i, 1)">
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>

    <!-- 节点组 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">节点组</span>
        <Button variant="ghost" size="icon" class="h-6 w-6" @click="config.nodeGroups.push({ name: '', nodes: [] })"><Plus class="size-3.5" /></Button>
      </div>
      <div v-for="(g, i) in config.nodeGroups" :key="i" class="flex items-center gap-2 mb-2">
        <InlineEditText v-model="g.name" placeholder="组名" />
        <ArrowRight class="size-3.5 shrink-0 text-muted-foreground" />
        <NodeMultiSelect v-model="g.nodes" />
        <Button variant="ghost" size="icon" class="h-6 w-6 shrink-0 text-destructive" @click="config.nodeGroups.splice(i, 1)">
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>

    <!-- 路由策略 -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">路由策略</span>
        <Button variant="ghost" size="icon" class="h-6 w-6" @click="config.routing.push({ target: '', nodeGroups: [], nodes: [] })"><Plus class="size-3.5" /></Button>
      </div>
      <div v-for="(r, i) in config.routing" :key="i" class="flex items-start gap-2 mb-2">
        <InlineEditText v-model="r.target" placeholder="target">
          <template #edit>
            <TargetSelect v-model="r.target" />
          </template>
        </InlineEditText>
        <ArrowRight class="size-3.5 shrink-0 text-muted-foreground mt-1.5" />
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <EntitySelect
            v-model="r.nodeGroups"
            :items="groupItems"
            :transform-fn="(i) => i"
            placeholder="选择节点组"
          />
          <NodeMultiSelect v-model="r.nodes" />
        </div>
        <Button variant="ghost" size="icon" class="h-6 w-6 shrink-0 text-destructive" @click="config.routing.splice(i, 1)">
          <Trash2 class="size-3.5" />
        </Button>
      </div>
    </section>
  </div>
</template>
