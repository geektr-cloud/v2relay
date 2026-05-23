import { ruleset } from "@server/core/rulesets";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useRulesetStore = defineStore("rulesets", () =>
  useSortedCollection({
    newItem: ruleset.newItem,
    fetchFn: useHonoApi(() => client.api.rulesets.$get()),
    removeFn: useHonoApi((id: string) => client.api.rulesets[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: ruleset.Ruleset) => client.api.rulesets.$put({ json })),
    upsertSchema: ruleset.upsert.body,
  }),
);
