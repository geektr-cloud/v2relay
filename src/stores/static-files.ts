import { staticFile } from "@server/core/static-files";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useStaticFileStore = defineStore("static-files", () =>
  useSortedCollection({
    newItem: staticFile.newItem,
    fetchFn: useHonoApi(() => client.api["static-files"].$get()),
    removeFn: useHonoApi((id: string) => client.api["static-files"][":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: staticFile.StaticFile) => client.api["static-files"].$put({ json })),
    upsertSchema: staticFile.upsert.body,
  }),
);
