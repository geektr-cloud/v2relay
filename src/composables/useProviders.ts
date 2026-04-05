import { ref, computed } from 'vue'
import type { Provider } from '@/types/api'

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export function useProviders() {
  const providers = ref<Provider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sortedProviders = computed(() =>
    [...providers.value].sort((a, b) => a.name.localeCompare(b.name)),
  )

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/providers')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      providers.value = await parseJson<Provider[]>(res)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      providers.value = []
    } finally {
      loading.value = false
    }
  }

  async function createProvider(name: string, url: string | null) {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url: url || null }),
    })
    const body = await parseJson<Provider & { error?: string }>(res)
    if (!res.ok) {
      const msg = typeof body.error === 'string' ? body.error : `HTTP ${res.status}`
      throw new Error(msg)
    }
    return body as Provider
  }

  async function getProvider(idOrName: string) {
    const res = await fetch(
      `/api/providers/${encodeURIComponent(idOrName)}`,
    )
    const body = await parseJson<Provider & { error?: string }>(res)
    if (!res.ok) {
      const msg = typeof body.error === 'string' ? body.error : `HTTP ${res.status}`
      throw new Error(msg)
    }
    return body as Provider
  }

  return {
    providers,
    sortedProviders,
    loading,
    error,
    refresh,
    createProvider,
    getProvider,
  }
}
