<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouteParams } from "@vueuse/router";
import { Edit, RefreshCw } from "lucide-vue-next";
import { useStaticFileStore } from "@/stores/static-files";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, DateFormatter as DateView, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client, rpc } from "@/utils/api";
import StaticFileEditor from "./StaticFileEditor.vue";

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useStaticFileStore();
const { update } = useFormModel(StaticFileEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);

type CacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
  sha256: string;
};

const cache = ref<CacheStatus | null>(null);
const cacheError = ref<string>("");
const cacheLoading = ref(false);

const publicUrl = computed(() => (item.value?.name ? `${location.origin}/files/${item.value.name}` : ""));
const sha256Url = computed(() => (publicUrl.value ? `${publicUrl.value}/sha256` : ""));

const loadStatus = async (force = false) => {
  if (!item.value?.id) return;
  cacheLoading.value = true;
  cacheError.value = "";
  try {
    const data = await rpc<CacheStatus>(
      client.api["static-files"][":id"].status.$get({ param: { id: item.value.id } }),
    );
    cache.value = data;
    if (force) {
      await rpc(
        client.api["static-files"][":id"].content.$get({
          param: { id: item.value.id },
          query: { force_reload: "true" },
        }),
      );
      const fresh = await rpc<CacheStatus>(
        client.api["static-files"][":id"].status.$get({ param: { id: item.value.id } }),
      );
      cache.value = fresh;
    }
  } catch (e) {
    cacheError.value = e instanceof Error ? e.message : "加载失败";
  } finally {
    cacheLoading.value = false;
  }
};

watch(() => item.value?.id, (v) => v && void loadStatus(), { immediate: true });
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
            <RemovalButton :ctx="removal" confirm="确定删除此静态文件？不可恢复。" />
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
            <DataItem label="过期 (秒)">{{ item.expire }}</DataItem>
            <DataItem label="公开链接">
              <CopyTag :value="publicUrl" />
            </DataItem>
            <DataItem label="SHA256 链接">
              <CopyTag :value="sha256Url" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">缓存状态</CardTitle>
          <CardAction>
            <Button variant="secondary" :disabled="cacheLoading" @click="loadStatus(true)">
              <RefreshCw />
              强制刷新
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p v-if="cacheLoading" class="text-xs text-muted-foreground">加载中...</p>
          <p v-else-if="cacheError" class="text-xs text-destructive">{{ cacheError }}</p>
          <DataView v-else-if="cache">
            <DataItem label="源 URL">
              <CopyTag :value="cache.sourceUrl" />
            </DataItem>
            <DataItem label="大小 (B)">{{ cache.size }}</DataItem>
            <DataItem label="内容类型">{{ cache.contentType }}</DataItem>
            <DataItem label="缓存时间">
              <DateView :value="cache.cachedAt" format="datetime" />
            </DataItem>
            <DataItem label="SHA256">
              <CopyTag :value="cache.sha256" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
