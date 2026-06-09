<script setup lang="ts">
import { ref } from "vue";
import { DownloadCloud } from "lucide-vue-next";
import { useRulesetStore } from "@/stores/rulesets";
import RulesetList from "./RulesetList.vue";
import RulesetEditor from "./RulesetEditor.vue";
import { PageEntry, useFormModel } from "@/components/CMS";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const { useAll, pullAll } = useRulesetStore();
const { create } = useFormModel(RulesetEditor);

const [items, status, refresh] = useAll();

const pulling = ref(false);
const doPullAll = async () => {
  if (pulling.value) return;
  pulling.value = true;
  try {
    await pullAll();
  } finally {
    pulling.value = false;
  }
};
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
    <template #actions>
      <Button variant="secondary" :disabled="pulling" title="拉取并解析全部规则集" @click="doPullAll">
        <Spinner v-if="pulling" />
        <DownloadCloud v-else />
      </Button>
    </template>
    <RulesetList />
  </PageEntry>
</template>
