<script setup lang="ts">
import { computed } from "vue";
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { useRouteStore } from "@/stores/routes";
import { useRulesetStore } from "@/stores/rulesets";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, VSeparator } from "@/components/DataView";
import Button from "@/components/ui/button/Button.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteLink from "@/components/DataView/Route.vue";
import NodeFilter from "@/views/node/NodeFilter.vue";
import RouteEditor from "./RouteEditor.vue";
import RoutePreviewCard from "./RoutePreviewCard.vue";

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useRouteStore();
const { update } = useFormModel(RouteEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);

const rulesetStore = useRulesetStore();
const [rulesets] = rulesetStore.useAll();
const rulesetById = computed(() => new Map(rulesets.value.map((r) => [r.id, r])));

const filterModel = computed({
  get: () => item.value?.filter ?? { type: "none" as const },
  set: () => {},
});
</script>

<template>
  <DetailPage :loading="status.loading" :error="status.error" @retry="reload">
    <template v-if="item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">基本信息</CardTitle>
          <CardAction>
            <Button variant="secondary" @click="update(item!.id)">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此路由？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ item.id }}
              <VSeparator />
              <CopyBtn :value="item.id" />
            </DataItem>
            <DataItem label="名称">{{ item.name }}</DataItem>
            <DataItem label="规则集">
              <div v-if="item.rulesets.length" class="flex flex-wrap gap-1">
                <RouteLink
                  v-for="rid in item.rulesets"
                  :key="rid"
                  :to="{ name: 'ruleset-detail', params: { idOrName: rid } }"
                  class="no-underline"
                >
                  <Badge variant="outline">{{ rulesetById.get(rid)?.name ?? rid }}</Badge>
                </RouteLink>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">节点筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <NodeFilter :model-value="filterModel" :editable="false" @update:model-value="() => {}" />
        </CardContent>
      </Card>

      <RoutePreviewCard :id="item.id" />
    </template>
  </DetailPage>
</template>
