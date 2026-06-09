import { ref } from "vue";
import { defineStore } from "pinia";
import { tag } from "@server/core/tags";
import { useHonoApi, useSortedCollection } from "@/lib/acrux";
import { client, rpc } from "@/utils/api";

export const useTagStore = defineStore("tags", () =>
  useSortedCollection({
    newItem: tag.newItem,
    fetchFn: useHonoApi(() => client.api.tags.$get()),
    removeFn: useHonoApi((id: string) => client.api.tags[":id"].$delete({ param: { id } })),
    upsertFn: useHonoApi((json: tag.Tag) => client.api.tags.$put({ json })),
    upsertSchema: tag.upsert.body,
  }),
);

/**
 * Union of Tag table names + every distinct value in Node.tags JSON column.
 * Use for free-form tag selection UIs (NodeFilter, etc) instead of loading
 * the full node list just to extract tag strings.
 */
export const useAllTagsStore = defineStore("all-tags", () => {
  const tags = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<unknown>(null);
  const loaded = ref(false);

  async function load(force = false) {
    if (loading.value) return;
    if (loaded.value && !force) return;
    loading.value = true;
    error.value = null;
    try {
      tags.value = await rpc<string[]>(client.api.tags.all.$get());
      loaded.value = true;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  function ensure() {
    if (!loaded.value && !loading.value) void load();
  }

  return { tags, loading, error, loaded, load, ensure };
});
