import { computed, reactive, watchEffect, type Ref } from "vue";
import { defineStore } from "pinia";
import type { Tag } from "@/types/api";
import { apiFetch } from "@/utils/api";
import { useAsyncState } from "@vueuse/core";
import { CMS } from "@/components/CMS";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(32),
  keywords: z.array(z.string().trim()).default([]),
});

const useNewValue = () => ({
  id: "",
  name: "",
  keywords: [] as string[],
});

export const useTagStore = defineStore("tags", () => {
  const as = useAsyncState(() => apiFetch<Tag[]>("/tags"), [], { shallow: false });
  const sorted = computed(() => as.state.value?.sort((a, b) => a.name.localeCompare(b.name)) ?? []);

  const localRemove = (id: string) => (as.state.value = as.state.value?.filter((t) => t.id !== id) ?? []);
  const localAddOrUpdate = (data: Tag) => {
    const index = as.state.value.findIndex((t) => t.id === data.id);
    if (index !== -1) {
      as.state.value.splice(index, 1, data);
    } else {
      as.state.value.push(data);
    }
  };

  const useRawItem = (idOrName: Ref<string | undefined>) =>
    computed(() =>
      idOrName.value ? as.state.value?.find((t) => t.id === idOrName.value || t.name === idOrName.value) : undefined,
    );

  const useOne: CMS.UseOne<Tag> = (idOrName) => CMS.toOneItem({ ...as, state: useRawItem(idOrName) });

  const useAll: CMS.UseAll<Tag> = () => CMS.toAllItems({ ...as, state: sorted });

  const useRemoval: CMS.UseRemoval<Tag> = (idOrName) =>
    CMS.toRemoval(
      CMS.fork(useRawItem(idOrName)),
      useAsyncState(
        () => apiFetch<Tag>(`/tags/${encodeURIComponent(idOrName.value!)}`, { method: "DELETE" }),
        undefined,
        {
          immediate: false,
          throwError: true,
          onError: () => {},
          onSuccess: (data) => data && localRemove(data.id),
        },
      ),
    );

  const useUpsert: CMS.UseUpsert<Tag> = (idOrName: Ref<string | undefined>) => {
    const source = CMS.fork(useRawItem(idOrName));

    const form = reactive<Tag>(source?.value ?? useNewValue());
    watchEffect(() => Object.assign(form, source?.value ?? useNewValue()));

    const create = () => apiFetch<Tag>("/tags", { method: "POST", body: form });
    const update = () =>
      apiFetch<Tag>(`/tags/${encodeURIComponent(idOrName.value!)}`, { method: "PATCH", body: form });

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

    const as2 = useAsyncState(submit, undefined, {
      immediate: false,
      throwError: true,
      onSuccess: (data) => data && localAddOrUpdate(data),
    });

    return CMS.toUpsert(form, issues, as2);
  };

  return { schema, useAll, useOne, useRemoval, useUpsert };
});
