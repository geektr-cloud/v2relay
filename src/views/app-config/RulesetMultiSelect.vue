<script setup lang="ts">
import { useRulesetStore } from "@/stores/rulesets";
import { EntitySelect } from "@/components/DataView";
import { ruleset } from "@server/core/rulesets";

const modelValue = defineModel<string[]>({ default: () => [] });

const { useAll } = useRulesetStore();
const [items, status] = useAll();

const transformFn = (r: ruleset.Ruleset) => ({
  id: r.id,
  searchText: `${r.id} ${r.name} ${r.url}`,
  title: r.name,
  summary: r.url,
});
</script>

<template>
  <EntitySelect
    v-model="modelValue"
    :items="items"
    :status="status"
    :transform-fn="transformFn"
    placeholder="选择规则集"
  />
</template>
