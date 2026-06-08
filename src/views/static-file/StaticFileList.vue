<script setup lang="ts">
import { useConfirmPopover } from "@/components/Actions";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Route from "@/components/DataView/Route.vue";
import { useStaticFileStore } from "@/stores/static-files";
import StaticFileEditor from "./StaticFileEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { File, SquarePen, Trash2 } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";

const { useAll, useRemoval } = useStaticFileStore();
const [items] = useAll();

const { update } = useFormModel(StaticFileEditor);
const removal = useConfirmPopover({
  message: "确定删除此静态文件？不可恢复。",
  useRemoval,
});

const publicUrl = (name: string) => `${window.location.origin}/files/${name}`;
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 个静态文件</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>过期 (秒)</TableHead>
          <TableHead>公开链接</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'static-file-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>
            <div class="max-w-[40ch]">
              <CopyTag :value="row.url" />
            </div>
          </TableCell>
          <TableCell>{{ row.expire }}</TableCell>
          <TableCell>
            <div class="max-w-[40ch]">
              <CopyTag :value="publicUrl(row.name)" />
            </div>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'static-file-detail', params: { idOrName: row.id } }">
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
