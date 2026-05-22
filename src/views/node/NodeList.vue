<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import Route from "@/components/DataView/Route.vue";
import { useNodeStore } from "@/stores/nodes";
import NodeEditor from "./NodeEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { useConfirmPopover } from "@/components/Actions";
import { Copy, File, SquarePen, Trash2 } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";
import { Badge } from "@/components/ui/badge";

const { useAll, useRemoval } = useNodeStore();
const [items] = useAll();
const { update } = useFormModel(NodeEditor);
const { copy } = useClipboard();

const removal = useConfirmPopover({
  message: "确定删除该节点？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 个节点</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>协议</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>倍率</TableHead>
          <TableHead>订阅</TableHead>
          <TableHead>连接信息</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'node-detail', params: { id: row.id } }">
              {{ row.name || "—" }}
            </Route>
          </TableCell>
          <TableCell>
            <Badge v-if="row.protocol" variant="secondary">{{ row.protocol }}</Badge>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="font-mono text-xs">{{ row.ip || "—" }}</TableCell>
          <TableCell>
            <Badge variant="outline">x{{ row.priceRate }}</Badge>
          </TableCell>
          <TableCell>
            <Route :to="{ name: 'subscription-detail', params: { id: row.subscriptionId } }">
              {{ row.subscription.name }}
            </Route>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="sm" class="gap-1.5" @click="copy(JSON.stringify(row.connInfo, null, 2))">
              <Copy class="size-3.5" />
              复制连接信息
            </Button>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'node-detail', params: { id: row.id } }">
                <File />
              </RouterLink>
            </Button>
            <Button variant="ghost" size="icon" @click="update(row.id)">
              <SquarePen />
            </Button>
            <Button
variant="ghost" class="text-destructive hover:text-destructive" size="icon"
              @click="(e: MouseEvent) => removal.open(e, row.id)">
              <Trash2 />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
