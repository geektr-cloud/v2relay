import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Tag } from '@/types/api'
import { apiFetch } from '@/utils/api'

export const useTagStore = defineStore('tags', () => {
  const items = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sorted = computed(() =>
    [...items.value].sort((a, b) => a.name.localeCompare(b.name)),
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      items.value = await apiFetch<Tag[]>('/tags')
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  const get = (id: string) =>
    apiFetch<Tag>(`/tags/${encodeURIComponent(id)}`)

  const create = (input: { name: string; keywords?: string[] }) =>
    apiFetch<Tag>('/tags', { method: 'POST', body: input })

  const update = (
    id: string,
    patch: Partial<{ name: string; keywords: string[] }>,
  ) =>
    apiFetch<Tag>(`/tags/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    })

  const remove = (id: string) =>
    apiFetch<void>(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' })

  return { items, sorted, loading, error, refresh, get, create, update, remove }
})
