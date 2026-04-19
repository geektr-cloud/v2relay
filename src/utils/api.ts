export async function apiFetch<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const init: RequestInit = { method: opts?.method };
  if (opts?.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`/api${path}`, init);
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  }

  return data as T;
}
