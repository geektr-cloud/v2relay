<script setup lang="ts">
import { useConfirmPopover } from "@/components/Actions";
import Route from "@/components/DataView/Route.vue";
import { useRouteStore } from "@/stores/routes";
import RouteEditor from "./RouteEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { File, SquarePen, Trash2 } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";

const { useAll, useRemoval } = useRouteStore();
const [items] = useAll();

const { update } = useFormModel(RouteEditor);
const removal = useConfirmPopover({
  message: "确定删除此路由？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 条路由</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>规则集数</TableHead>
          <TableHead>筛选类型</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'route-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{{ row.rulesets.length }}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{{ row.filter.type }}</Badge>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'route-detail', params: { idOrName: row.id } }">
                <File />
              </RouterLink>
            </Button>
            <Button variant="ghost" size="icon" @click="update(row.id)">
              <SquarePen />
            </Button>
            <Button
              variant="ghost"
              class="text-destructive hover:text-destructive"
              size="icon"
              @click="(e: MouseEvent) => removal.open(e, row.id)"
            >
              <Trash2 />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
