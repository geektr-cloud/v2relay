<script setup lang="ts">
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { useAppConfigStore } from "@/stores/app-configs";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, MultiLine, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppConfigEditor from "./AppConfigEditor.vue";

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useAppConfigStore();
const { update } = useFormModel(AppConfigEditor);
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
            <RemovalButton :ctx="removal" confirm="确定删除此配置？不可恢复。" />
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
            <DataItem label="类型">{{ item.type || "—" }}</DataItem>
            <DataItem label="模板">
              <MultiLine :value="item.template" />
            </DataItem>
            <DataItem label="配置">
              <CopyTag :value="JSON.stringify(item.config, null, 2)" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
