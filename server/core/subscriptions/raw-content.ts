import { env } from "cloudflare:workers";
import { HttpErr } from "@server/utils/http-errors";
import { isStructuredContentType, sniffContentType } from "@server/utils/sniff-content-type";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

export type SubscriptionCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
};

const kvKey = (id: string): string => `subscription:${id}`;

export class SubscriptionRawContent {
  constructor(
    readonly id: string,
    readonly urls: string[],
  ) {}

  async get(
    options: { forceReload?: boolean } = {},
  ): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
    if (!options.forceReload) {
      const cached = await this.readCached();
      if (cached) return cached;
    }

    const upstream = await this.fetchFirstWorking();
    if (!upstream) throw HttpErr(500, "All subscription URLs failed or returned unrecognized content");

    return this.write(upstream.body, upstream.contentType, upstream.url);
  }

  /**
   * 直接以传入内容覆盖缓存（用户手动上传场景）
   */
  async put(
    body: ArrayBuffer | string,
    contentType: string = "text/plain; charset=utf-8",
  ): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
    return this.write(toArrayBuffer(body), contentType, "manual:upload");
  }

  private async readCached(): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus } | null> {
    const { value, metadata } = await env.kv.getWithMetadata<SubscriptionCacheStatus>(kvKey(this.id), {
      type: "arrayBuffer",
    });
    if (!value || !metadata) return null;

    const response = new Response(value, {
      status: 200,
      headers: {
        "content-type": metadata.contentType,
        "content-length": String(metadata.size),
      },
    });
    return { response, cacheStatus: metadata };
  }

  private async write(
    body: ArrayBuffer,
    contentType: string,
    sourceUrl: string,
  ): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
    const newStatus: SubscriptionCacheStatus = {
      sourceUrl,
      size: body.byteLength,
      cachedAt: new Date().toISOString(),
      contentType,
    };

    await env.kv.put(kvKey(this.id), body, { metadata: newStatus });

    const response = new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
      },
    });
    return { response, cacheStatus: newStatus };
  }

  private async fetchFirstWorking(): Promise<{ url: string; body: ArrayBuffer; contentType: string } | null> {
    for (const url of this.urls) {
      try {
        const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
        if (!res.ok) continue;

        const raw = await res.arrayBuffer();
        const basename = new URL(url).pathname.split("/").pop() ?? "";
        const sniffed = await sniffContentType(raw, basename);
        if (!isStructuredContentType(sniffed.type)) {
          console.warn(`subscription ${this.id}: skip ${url} (unrecognized content)`);
          continue;
        }
        return { url, body: toArrayBuffer(sniffed.content), contentType: sniffed.type };
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  }
}

function toArrayBuffer(input: string | ArrayBuffer): ArrayBuffer {
  if (typeof input !== "string") return input;
  const enc = new TextEncoder().encode(input);
  return enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) as ArrayBuffer;
}
