import { subscription } from "@server/core/subscriptions";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useSubscriptionStore = defineStore("subscriptions", () =>
  useSortedCollection({
    newItem: subscription.newItem,
    fetchFn: useHonoApi(() => client.api.subscriptions.$get()),
    removeFn: useHonoApi((id: string) => client.api.subscriptions[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: subscription.Subscription) => client.api.subscriptions.$put({ json })),
    upsertSchema: subscription.upsert.body,
  }),
);
