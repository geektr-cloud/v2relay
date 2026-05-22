import { type ClientResponse, hc } from "hono/client";
import type { AppType } from "@server/index";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const client = hc<AppType>("/");
export type AppResponse<T> = Promise<ClientResponse<T, ContentfulStatusCode, "json">>;

export async function rpc<T>(call: Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>): Promise<T> {
  const res = await call;
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
