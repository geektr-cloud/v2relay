import { route } from "@server/core/routes";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useRouteStore = defineStore("routes", () =>
  useSortedCollection({
    newItem: route.newItem,
    fetchFn: useHonoApi(() => client.api.routes.$get()),
    removeFn: useHonoApi((id: string) => client.api.routes[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: route.Route) => client.api.routes.$put({ json })),
    upsertSchema: route.upsert.body,
  }),
);
