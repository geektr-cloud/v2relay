import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Provider } from "@/types/api";
import { apiFetch } from "@/utils/api";

export const useProviderStore = defineStore("providers", () => {
  const items = ref<Provider[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sorted = computed(() => [...items.value].sort((a, b) => a.name.localeCompare(b.name)));

  async function refresh() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await apiFetch<Provider[]>("/providers");
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  const get = (idOrName: string) => apiFetch<Provider>(`/providers/${encodeURIComponent(idOrName)}`);

  const create = (name: string, url: string) =>
    apiFetch<Provider>("/providers", {
      method: "POST",
      body: { name, url },
    });

  const update = (idOrName: string, patch: { name?: string; url?: string }) =>
    apiFetch<Provider>(`/providers/${encodeURIComponent(idOrName)}`, {
      method: "PATCH",
      body: patch,
    });

  const remove = (idOrName: string) =>
    apiFetch<void>(`/providers/${encodeURIComponent(idOrName)}`, {
      method: "DELETE",
    });

  return { items, sorted, loading, error, refresh, get, create, update, remove };
});
