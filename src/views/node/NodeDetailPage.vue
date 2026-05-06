<script setup lang="ts">
import { DetailPage, RemovalButton, useFormModel } from "@/components/CMS";
import { DataView, DataItem, CopyBtn, VSeparator } from "@/components/DataView";
import { useRouteParams } from "@vueuse/router";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { useNodeStore } from "@/stores/nodes";
import { Edit } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Route from "@/components/DataView/Route.vue";
import NodeEditor from "./NodeEditor.vue";

const id = useRouteParams<string>("id");
const { useOne, useRemoval } = useNodeStore();
const { update } = useFormModel(NodeEditor);

const node = useOne(id);
const removal = useRemoval(id);
</script>

<template>
  <DetailPage :loading="node.loading" :error="node.error" @retry="node.reload">
    <template v-if="node.item">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">节点信息</CardTitle>
          <CardAction>
            <Button variant="secondary" @click="update(node.item!.id)">
              <Edit />
            </Button>
            <RemovalButton :ctx="removal" confirm="确定删除此节点？不可恢复。" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataView>
            <DataItem label="ID">
              {{ node.item.id }}
              <VSeparator />
              <CopyBtn :value="node.item.id" />
            </DataItem>
            <DataItem label="名称">{{ node.item.name || "—" }}</DataItem>
            <DataItem label="协议">
              <Badge v-if="node.item.protocol" variant="secondary">{{ node.item.protocol }}</Badge>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
            <DataItem label="IP">
              <span class="font-mono text-xs">{{ node.item.ip || "—" }}</span>
            </DataItem>
            <DataItem label="倍率">
              <Badge variant="outline">x{{ node.item.priceRate }}</Badge>
            </DataItem>
            <DataItem label="标签">
              <div v-if="node.item.tags.length" class="flex flex-wrap gap-1">
                <Badge v-for="(tag, i) in node.item.tags" :key="i" variant="outline">{{ tag }}</Badge>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </DataItem>
            <DataItem label="备注">{{ node.item.remark || "—" }}</DataItem>
            <DataItem label="所属订阅">
              <Route :to="{ name: 'subscription-detail', params: { id: node.item.subscription.id } }">
                {{ node.item.subscription.name || node.item.subscription.provider.name }}
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
            JSON.stringify(node.item.connInfo, null, 2)
          }}</pre>
        </CardContent>
      </Card>
    </template>
  </DetailPage>
</template>
