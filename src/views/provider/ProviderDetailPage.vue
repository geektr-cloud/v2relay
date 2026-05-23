<script setup lang="ts">
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, VSeparator } from "@/components/DataView";
import { useRouteParams } from "@vueuse/router";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProviderStore } from "@/stores/providers";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import Link from "@/components/DataView/Link.vue";
import SubscriptionList from "../subscription/SubscriptionList.vue";
import ProviderEditor from "./ProviderEditor.vue";

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useProviderStore();
const { update } = useFormModel(ProviderEditor);

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
            <RemovalButton :ctx="removal" confirm="确定删除此提供商？不可恢复。" />
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
            <DataItem label="地址">
              <Link :href="item.url" variant="raw" />
            </DataItem>
            <DataItem label="同步标签">{{ item.syncTags ? "开启" : "关闭" }}</DataItem>
          </DataView>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅条目</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionList :filter="(s) => s.providerId === item!.id" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
