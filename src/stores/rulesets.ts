import { ruleset } from "@server/core/rulesets";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client } from "@/utils/api";
import { defineStore } from "pinia";

export const useRulesetStore = defineStore("rulesets", () => {
  const collection = useSortedCollection({
    newItem: ruleset.newItem,
    sortFn: (a, b) => a.name.localeCompare(b.name),
    fetchFn: useHonoApi(() => client.api.rulesets.$get()),
    removeFn: useHonoApi((id: string) => client.api.rulesets[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: ruleset.Ruleset) => client.api.rulesets.$put({ json })),
    upsertSchema: ruleset.upsert.body,
  });

  // 全局拉取：重新解析归类全部规则集并写入 KV 副本。maxAge 省略则用服务端默认（600s）。
  const pullAll = useHonoApi((maxAge?: number) =>
    client.api.rulesets.parsed.$post({ query: maxAge === undefined ? {} : { max_age: String(maxAge) } }),
  );

  return { ...collection, pullAll };
});
