<script setup lang="ts">
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { CopyBtn, DataItem, DataView, VSeparator } from "@/components/DataView";
import { useRouteParams } from "@vueuse/router";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNodeStore } from "@/stores/nodes";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Route from "@/components/DataView/Route.vue";
import NodeEditor from "./NodeEditor.vue";

const id = useRouteParams<string>("id");
const { useRemoval, useItem } = useNodeStore();
const { update } = useFormModel(NodeEditor);

const [item, status, reload] = useItem(id);

const removal = useRemoval(id);
</script>

<template>
  <DetailPage :loading="status.loading" :error="status.error" @retry="reload">
    <template v-if="item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">节点信息</CardTitle>
          <CardAction>
            <Button variant="secondary" @click="update(item!.id)">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此节点？不可恢复。" />
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
            <DataItem label="协议">
              <Badge v-if="item.protocol" variant="secondary">{{ item.protocol }}</Badge>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
            <DataItem label="IP">
              <span class="font-mono text-xs">{{ item.ip || "—" }}</span>
            </DataItem>
            <DataItem label="倍率">
              <Badge variant="outline">x{{ item.priceRate }}</Badge>
            </DataItem>
            <DataItem label="标签">
              <div v-if="item.tags.length" class="flex flex-wrap gap-1">
                <Badge v-for="(tag, i) in item.tags" :key="i" variant="outline">{{ tag }}</Badge>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
            <DataItem label="备注">{{ item.remark || "—" }}</DataItem>
            <DataItem label="所属订阅">
              <Route :to="{ name: 'subscription-detail', params: { id: item.subscriptionId } }">
                {{ item.subscription.name }}
              </Route>
            </DataItem>
          </DataView>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">连接信息</CardTitle>
        </CardHeader>
        <CardContent>
          <pre class="bg-muted rounded-md p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">{{
            JSON.stringify(item.connInfo, null, 2)
          }}</pre>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
