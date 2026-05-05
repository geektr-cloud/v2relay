<script setup lang="ts">
import { DetailPage, RemovalButton } from "@/components/CMS";
import { DataView, DataItem, CopyBtn, VSeparator } from "@/components/DataView";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { useProviderStore } from "@/stores/providers";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import Link from "@/components/DataView/Link.vue";
import SubscriptionList from "../subscription/SubscriptionList.vue";

const id = useRouteParams<string>("idOrName");
const { useOne, useRemoval } = useProviderStore();

const provider = useOne(id);
const removal = useRemoval(id);
</script>

<template>
  <DetailPage :loading="provider.loading" :error="provider.error" @retry="provider.reload">
    <template v-if="provider.item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base"> 基本信息 </CardTitle>
          <CardAction>
            <Button variant="secondary">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此提供商？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ provider.item.id }}
              <VSeparator />
              <CopyBtn :value="provider.item.id" />
            </DataItem>
            <DataItem label="名称">
              {{ provider.item.name }}
            </DataItem>
            <DataItem label="地址">
              <Link :href="provider.item.url" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅条目</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionList :filter="(s) => s.providerId === provider.item?.id" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
