import { env } from "cloudflare:workers";
import { HttpErr } from "@server/utils/http-errors";
import { Rule } from "@server/pkgs/rules";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

export type RulesetCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
};

const kvKey = (id: string): string => `ruleset:${id}`;

export class RulesetManager {
  constructor(
    readonly id: string,
    readonly url: string,
  ) {}

  async get(options: { forceReload?: boolean } = {}): Promise<{ response: Response; cacheStatus: RulesetCacheStatus }> {
    if (!options.forceReload) {
      const cached = await this.readCached();
      if (cached) return cached;
    }

    const upstream = await this.fetchUpstream();
    return this.write(upstream.body, upstream.contentType, this.url);
  }

  private async readCached(): Promise<{ response: Response; cacheStatus: RulesetCacheStatus } | null> {
    const { value, metadata } = await env.kv.getWithMetadata<RulesetCacheStatus>(kvKey(this.id), {
      type: "arrayBuffer",
    });
    if (!value || !metadata) return null;

    const response = new Response(value, {
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
  ): Promise<{ response: Response; cacheStatus: RulesetCacheStatus }> {
    const status: RulesetCacheStatus = {
      sourceUrl,
      size: body.byteLength,
      cachedAt: new Date().toISOString(),
      contentType,
    };

    await env.kv.put(kvKey(this.id), body, { metadata: status });

    const response = new Response(body, {
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
      },
    });
    return { response, cacheStatus: status };
  }

  async genClashRulesWithPolicy(policy: string): Promise<string[]> {
    const { response } = await this.get();
    const text = await response.text();
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => Rule.parseTemplate(l))
      .filter((r): r is Rule => r !== null)
      .map((r) => {
        r.policy = policy;
        return r.stringify();
      });
  }

  private async fetchUpstream(): Promise<{ body: ArrayBuffer; contentType: string }> {
    const res = await fetch(this.url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw HttpErr(502, `Upstream returned ${res.status}`);
    const body = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { body, contentType };
  }
}
