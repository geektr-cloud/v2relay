import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SubscriptionWithProvider } from '@/types/api'
import { apiFetch } from '@/utils/api'

function hydrateDates(row: SubscriptionWithProvider): SubscriptionWithProvider {
  return {
    ...row,
    createdAt: new Date(row.createdAt as unknown as string),
    updatedAt: new Date(row.updatedAt as unknown as string),
  }
}

export const useSubscriptionStore = defineStore('subscriptions', () => {
  const items = ref<SubscriptionWithProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sortedByUpdated = computed(() =>
    [...items.value].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    ),
  )

  async function refresh(providerId?: string | null) {
    loading.value = true
    error.value = null
    try {
      const q = providerId
        ? `?providerId=${encodeURIComponent(providerId)}`
        : ''
      const raw = await apiFetch<SubscriptionWithProvider[]>(`/subscriptions${q}`)
      items.value = raw.map(hydrateDates)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  const get = async (id: string) =>
    hydrateDates(
      await apiFetch<SubscriptionWithProvider>(
        `/subscriptions/${encodeURIComponent(id)}`,
      ),
    )

  const create = async (input: {
    providerId: string
    urls: string[]
    enabled?: boolean
    name?: string
    remark?: string
  }) =>
    hydrateDates(
      await apiFetch<SubscriptionWithProvider>('/subscriptions', {
        method: 'POST',
        body: input,
      }),
    )

  const update = async (
    id: string,
    patch: Partial<{
      providerId: string
      urls: string[]
      enabled: boolean
      name: string
      remark: string
    }>,
  ) =>
    hydrateDates(
      await apiFetch<SubscriptionWithProvider>(
        `/subscriptions/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: patch },
      ),
    )

  const remove = (id: string) =>
    apiFetch<void>(`/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

  return { items, sortedByUpdated, loading, error, refresh, get, create, update, remove }
})
