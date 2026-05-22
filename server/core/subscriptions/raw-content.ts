import { mcache } from "@server/utils/meta-cache";
import { HttpErr } from "@server/utils/http-errors";

const TTL_SECONDS = 10 * 60;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

export type SubscriptionCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  expiresAt: string;
};

export class SubscriptionRawContent {
  constructor(
    readonly id: string,
    readonly urls: string[],
  ) {}

  private get cacheKey(): string {
    return `https://v2relay.internal/cache/v2relay:subscription:${this.id}:raw`;
  }

  async get(): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
    const [cached, cacheStatus] = await mcache.match<SubscriptionCacheStatus>(this.cacheKey);
    if (cached && cacheStatus) return { response: cached, cacheStatus };

    const upstream = await this.fetchFirstWorking();
    if (!upstream) throw HttpErr(500, "All subscription URLs failed");

    const body = await upstream.res.arrayBuffer();
    const contentType = upstream.res.headers.get("content-type") ?? "text/plain; charset=utf-8";
    const now = Date.now();

    const newStatus: SubscriptionCacheStatus = {
      sourceUrl: upstream.url,
      size: body.byteLength,
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_SECONDS * 1000).toISOString(),
    };
    const response = new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
        "cache-control": `public, max-age=${TTL_SECONDS}`,
      },
    });

    await mcache.put(this.cacheKey, response.clone(), newStatus);
    return { response, cacheStatus: newStatus };
  }

  private async fetchFirstWorking(): Promise<{ url: string; res: Response } | null> {
    for (const url of this.urls) {
      console.log(url);
      try {
        const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
        if (res.ok) return { url, res };
        console.log(res.statusText);
      } catch (e) {
        console.log(url);
        console.error(e);
      }
    }
    return null;
  }
}
