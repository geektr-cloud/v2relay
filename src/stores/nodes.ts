import { computed, reactive, watchEffect, type Ref } from "vue";
import { defineStore } from "pinia";
import { useAsyncState } from "@vueuse/core";
import { CMS } from "@/components/CMS";
import type { NodeWithSubscription } from "@/types/api";
import { apiFetch } from "@/utils/api";
import { schema } from "@server/core/nodes/schema";

type NodeForm = {
  id: string;
  subscriptionId: string;
  name: string;
  protocol: string;
  remark: string;
  ip: string;
  priceRate: number;
  tags: string[];
  connInfo: Record<string, unknown>;
};

type NodeUpsert = CMS.BaseData & Omit<NodeForm, "id">;

const useNewValue = (): NodeForm => ({
  id: "",
  subscriptionId: "",
  name: "",
  protocol: "",
  remark: "",
  ip: "",
  priceRate: 1,
  tags: [],
  connInfo: {},
});

function mapToForm(row: NodeWithSubscription): NodeForm {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    name: row.name ?? "",
    protocol: row.protocol ?? "",
    remark: row.remark ?? "",
    ip: row.ip ?? "",
    priceRate: row.priceRate ?? 1,
    tags: (row.tags as string[]) ?? [],
    connInfo: (row.connInfo as Record<string, unknown>) ?? {},
  };
}

export const useNodeStore = defineStore("nodes", () => {
  const as = useAsyncState(() => apiFetch<NodeWithSubscription[]>("/nodes"), [], { shallow: false });
  const sorted = computed(() => [...(as.state.value ?? [])].sort((a, b) => a.name.localeCompare(b.name)));

  const localRemove = (id: string) => (as.state.value = as.state.value?.filter((s) => s.id !== id) ?? []);
  const localAddOrUpdate = (data: NodeWithSubscription) => {
    const index = as.state.value.findIndex((s) => s.id === data.id);
    if (index !== -1) {
      as.state.value.splice(index, 1, data);
    } else {
      as.state.value.push(data);
    }
  };

  const useRawItem = (id: Ref<string | undefined>) =>
    computed(() => (id.value ? as.state.value?.find((s) => s.id === id.value) : undefined));

  const useAll: CMS.UseAll<NodeWithSubscription> = () => CMS.toAllItems({ ...as, state: sorted });
  const useOne: CMS.UseOne<NodeWithSubscription> = (id) => CMS.toOneItem({ ...as, state: useRawItem(id) });

  const useRemoval: CMS.UseRemoval<NodeWithSubscription> = (id) => {
    const source = CMS.fork(useRawItem(id));
    const del = useAsyncState(
      async () => {
        await apiFetch<void>(`/nodes/${encodeURIComponent(id.value!)}`, { method: "DELETE" });
        return source.value;
      },
      undefined,
      {
        immediate: false,
        throwError: true,
        onError: () => {},
        onSuccess: () => id.value && localRemove(id.value),
      },
    );
    return CMS.toRemoval(source, del);
  };

  const useUpsert: CMS.UseUpsert<NodeUpsert> = (id: Ref<string | undefined>) => {
    const source = CMS.fork(useRawItem(id));
    const form = reactive<NodeForm>(source.value ? mapToForm(source.value) : useNewValue());
    watchEffect(() => Object.assign(form, source.value ? mapToForm(source.value) : useNewValue()));

    const payload = () => ({
      subscriptionId: form.subscriptionId,
      name: form.name.trim(),
      protocol: form.protocol.trim(),
      remark: form.remark.trim(),
      ip: form.ip.trim(),
      priceRate: form.priceRate,
      tags: form.tags,
      connInfo: form.connInfo,
    });

    const create = () => apiFetch<NodeWithSubscription>("/nodes", { method: "POST", body: payload() });
    const update = () =>
      apiFetch<NodeWithSubscription>(`/nodes/${encodeURIComponent(id.value!)}`, {
        method: "PUT",
        body: payload(),
      });

    const { state, execute: validate } = useAsyncState(
      async () => await schema["~standard"].validate(payload()),
      undefined,
      { immediate: false },
    );
    const issues = computed(() => state.value?.issues);

    const submit = async () => {
      const result = await validate();
      if (result?.issues) throw new Error("Validation failed");
      return await (id.value ? update() : create());
    };

    const upsert = useAsyncState(submit, undefined, {
      immediate: false,
      throwError: true,
      onSuccess: (data) => data && localAddOrUpdate(data),
    });

    return CMS.toUpsert(form, issues, upsert);
  };

  return { schema, useAll, useOne, useUpsert, useRemoval };
});
