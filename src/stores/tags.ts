import { tag } from "@server/core/tags";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useTagStore = defineStore("tags", () =>
  useSortedCollection({
    newItem: tag.newItem,
    fetchFn: useHonoApi(() => client.api.tags.$get()),
    removeFn: useHonoApi((id: string) => client.api.tags[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: tag.Tag) => client.api.tags.$put({ json })),
    upsertSchema: tag.upsert.body,
  }),
);
