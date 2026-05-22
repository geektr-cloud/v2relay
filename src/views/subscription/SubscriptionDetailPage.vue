<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { client } from "@/utils/api";
import { useAsyncState, useHonoApi } from "@/lib/acrux";
import { useProviderStore } from "@/stores/providers";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, DateFormatter as DateView, MultiLine, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Route from "@/components/DataView/Route.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionCacheStatus } from "@server/core/subscriptions/raw-content";
import SubscriptionContentViewer from "./SubscriptionContentViewer.vue";
import SubscriptionEditor from "./SubscriptionEditor.vue";

const id = useRouteParams<string>("id");
const { useItem, useRemoval } = useSubscriptionStore();
const { update } = useFormModel(SubscriptionEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);

const [providers] = useProviderStore().useAll();
const providerName = computed(
  () => providers.value.find((p) => p.id === item.value?.providerId)?.name ?? item.value?.providerId ?? "—",
);

const showContent = ref(false);

const getCacheStatus = useHonoApi<SubscriptionCacheStatus, SubscriptionCacheStatus, [string]>(
  (subId: string) => client.api.subscriptions[":id"].raw.status.$get({ param: { id: subId } }),
);
const [cacheStatus, cacheStatusStatus, reloadCacheStatus] = useAsyncState<SubscriptionCacheStatus | null>(
  () => (id.value ? getCacheStatus(id.value) : Promise.resolve(null)),
  null,
  { throwError: false },
);
watch(id, (v) => v && reloadCacheStatus(), { immediate: true });

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
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
              <Route :to="{ name: 'provider-detail', params: { idOrName: item.providerId } }">
                {{ providerName }}
              </Route>
            </DataItem>
            <DataItem label="状态">
              <Badge :variant="item.enabled ? 'secondary' : 'destructive'">
                {{ item.enabled ? "启用" : "停用" }}
              </Badge>
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
          <p v-if="cacheStatusStatus.loading" class="text-sm text-zinc-400">加载缓存信息...</p>
          <p v-else-if="cacheStatusStatus.error" class="text-destructive text-sm">
            {{ (cacheStatusStatus.error as Error).message }}
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
          <SubscriptionContentViewer v-if="showContent" :id="item.id" />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
