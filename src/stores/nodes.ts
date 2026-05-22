import { node } from "@server/core/nodes";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import type { Subscription } from "@server/generated/prisma/dto";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

const resolveFn = async (item: node.Node): Promise<node.AggregatedNode> => {
  const getSub = useHonoApi<Subscription, Subscription, [string]>(
    () => client.api.subscriptions[":id"].$get({ param: { id: item.subscriptionId } }),
  );

  return { ...item, subscription: await getSub(item.subscriptionId) };
};

export const useNodeStore = defineStore("nodes", () => useSortedCollection({
  newItem: node.newItem,
  fetchFn: useHonoApi(() => client.api.nodes.$get({ query: { aggregate: "true" } })),
  resolveFn,
  removeFn: useHonoApi((id: string) => client.api.nodes[":id"].$delete({ param: { id } })),
  upsertFn: useHonoApi(({ subscription, ...json }) => client.api.nodes.$put({ json })),
  upsertSchema: node.upsert.body,
}));
