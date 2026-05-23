<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useClipboard, useFileDialog } from "@vueuse/core";
import { Check, Copy, Download, Eye, EyeOff, RefreshCw, Upload } from "lucide-vue-next";
import { client } from "@/utils/api";
import { useAsyncState, useHonoApi } from "@/lib/acrux";
import { DateFormatter as DateView, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import type { SubscriptionCacheStatus } from "@server/core/subscriptions/subscription-manager";
import { sniffContentType } from "@server/utils/sniff-content-type";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const props = defineProps<{ id: string }>();
const showContent = ref(false);

// ── cache status ──────────────────────────────────────────────────────────────

const getCacheStatus = useHonoApi<SubscriptionCacheStatus, SubscriptionCacheStatus, [string]>((subId: string) =>
  client.api.subscriptions[":id"].status.$get({ param: { id: subId } }),
);
const [cacheStatus, cacheStatusStatus, reloadCacheStatus] = useAsyncState<SubscriptionCacheStatus | null>(
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

// ── subscription content (lazy) ───────────────────────────────────────────────

const forceReload = ref(false);

const fetchContent = async () => {
  const res = await fetch(
    `/api/subscriptions/${encodeURIComponent(props.id)}/content?force_reload=${forceReload.value}`,
  );
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
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  return { text, contentType };
};

const [state, status, reload] = useAsyncState(fetchContent, null, { throwError: false });

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

// ── manual upload ─────────────────────────────────────────────────────────────

const MAX_BYTES = 5 * 1024 * 1024;

const extFromContentType = (ct: string): string => {
  const lower = ct.toLowerCase();
  if (lower.includes("json")) return "json";
  if (lower.includes("yaml") || lower.includes("yml")) return "yaml";
  return "txt";
};

const uploadStatus = ref<{ loading: boolean; error: unknown }>({ loading: false, error: null });

const { open: openFileDialog, onChange: onFilesChange } = useFileDialog({
  multiple: false,
  reset: true,
});

onFilesChange(async (files) => {
  const file = files?.[0];
  if (!file) return;

  if (file.size === 0) {
    uploadStatus.value = { loading: false, error: new Error("文件为空") };
    return;
  }
  if (file.size > MAX_BYTES) {
    uploadStatus.value = { loading: false, error: new Error(`文件超过 ${MAX_BYTES / 1024 / 1024} MiB 限制`) };
    return;
  }

  uploadStatus.value = { loading: true, error: null };
  try {
    const { type, content } = await sniffContentType(file, file.name);
    const res = await fetch(`/api/subscriptions/${encodeURIComponent(props.id)}/content`, {
      method: "PUT",
      headers: { "content-type": type },
      body: content,
    });
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
    cacheStatus.value = (await res.json()) as SubscriptionCacheStatus;
    if (showContent.value) await reload();
  } catch (e) {
    uploadStatus.value = { loading: false, error: e };
    return;
  }
  uploadStatus.value = { loading: false, error: null };
});

const display = computed(() => {
  if (!state.value) return "";
  const { text, contentType } = state.value;
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  return text;
});

const isNodelist = computed(() => state.value?.contentType.toLowerCase().includes("nodelist") ?? false);

const nodelistLines = computed(() =>
  isNodelist.value && state.value
    ? state.value.text
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [],
);

// ── copy / download (only meaningful once content is loaded) ──────────────────

const hasContent = computed(() => showContent.value && !!state.value);

const { copy, copied } = useClipboard({ source: display });

const doDownload = async () => {
  if (!state.value) return;
  const { type } = await sniffContentType(display.value);
  const ext = extFromContentType(type);
  const blob = new Blob([display.value], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subscription-${props.id}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">订阅内容</CardTitle>
      <CardAction class="flex items-center gap-2">
        <template v-if="hasContent">
          <Button variant="secondary" size="icon" title="复制" @click="copy(display)">
            <Check v-if="copied" />
            <Copy v-else />
          </Button>
          <Button variant="secondary" size="icon" title="下载" @click="doDownload">
            <Download />
          </Button>
          <VSeparator class="h-5" />
        </template>
        <Button variant="secondary" size="icon" :disabled="status.loading" title="强制刷新" @click="doForceReload">
          <RefreshCw :class="status.loading ? 'animate-spin' : ''" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          :disabled="uploadStatus.loading"
          title="上传订阅"
          @click="openFileDialog()"
        >
          <Upload />
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

      <p v-if="uploadStatus.error" class="text-destructive text-sm">
        上传失败：{{ (uploadStatus.error as Error).message }}
      </p>

      <template v-if="showContent">
        <p v-if="status.loading" class="text-sm text-zinc-400">加载中...</p>
        <p v-else-if="status.error" class="text-destructive text-sm">{{ (status.error as Error).message }}</p>
        <div v-else-if="isNodelist" class="flex flex-col gap-2 max-h-[60vh] overflow-auto">
          <CopyTag v-for="(line, i) in nodelistLines" :key="i" :value="line" />
        </div>
        <pre
          v-else
          class="bg-zinc-900 rounded p-3 overflow-auto max-h-[60vh] text-xs leading-relaxed"
        ><code class="font-mono whitespace-pre">{{ display }}</code></pre>
      </template>
    </CardContent>
  </Card>
</template>
