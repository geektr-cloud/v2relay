<script setup lang="ts">
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { useRulesetStore } from "@/stores/rulesets";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, DateFormatter as DateView, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RulesetEditor from "./RulesetEditor.vue";

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useRulesetStore();
const { update } = useFormModel(RulesetEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);
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
            <RemovalButton :ctx="removal" confirm="确定删除此规则集？不可恢复。" />
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
            <DataItem label="URL">
              <CopyTag :value="item.url" />
            </DataItem>
            <DataItem label="创建时间">
              <DateView :value="item.createdAt" format="datetime" />
            </DataItem>
            <DataItem label="更新时间">
              <DateView :value="item.updatedAt" format="datetime" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
