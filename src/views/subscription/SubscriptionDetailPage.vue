<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { useProviderStore } from "@/stores/providers";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, DateFormatter as DateView, MultiLine, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Route from "@/components/DataView/Route.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionEditor from "./SubscriptionEditor.vue";

const SubscriptionContentViewer = defineAsyncComponent(() => import("./SubscriptionContentViewer.vue"));

const id = useRouteParams<string>("id");
const { useItem, useRemoval } = useSubscriptionStore();
const { update } = useFormModel(SubscriptionEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);

const [providers] = useProviderStore().useAll();
const providerName = computed(
  () => providers.value.find((p) => p.id === item.value?.providerId)?.name ?? item.value?.providerId ?? "—",
);
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
            <RemovalButton :ctx="removal" confirm="确定删除此订阅？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ item.id }}
              <VSeparator />
              <CopyBtn :value="item.id" />
            </DataItem>
            <DataItem label="名称">{{ item.name || "—" }}</DataItem>
            <DataItem label="提供商">
              <Route :to="{ name: 'provider-detail', params: { idOrName: item.providerId } }" variant="raw">
                {{ providerName }}
              </Route>
            </DataItem>
            <DataItem label="状态">
              <Badge :variant="item.enabled ? 'secondary' : 'destructive'">
                {{ item.enabled ? "启用" : "停用" }}
              </Badge>
            </DataItem>
            <DataItem label="价格">
              <span class="tabular-nums">{{ item.price.toFixed(2) }}</span>
              <span class="text-muted-foreground ml-1 text-xs">¥/GiB</span>
            </DataItem>
            <DataItem label="备注">
              <MultiLine :value="item.remark" />
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

      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅链接</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
          <CopyTag v-for="(url, i) in item.urls" :key="i" :value="url" />
        </CardContent>
      </Card>

      <SubscriptionContentViewer :id="item.id" :has-urls="item.urls.length > 0" />
    </template>
  </DetailPage>
</template>
