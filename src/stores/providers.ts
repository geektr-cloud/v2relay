import { computed, reactive, watchEffect, type Ref } from "vue";
import { defineStore } from "pinia";
import type { Provider } from "@/types/api";
import { apiFetch } from "@/utils/api";
import { useAsyncState } from "@vueuse/core";
import { CMS } from "@/components/CMS";
import { schema } from "@server/core/providers/schema";

const useNewValue = () => ({
  id: "",
  name: "",
  url: "",
});

export const useProviderStore = defineStore("providers", () => {
  const as = useAsyncState(() => apiFetch<Provider[]>("/providers"), [], { shallow: false });
  const sorted = computed(() => as.state.value?.sort((a, b) => a.name.localeCompare(b.name)) ?? []);

  const localRemove = (id: string) => (as.state.value = as.state.value?.filter((p) => p.id !== id) ?? []);
  const localAddOrUpdate = (data: Provider) => {
    const index = as.state.value.findIndex((p) => p.id === data.id);
    if (index !== -1) {
      as.state.value.splice(index, 1, data);
    } else {
      as.state.value.push(data);
    }
  };

  const useRawItem = (idOrName: Ref<string | undefined>) =>
    computed(() =>
      idOrName.value ? as.state.value?.find((p) => p.id === idOrName.value || p.name === idOrName.value) : undefined,
    );

  const useOne: CMS.UseOne<Provider> = (idOrName) => CMS.toOneItem({ ...as, state: useRawItem(idOrName) });

  const useAll: CMS.UseAll<Provider> = () => CMS.toAllItems({ ...as, state: sorted });

  const useRemoval: CMS.UseRemoval<Provider> = (idOrName) =>
    CMS.toRemoval(
      CMS.fork(useRawItem(idOrName)),
      useAsyncState(() => apiFetch<Provider>(`/providers/${idOrName.value}`, { method: "DELETE" }), undefined, {
        immediate: false,
        throwError: true,
        onError: () => {},
        onSuccess: (data) => data && localRemove(data.id),
      }),
    );

  const useUpsert: CMS.UseUpsert<Provider> = (idOrName: Ref<string | undefined>) => {
    const source = CMS.fork(useRawItem(idOrName));

    const form = reactive<Provider>(source?.value ?? useNewValue());
    watchEffect(() => Object.assign(form, source?.value ?? useNewValue()));

    const create = () => apiFetch<Provider>("/providers", { method: "POST", body: form });
    const update = () => apiFetch<Provider>(`/providers/${idOrName.value}`, { method: "PUT", body: form });

    const { state, execute: validate } = useAsyncState(
      async () => await schema["~standard"].validate(form),
      undefined,
      { immediate: false },
    );
    const issues = computed(() => state.value?.issues);
    const submit = async () => {
      const result = await validate();
      if (result?.issues) throw new Error("Validation failed");
      return await (idOrName.value ? update() : create());
    };

    const as = useAsyncState(submit, undefined, {
      immediate: false,
      throwError: true,
      onSuccess: (data) => data && localAddOrUpdate(data),
    });

    return CMS.toUpsert(form, issues, as);
  };

  return { schema, useAll, useOne, useRemoval, useUpsert };
});
