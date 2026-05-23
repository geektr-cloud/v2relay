import { computed, type Ref } from "vue";
import { defineStore } from "pinia";
import { systemNotice } from "@server/core/system-notices";
import { useAsyncState, useHonoApi, type AsyncState, type BaseId, type Removal } from "@/lib/acrux";
import { client } from "@/utils/api";

/**
 * 系统通知 store —— 只读列表 + 删除。
 *
 * 服务端通过 `createNotices` 写入；前端不暴露 upsert，因此故意不复用
 * `useSortedCollection`（它强制要求 upsertFn / upsertSchema）。
 */
export const useSystemNoticeStore = defineStore("system-notices", () => {
  const fetchAll = useHonoApi(() => client.api["system-notices"].$get());
  const removeOne = useHonoApi((id: string) => client.api["system-notices"][":id"].$delete({ param: { id } }));
  const removeAll = useHonoApi(() => client.api["system-notices"].$delete());

  const [items, status, reload] = useAsyncState<systemNotice.SystemNotice[]>(fetchAll, [], { immediate: true });

  const sorted = computed(() => [...items.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  const _remove = (id: BaseId) => {
    const idx = items.value.findIndex((n) => n.id === id);
    if (idx !== -1) items.value.splice(idx, 1);
    items.value = items.value.slice();
  };

  const useAll = (): AsyncState<systemNotice.SystemNotice[]> => [sorted, status, reload];

  const useItem = (id: Ref<BaseId | undefined>): AsyncState<systemNotice.SystemNotice | undefined> => [
    computed(() => (id.value ? items.value.find((n) => n.id === id.value) : undefined)),
    status,
    reload,
  ];

  const useRemoval = (id: Ref<BaseId | undefined>): Removal<systemNotice.SystemNotice | undefined> => {
    const source = useItem(id);
    const fn = () => (id.value ? removeOne(id.value) : Promise.reject(new Error("id is required")));
    const [, rmStatus, rmExecute] = useAsyncState<systemNotice.SystemNotice | undefined>(fn, undefined, {
      onSuccess: (r) => r && _remove(r.id),
    });
    return [rmStatus, rmExecute, source];
  };

  const useRemoveAll = () => {
    const [, rmAllStatus, rmAllExecute] = useAsyncState<{ count: number } | undefined>(removeAll, undefined, {
      onSuccess: () => {
        items.value = [];
      },
    });
    return [rmAllStatus, rmAllExecute] as const;
  };

  return { useAll, useItem, useRemoval, useRemoveAll };
});
