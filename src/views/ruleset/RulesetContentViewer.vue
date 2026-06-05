<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useClipboard } from "@vueuse/core";
import { Check, Copy, Download, Eye, EyeOff, RefreshCw } from "lucide-vue-next";
import { client } from "@/utils/api";
import { useAsyncState, useHonoApi } from "@/lib/acrux";
import { DateFormatter as DateView, VSeparator } from "@/components/DataView";
import type { RulesetCacheStatus } from "@server/core/rulesets/ruleset-manager";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const props = defineProps<{ id: string; inline?: boolean }>();
const showContent = ref(false);

const getCacheStatus = useHonoApi<RulesetCacheStatus, RulesetCacheStatus, [string]>((rulesetId: string) =>
  client.api.rulesets[":id"].status.$get({ param: { id: rulesetId } }),
);
const [cacheStatus, cacheStatusStatus, reloadCacheStatus] = useAsyncState<RulesetCacheStatus | null>(
  () => (props.id ? getCacheStatus(props.id) : Promise.resolve(null)),
  null,
  { throwError: false },
);
watch(
  () => props.id,
  (v) => v && reloadCacheStatus(),
  { immediate: true },
);

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const forceReload = ref(false);

const fetchContent = async () => {
  const res = await fetch(`/api/rulesets/${encodeURIComponent(props.id)}/content?force_reload=${forceReload.value}`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      //
    }
    throw new Error(msg);
  }
  return await res.text();
};

const [content, status, reload] = useAsyncState(fetchContent, null, { throwError: false });

watch(showContent, (v) => v && reload());

const doForceReload = async () => {
  forceReload.value = true;
  try {
    await reload();
  } finally {
    forceReload.value = false;
  }
  await reloadCacheStatus();
};

const display = computed(() => content.value ?? "");
const { copy, copied } = useClipboard({ source: display });

const doDownload = () => {
  if (!content.value) return;
  const blob = new Blob([content.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ruleset-${props.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">规则内容</CardTitle>
      <CardAction class="flex items-center gap-2">
        <template v-if="showContent && content">
          <Button variant="secondary" size="icon" title="复制" @click="copy(display)">
            <Check v-if="copied" />
            <Copy v-else />
          </Button>
          <Button variant="secondary" size="icon" title="下载" @click="doDownload">
            <Download />
          </Button>
          <VSeparator class="h-5" />
        </template>
        <Button
          v-if="!inline"
          variant="secondary"
          size="icon"
          :disabled="status.loading"
          title="强制刷新"
          @click="doForceReload"
        >
          <RefreshCw :class="status.loading ? 'animate-spin' : ''" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          :title="showContent ? '收起内容' : '查看内容'"
          @click="showContent = !showContent"
        >
          <component :is="showContent ? EyeOff : Eye" />
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
      </div>

      <template v-if="showContent">
        <p v-if="status.loading" class="text-sm text-zinc-400">加载中...</p>
        <p v-else-if="status.error" class="text-destructive text-sm">{{ (status.error as Error).message }}</p>
        <pre
          v-else
          class="bg-zinc-900 rounded p-3 overflow-auto max-h-[60vh] text-xs leading-relaxed"
        ><code class="font-mono whitespace-pre">{{ display }}</code></pre>
      </template>
    </CardContent>
  </Card>
</template>
