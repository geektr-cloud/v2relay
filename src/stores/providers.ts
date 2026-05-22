import { provider } from "@server/core/providers";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useProviderStore = defineStore("providers", () => useSortedCollection({
  newItem: provider.newItem,
  fetchFn: useHonoApi(() => client.api.providers.$get()),
  removeFn: useHonoApi((id: string) => client.api.providers[":id"].$delete({ param: { id } })),
  upsertFn: useHonoApi((json: provider.Provider) => client.api.providers.$put({ json })),
  upsertSchema: provider.upsert.body,
}));
