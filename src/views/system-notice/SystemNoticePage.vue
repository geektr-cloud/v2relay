<script setup lang="ts">
import { computed, ref } from "vue";
import { FileX, Inbox, RotateCcw, Trash2, Check, X } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import Spinner from "@/components/ui/spinner/Spinner.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PopoverClose } from "reka-ui";
import { useSystemNoticeStore } from "@/stores/system-notices";
import SystemNoticeList from "./SystemNoticeList.vue";

const { useAll, useRemoveAll } = useSystemNoticeStore();
const [items, status, refresh] = useAll();
const [rmAllStatus, removeAll] = useRemoveAll();

const errorMessage = computed(() =>
  status.error instanceof Error ? status.error.message : String(status.error ?? ""),
);

const isRmAllOpen = ref(false);
const doRemoveAll = () =>
  removeAll()
    .then(() => {
      isRmAllOpen.value = false;
    })
    .catch(() => {});
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">系统通知</h1>
        <p class="mt-1 text-sm text-zinc-500">查看由服务端写入的系统通知；可逐条或全部删除。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="secondary" :disabled="status.loading" @click="void refresh()">
          <Spinner v-if="status.loading" />
          <RotateCcw v-else />
        </Button>
        <Popover v-if="items.length > 0" v-model:open="isRmAllOpen">
          <PopoverTrigger as-child>
            <Button variant="destructive" :disabled="rmAllStatus.loading">
              <Spinner v-if="rmAllStatus.loading" />
              <Trash2 v-else />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" class="w-auto">
            <div class="flex items-center gap-2">
              <span class="text-sm">确定清空所有通知？</span>
              <Button variant="secondary" size="icon" :disabled="rmAllStatus.loading" @click="void doRemoveAll()">
                <Check v-if="!rmAllStatus.loading" />
                <Spinner v-else />
              </Button>
              <PopoverClose as-child>
                <Button variant="ghost" size="icon" v-show="!rmAllStatus.loading">
                  <X />
                </Button>
              </PopoverClose>
            </div>
            <p v-if="rmAllStatus.error" class="mt-1 text-sm text-red-500">{{ rmAllStatus.error }}</p>
          </PopoverContent>
        </Popover>
      </div>
    </header>

    <Table v-if="status.loading">
      <TableHeader>
        <TableRow>
          <TableHead v-for="i in 3" :key="i">
            <Skeleton class="h-4 w-24" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="i in 4" :key="i">
          <TableCell v-for="j in 3" :key="j">
            <Skeleton class="h-4 w-36" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <Empty v-else-if="status.error" class="py-24 text-ring">
      <EmptyHeader>
        <EmptyMedia>
          <FileX class="size-10" />
        </EmptyMedia>
        <EmptyTitle>获取失败</EmptyTitle>
        <EmptyDescription v-show="errorMessage">
          <p class="text-sm text-red-500/90">{{ errorMessage }}</p>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="secondary" @click="void refresh()"><RotateCcw />重试</Button>
      </EmptyContent>
    </Empty>

    <Empty v-else-if="items.length === 0" class="py-24 text-ring">
      <EmptyHeader>
        <EmptyMedia>
          <Inbox class="size-10" />
        </EmptyMedia>
        <EmptyTitle>暂无通知</EmptyTitle>
      </EmptyHeader>
    </Empty>

    <SystemNoticeList v-else />
  </main>
</template>
