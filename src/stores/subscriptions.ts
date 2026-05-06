import { computed, reactive, watchEffect, type Ref } from "vue";
import { defineStore } from "pinia";
import { useAsyncState } from "@vueuse/core";
import { CMS } from "@/components/CMS";
import type { SubscriptionWithProvider } from "@/types/api";
import { apiFetch } from "@/utils/api";
import { schema } from "@server/core/subscriptions/schema";

function hydrateDates(row: SubscriptionWithProvider): SubscriptionWithProvider {
  return {
    ...row,
    createdAt: new Date(row.createdAt as unknown as string),
    updatedAt: new Date(row.updatedAt as unknown as string),
  };
}

type SubscriptionForm = {
  id: string;
  providerId: string;
  urls: string[];
  enabled: boolean;
  name: string;
  remark: string;
};
type SubscriptionUpsert = CMS.BaseData & Omit<SubscriptionForm, "id">;

const useNewValue = (): SubscriptionForm => ({
  id: "",
  providerId: "",
  urls: [""],
  enabled: true,
  name: "",
  remark: "",
});

export const useSubscriptionStore = defineStore("subscriptions", () => {
  const as = useAsyncState(
    async () => {
      const list = await apiFetch<SubscriptionWithProvider[]>("/subscriptions");
      return list.map(hydrateDates);
    },
    [],
    { shallow: false },
  );
  const sorted = computed(() =>
    [...(as.state.value ?? [])].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  );

  const localRemove = (id: string) => (as.state.value = as.state.value?.filter((row) => row.id !== id) ?? []);
  const localAddOrUpdate = (data: SubscriptionWithProvider) => {
    const index = as.state.value.findIndex((row) => row.id === data.id);
    if (index !== -1) {
      as.state.value.splice(index, 1, data);
    } else {
      as.state.value.push(data);
    }
  };

  const useRawItem = (id: Ref<string | undefined>) =>
    computed(() => (id.value ? as.state.value?.find((row) => row.id === id.value) : undefined));

  const useAll: CMS.UseAll<SubscriptionWithProvider> = () => CMS.toAllItems({ ...as, state: sorted });
  const useFiltered: CMS.UseFiltered<SubscriptionWithProvider> = (filter) =>
    CMS.toFilteredItems({ ...as, state: sorted }, filter);
  const useOne: CMS.UseOne<SubscriptionWithProvider> = (id) => CMS.toOneItem({ ...as, state: useRawItem(id) });

  const useRemoval: CMS.UseRemoval<SubscriptionWithProvider> = (id) => {
    const source = CMS.fork(useRawItem(id));
    const del = useAsyncState(
      async () => {
        await apiFetch<void>(`/subscriptions/${encodeURIComponent(id.value!)}`, { method: "DELETE" });
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

  const useUpsert: CMS.UseUpsert<SubscriptionUpsert> = (id: Ref<string | undefined>) => {
    const source = CMS.fork(useRawItem(id));
    const form = reactive<SubscriptionForm>(source.value ? mapToForm(source.value) : useNewValue());
    watchEffect(() => Object.assign(form, source.value ? mapToForm(source.value) : useNewValue()));

    const payload = () => ({
      providerId: form.providerId,
      urls: form.urls.map((url) => url.trim()).filter(Boolean),
      enabled: form.enabled,
      name: form.name.trim(),
      remark: form.remark.trim(),
    });
    const create = () => apiFetch<SubscriptionWithProvider>("/subscriptions", { method: "POST", body: payload() });
    const update = () =>
      apiFetch<SubscriptionWithProvider>(`/subscriptions/${encodeURIComponent(id.value!)}`, {
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
      const row = await (id.value ? update() : create());
      return hydrateDates(row);
    };
    const upsert = useAsyncState(submit, undefined, {
      immediate: false,
      throwError: true,
      onSuccess: (data) => data && localAddOrUpdate(data),
    });

    return CMS.toUpsert(form, issues, upsert);
  };

  return { schema, useAll, useFiltered, useOne, useUpsert, useRemoval };
});

function mapToForm(row: SubscriptionWithProvider): SubscriptionForm {
  return {
    id: row.id,
    providerId: row.providerId,
    urls: row.urls.length ? [...row.urls] : [""],
    enabled: row.enabled,
    name: row.name ?? "",
    remark: row.remark ?? "",
  };
}
