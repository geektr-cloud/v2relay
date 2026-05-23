import { appConfig } from "@server/core/app-configs";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useAppConfigStore = defineStore("app-configs", () =>
  useSortedCollection({
    newItem: appConfig.newItem,
    fetchFn: useHonoApi(() => client.api["app-configs"].$get()),
    removeFn: useHonoApi((id: string) => client.api["app-configs"][":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: appConfig.AppConfig) => client.api["app-configs"].$put({ json: json as never })),
    upsertSchema: appConfig.upsert.body,
  }),
);
