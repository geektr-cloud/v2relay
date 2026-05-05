<script setup lang="ts">
import Link from "@/components/DataView/Link.vue";
import Route from "@/components/DataView/Route.vue";
import { useProviderStore } from "@/stores/providers";
import ProviderEditor from "./ProviderEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { useConfirmPopover } from "@/components/Actions";
import { Trash2, File, SquarePen } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS/utils";

const { useAll, useRemoval } = useProviderStore();
const store = useAll();
const { update } = useFormModel(ProviderEditor);

const removal = useConfirmPopover({
  message: "确定删除该提供商？若仍有订阅条目将无法删除。",
  useRemoval,
});
</script>

<template>
  <div v-if="store.items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ store.items.length }} 个提供商</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>地址</TableHead>
          <TableHead class="w-[120px]"> 操作 </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in store.items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'provider-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>
            <Link :href="row.url" class="max-w-[40ch]" />
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'provider-detail', params: { idOrName: row.id } }">
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
