<script setup lang="ts">
import { ref, watch } from "vue";
import { useAsyncState } from "@vueuse/core";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import CopyTag from "@/components/DataView/CopyTag.vue";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { DataView, DataItem, CopyBtn, VSeparator, MultiLine, DateFormatter as DateView } from "@/components/DataView";
import { Edit } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import Route from "@/components/DataView/Route.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { apiFetch } from "@/utils/api";
import type { SubscriptionCacheStatus } from "@server/core/subscriptions/raw-content";
import SubscriptionEditor from "./SubscriptionEditor.vue";
import SubscriptionContentViewer from "./SubscriptionContentViewer.vue";

const id = useRouteParams<string>("id");
const { useOne, useRemoval } = useSubscriptionStore();
const { update } = useFormModel(SubscriptionEditor);
const subscription = useOne(id);
const removal = useRemoval(id);

const showContent = ref(false);

const {
  state: cacheStatus,
  isLoading: cacheStatusLoading,
  error: cacheStatusError,
  execute: reloadCacheStatus,
} = useAsyncState<SubscriptionCacheStatus | null>(
  () => apiFetch<SubscriptionCacheStatus>(`/subscriptions/${encodeURIComponent(id.value)}/raw/status`),
  null,
  { throwError: false, immediate: false },
);
watch(id, (v) => v && reloadCacheStatus(), { immediate: true });

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
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
              <DateView :value="subscription.item.createdAt" format="datetime" />
            </DataItem>
            <DataItem label="更新时间">
              <DateView :value="subscription.item.updatedAt" format="datetime" />
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

      <Card>
        <CardHeader>
          <CardTitle class="text-base">订阅内容</CardTitle>
          <CardAction>
            <Button variant="secondary" @click="showContent = !showContent">
              {{ showContent ? "收起内容" : "查看内容" }}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
          <p v-if="cacheStatusLoading" class="text-sm text-zinc-400">加载缓存信息...</p>
          <p v-else-if="cacheStatusError" class="text-destructive text-sm">
            {{ (cacheStatusError as Error).message }}
          </p>
          <div v-else-if="cacheStatus" class="text-sm text-zinc-300 flex items-center gap-2 flex-wrap">
            <span class="text-zinc-400">来源</span>
            <span class="truncate max-w-[24rem]">{{ cacheStatus.sourceUrl }}</span>
            <VSeparator />
            <span class="text-zinc-400">大小</span>
            <span>{{ formatSize(cacheStatus.size) }}</span>
            <VSeparator />
            <span class="text-zinc-400">缓存于</span>
            <DateView :value="cacheStatus.cachedAt" format="distance" />
            <VSeparator />
            <span class="text-zinc-400">过期于</span>
            <DateView :value="cacheStatus.expiresAt" format="distance" />
          </div>
          <SubscriptionContentViewer v-if="showContent" :id="subscription.item.id" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
