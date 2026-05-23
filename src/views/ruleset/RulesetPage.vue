<script setup lang="ts">
import { useRulesetStore } from "@/stores/rulesets";
import RulesetList from "./RulesetList.vue";
import RulesetEditor from "./RulesetEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";

const { useAll } = useRulesetStore();
const { create } = useFormModel(RulesetEditor);

const [items, status, refresh] = useAll();
</script>

<template>
  <PageEntry
    title="规则集"
    description="管理代理规则集，每条规则集对应一个远程规则文件。"
    :loading="status.loading"
    :error="status.error"
    :items="items"
    @retry="void refresh()"
    @create="create()"
  >
    <RulesetList />
  </PageEntry>
</template>
