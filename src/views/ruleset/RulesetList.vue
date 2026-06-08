<script setup lang="ts">
import { useConfirmPopover } from "@/components/Actions";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Route from "@/components/DataView/Route.vue";
import { useRulesetStore } from "@/stores/rulesets";
import RulesetEditor from "./RulesetEditor.vue";
import { DateFormatter as Date } from "@/components/DataView";
import Button from "@/components/ui/button/Button.vue";
import { File, SquarePen, Trash2 } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";

const { useAll, useRemoval } = useRulesetStore();
const [items] = useAll();

const { update } = useFormModel(RulesetEditor);
const removal = useConfirmPopover({
  message: "确定删除此规则集？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 个规则集</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>描述</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>更新于</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'ruleset-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>
            <span v-if="row.description" class="text-muted-foreground">{{ row.description }}</span>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell>
            <div class="max-w-[40ch]">
              <CopyTag :value="row.url" />
            </div>
          </TableCell>
          <TableCell>
            <Date :value="row.updatedAt" />
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'ruleset-detail', params: { idOrName: row.id } }">
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
