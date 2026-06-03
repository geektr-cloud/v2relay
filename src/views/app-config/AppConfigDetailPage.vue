<script setup lang="ts">
import { useRouteParams } from "@vueuse/router";
import { Edit } from "lucide-vue-next";
import { VueMonacoEditor } from "@guolao/vue-monaco-editor";
import { useAppConfigStore } from "@/stores/app-configs";
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, VSeparator } from "@/components/DataView";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Button from "@/components/ui/button/Button.vue";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppConfigEditor from "./AppConfigEditor.vue";
import ClashConfig from "./ClashConfig.vue";

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
            <DataItem label="类型">{{ item.type || "—" }}</DataItem>
            <DataItem label="模板">
              <VueMonacoEditor
                :value="item.template"
                :language="item.type === 'clash' ? 'yaml' : 'plaintext'"
                theme="vs-dark"
                :options="readonlyOptions"
                height="320px"
              />
            </DataItem>
            <DataItem label="配置">
              <ClashConfig v-if="item.type === 'clash'" :model-value="item.config" :editable="false" />
              <CopyTag v-else :value="JSON.stringify(item.config, null, 2)" />
            </DataItem>
          </DataView>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
