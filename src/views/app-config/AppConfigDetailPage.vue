<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouteParams } from "@vueuse/router";
import { useClipboard } from "@vueuse/core";
import { Check, Copy, Edit, RefreshCw } from "lucide-vue-next";
import { VueMonacoEditor } from "@guolao/vue-monaco-editor";
import { useAppConfigStore } from "@/stores/app-configs";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, QrBtn, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client, rpc } from "@/utils/api";
import AppConfigEditor from "./AppConfigEditor.vue";
import NodeFilter from "@/views/node/NodeFilter.vue";
import RoutesConfig from "./RoutesConfig.vue";

const readonlyOptions = {
  readOnly: true,
  domReadOnly: true,
  fontSize: 12,
  lineNumbers: "off" as const,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  folding: false,
  glyphMargin: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlight: "none" as const,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  contextmenu: false,
  links: false,
  occurrencesHighlight: "off" as const,
  selectionHighlight: false,
  renderWhitespace: "none" as const,
  guides: { indentation: false, bracketPairs: false },
  bracketPairColorization: { enabled: false },
  stickyScroll: { enabled: false },
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  codeLens: false,
  matchBrackets: "never" as const,
  cursorStyle: "line-thin" as const,
  wordWrap: "on" as const,
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6, useShadows: false },
};

const id = useRouteParams<string>("idOrName");
const { useItem, useRemoval } = useAppConfigStore();
const { update } = useFormModel(AppConfigEditor);
const [item, status, reload] = useItem(id);
const removal = useRemoval(id);

const subUrl = computed(() => (item.value?.apiToken ? `${location.origin}/sub/${item.value.apiToken}` : ""));
const CLASH_UPDATE_INTERVAL_MIN = 24 * 60;

/** clash:// install URL for one-tap import on clients that support the URL scheme. */
const importUrl = computed(() => {
  if (!subUrl.value || !item.value) return "";
  if (item.value.type !== "clash") return "";
  const name = item.value.overrideName || item.value.name;
  const q = new URLSearchParams({
    url: subUrl.value,
    name,
    "update-interval": String(CLASH_UPDATE_INTERVAL_MIN),
  });
  return `clash://install-config?${q.toString()}`;
});
const language = computed(() =>
  item.value?.type === "clash" ? "yaml" : item.value?.type === "v2ray" ? "json" : "plaintext",
);
const usesRoutesPicker = computed(() => item.value?.type === "clash");

const rotate = async () => {
  if (!item.value) return;
  if (!confirm("轮换后旧订阅链接立即失效，确认轮换？")) return;
  await rpc(client.api["app-configs"][":id"]["rotate-api-token"].$post({ param: { id: item.value.id } }));
  await reload();
};

const rendered = ref<string>("");
const renderedError = ref<string>("");
const renderedLoading = ref(false);
const renderedVisible = ref(false);

const fetchRendered = async () => {
  if (!item.value) return;
  renderedLoading.value = true;
  renderedError.value = "";
  try {
    const res = await fetch(`/api/app-configs/${item.value.id}/sub`);
    if (!res.ok) {
      const text = await res.text();
      renderedError.value = `HTTP ${res.status}: ${text}`;
      return;
    }
    rendered.value = await res.text();
  } catch (e) {
    renderedError.value = e instanceof Error ? e.message : "请求失败";
  } finally {
    renderedLoading.value = false;
  }
};

const toggleRendered = async () => {
  if (renderedVisible.value) {
    renderedVisible.value = false;
    return;
  }
  renderedVisible.value = true;
  if (!rendered.value && !renderedError.value) await fetchRendered();
};

watch(
  () => item.value?.id,
  () => {
    rendered.value = "";
    renderedError.value = "";
    renderedVisible.value = false;
  },
);

const { copy, copied } = useClipboard();
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
            <DataItem v-if="item.overrideName" label="展示名称">{{ item.overrideName }}</DataItem>
            <DataItem label="类型">{{ item.type || "—" }}</DataItem>
            <DataItem label="API Token">
              <template v-if="item.apiToken">
                <CopyTag :value="item.apiToken" />
              </template>
              <span v-else class="text-muted-foreground text-xs">未生成，点击轮换</span>
              <VSeparator />
              <Button variant="ghost" size="icon" class="size-3.5 cursor-pointer" title="轮换 API Token" @click="rotate">
                <RefreshCw class="size-3.5 shrink-0" />
              </Button>
            </DataItem>
            <DataItem label="订阅链接">
              <CopyTag v-if="subUrl" :value="subUrl" />
              <span v-else class="text-muted-foreground text-xs">需先轮换生成 API Token</span>
              <template v-if="subUrl">
                <VSeparator />
                <QrBtn :value="subUrl" small />
              </template>
            </DataItem>
            <DataItem v-if="importUrl" label="导入订阅链接">
              <div class="max-w-[40ch]">
                <CopyTag :value="importUrl" />
              </div>
              <VSeparator />
              <QrBtn :value="importUrl" small />
            </DataItem>
            <DataItem label="节点筛选">
              <NodeFilter :model-value="item.nodeFilter" :editable="false" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">模板</CardTitle>
        </CardHeader>
        <CardContent>
          <VueMonacoEditor
            :value="item.template"
            :language="language"
            theme="vs-dark"
            :options="readonlyOptions"
            height="320px"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">配置</CardTitle>
        </CardHeader>
        <CardContent>
          <RoutesConfig v-if="usesRoutesPicker" :model-value="item.config" :editable="false" />
          <CopyTag v-else :value="JSON.stringify(item.config, null, 2)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">渲染结果</CardTitle>
          <CardAction>
            <template v-if="renderedVisible">
              <Button variant="ghost" size="sm" :disabled="!rendered" @click="copy(rendered)">
                <Check v-if="copied" class="size-3.5" />
                <Copy v-else class="size-3.5" />
                复制
              </Button>
              <Button variant="ghost" size="sm" :disabled="renderedLoading" @click="fetchRendered">
                <RefreshCw class="size-3.5" />
                {{ renderedLoading ? "加载中" : "刷新" }}
              </Button>
              <Button variant="secondary" size="sm" @click="toggleRendered">隐藏</Button>
            </template>
            <Button v-else variant="secondary" size="sm" @click="toggleRendered">展开</Button>
          </CardAction>
        </CardHeader>
        <CardContent v-if="renderedVisible">
          <p v-if="renderedError" class="text-xs text-destructive">{{ renderedError }}</p>
          <p v-else-if="renderedLoading && !rendered" class="text-xs text-muted-foreground">加载中...</p>
          <VueMonacoEditor
            v-else
            :value="rendered"
            :language="language"
            theme="vs-dark"
            :options="readonlyOptions"
            height="480px"
          />
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
