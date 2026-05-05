<script setup lang="ts">
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import CopyTag from "@/components/DataView/CopyTag.vue";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { DataView, DataItem, CopyBtn, VSeparator, MultiLine, Date } from "@/components/DataView";
import { Edit } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import Route from "@/components/DataView/Route.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import SubscriptionEditor from "./SubscriptionEditor.vue";

const id = useRouteParams<string>("id");
const { useOne, useRemoval } = useSubscriptionStore();
const { update } = useFormModel(SubscriptionEditor);
const subscription = useOne(id);
const removal = useRemoval(id);
</script>

<template>
  <DetailPage :loading="subscription.loading" :error="subscription.error" @retry="subscription.reload">
    <template v-if="subscription.item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">基本信息</CardTitle>
          <CardAction>
            <Button variant="secondary" @click="subscription.item?.id && update(subscription.item.id)">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此订阅？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ subscription.item.id }}
              <VSeparator />
              <CopyBtn :value="subscription.item.id" />
            </DataItem>
            <DataItem label="名称">{{ subscription.item.name }}</DataItem>
            <DataItem label="提供商">
              <Route :to="{ name: 'provider-detail', params: { idOrName: subscription.item.provider.id } }">
                {{ subscription.item.provider.name }}
              </Route>
            </DataItem>
            <DataItem label="状态">
              <Badge :variant="subscription.item.enabled ? 'secondary' : 'destructive'">
                {{ subscription.item.enabled ? "启用" : "停用" }}
              </Badge>
            </DataItem>
            <DataItem label="备注">
              <MultiLine :value="subscription.item.remark" />
            </DataItem>
            <DataItem label="创建时间">
              <Date :value="subscription.item.createdAt" format="datetime" />
            </DataItem>
            <DataItem label="更新时间">
              <Date :value="subscription.item.updatedAt" format="datetime" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅链接</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
          <CopyTag v-for="(url, i) in subscription.item.urls" :key="i" :value="url" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
