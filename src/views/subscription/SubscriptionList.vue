<script setup lang="ts">
import { computed } from "vue";
import { useConfirmPopover } from "@/components/Actions";
import CopyTag from "@/components/DataView/CopyTag.vue";
import Route from "@/components/DataView/Route.vue";
import { useSubscriptionStore } from "@/stores/subscriptions";
import { useProviderStore } from "@/stores/providers";
import SubscriptionEditor from "./SubscriptionEditor.vue";
import Badge from "@/components/ui/badge/Badge.vue";
import { DateFormatter as Date, MultiLine } from "@/components/DataView";
import Button from "@/components/ui/button/Button.vue";
import { File, SquarePen, Trash2 } from "lucide-vue-next";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormModel } from "@/components/CMS";
import type { Subscription } from "@server/generated/prisma/dto";

const props = defineProps<{ filter?: (s: Subscription) => boolean }>();

const { useAll, useRemoval } = useSubscriptionStore();
const [items] = useAll();
const filtered = computed(() => (props.filter ? items.value.filter(props.filter) : items.value));

const [providers] = useProviderStore().useAll();
const providerById = computed(() => new Map(providers.value.map((p) => [p.id, p])));

const { update } = useFormModel(SubscriptionEditor);
const removal = useConfirmPopover({
  message: "确定删除此订阅？不可恢复。",
  useRemoval,
});
</script>

<template>
  <div v-if="filtered.length > 0">
    <removal.ConfirmPopover />
    <Table>
      <TableCaption>共 {{ filtered.length }} 个订阅条目</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>备注</TableHead>
          <TableHead>提供商</TableHead>
          <TableHead>订阅链接</TableHead>
          <TableHead>价格</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>更新于</TableHead>
          <TableHead class="w-[120px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in filtered" :key="row.id">
          <TableCell>
            <Route :to="{ name: 'subscription-detail', params: { id: row.id } }">
              {{ row.name || "—" }}
            </Route>
          </TableCell>
          <TableCell>
            <MultiLine :value="row.remark" />
          </TableCell>
          <TableCell>
            <Route :to="{ name: 'provider-detail', params: { idOrName: row.providerId } }">
              {{ providerById.get(row.providerId)?.name || row.providerId }}
            </Route>
          </TableCell>
          <TableCell>
            <div class="flex max-w-[40ch] flex-col gap-1">
              <CopyTag v-for="(url, i) in row.urls" :key="i" :value="url" />
            </div>
          </TableCell>
          <TableCell>
            <span class="tabular-nums">{{ row.price.toFixed(2) }}</span>
            <span class="text-muted-foreground ml-0.5 text-xs">¥/GiB</span>
          </TableCell>
          <TableCell>
            <Badge :variant="row.enabled ? 'secondary' : 'destructive'">
              {{ row.enabled ? "已启用" : "已停用" }}
            </Badge>
          </TableCell>
          <TableCell>
            <Date :value="row.updatedAt" />
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="icon" as-child>
              <RouterLink :to="{ name: 'subscription-detail', params: { id: row.id } }">
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
