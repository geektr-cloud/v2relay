<script setup lang="ts">
import { ref } from "vue";
import { useClipboard } from "@vueuse/core";
import { useConfirmPopover } from "@/components/Actions";
import { QrBtn } from "@/components/DataView";
import Route from "@/components/DataView/Route.vue";
import { useAppConfigStore } from "@/stores/app-configs";
import AppConfigEditor from "./AppConfigEditor.vue";
import Button from "@/components/ui/button/Button.vue";
import { Check, Copy, File, SquarePen, Trash2 } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";

type Row = { id: string; name: string; type: string; overrideName: string; apiToken: string };

const { useAll, useRemoval } = useAppConfigStore();
const [items] = useAll();

const { update } = useFormModel(AppConfigEditor);
const removal = useConfirmPopover({
  message: "确定删除此配置？不可恢复。",
  useRemoval,
});

const CLASH_UPDATE_INTERVAL_MIN = 24 * 60;
const subUrl = (token: string) => (token ? `${window.location.origin}/sub/${token}` : "");
const importUrl = (row: Row) => {
  const url = subUrl(row.apiToken);
  if (!url || row.type !== "clash") return "";
  const name = row.overrideName || row.name;
  const q = new URLSearchParams({ url, name, "update-interval": String(CLASH_UPDATE_INTERVAL_MIN) });
  return `clash://install-config?${q.toString()}`;
};

const { copy } = useClipboard();
const copiedKey = ref<string | null>(null);
const copyValue = (key: string, value: string) => {
  if (!value) return;
  copy(value);
  copiedKey.value = key;
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null;
  }, 1500);
};
</script>

<template>
  <div v-if="items.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ items.length }} 个配置</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>类型</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
          <TableHead class="w-[100px]">订阅</TableHead>
          <TableHead class="w-[100px]">导入</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'app-config-detail', params: { idOrName: row.id } }">
              {{ row.name }}
            </Route>
          </TableCell>
          <TableCell>{{ row.type || "—" }}</TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'app-config-detail', params: { idOrName: row.id } }">
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
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              :disabled="!row.apiToken"
              :title="row.apiToken ? '复制订阅链接' : '需先在详情页轮换生成 API Token'"
              @click="copyValue(`sub-${row.id}`, subUrl(row.apiToken))"
            >
              <Check v-if="copiedKey === `sub-${row.id}`" />
              <Copy v-else />
            </Button>
            <QrBtn :value="subUrl(row.apiToken)" title="订阅链接二维码" />
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              :disabled="!importUrl(row)"
              :title="importUrl(row) ? '复制导入链接 (clash://)' : 'clash 类型且已轮换 API Token 后可用'"
              @click="copyValue(`import-${row.id}`, importUrl(row))"
            >
              <Check v-if="copiedKey === `import-${row.id}`" />
              <Copy v-else />
            </Button>
            <QrBtn :value="importUrl(row)" title="导入链接二维码" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
