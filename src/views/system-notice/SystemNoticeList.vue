<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirmPopover } from "@/components/Actions";
import { DateFormatter as DateView } from "@/components/DataView";
import { useSystemNoticeStore } from "@/stores/system-notices";

const { useAll, useRemoval } = useSystemNoticeStore();
const [items] = useAll();

const removal = useConfirmPopover({
  message: "确定删除该通知？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 条通知</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead class="w-[180px]">创建时间</TableHead>
          <TableHead>内容</TableHead>
          <TableHead class="w-[80px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id" class="align-top">
          <TableCell class="text-muted-foreground tabular-nums">
            <DateView :value="row.createdAt" format="datetime" />
          </TableCell>
          <TableCell>
            <pre class="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground">{{
              row.message || "—"
            }}</pre>
          </TableCell>
          <TableCell>
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
