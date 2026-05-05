<script setup lang="ts">
import Route from "@/components/DataView/Route.vue";
import { useTagStore } from "@/stores/tags";
import TagEditor from "./TagEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { useConfirmPopover } from "@/components/Actions";
import { Trash2, File, SquarePen } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";
import { Badge } from "@/components/ui/badge";

const { useAll, useRemoval } = useTagStore();
const store = useAll();
const { update } = useFormModel(TagEditor);

const removal = useConfirmPopover({
  message: "确定删除该标签？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="store.items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ store.items.length }} 个标签</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>关键词</TableHead>
          <TableHead class="w-[120px]"> 操作 </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in store.items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'tag-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>
            <div v-if="row.keywords.length" class="flex flex-wrap gap-1">
              <Badge v-for="(kw, i) in row.keywords" :key="i" variant="outline">
                {{ kw }}
              </Badge>
            </div>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'tag-detail', params: { idOrName: row.id } }">
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
