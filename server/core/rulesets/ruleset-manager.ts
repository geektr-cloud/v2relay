import { env } from "cloudflare:workers";
import { HttpErr } from "@server/utils/http-errors";
import { RuleCollection } from "@server/pkgs/rules";
import type { ParsedRules } from "./schema";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

export type RulesetCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
};

export type ParsedCacheStatus = {
  cachedAt: string;
  counts: { classical: number; domain: number; ipcidr: number };
};

const kvKey = (id: string): string => `ruleset:${id}`;
const parsedKey = (id: string): string => `ruleset-parsed:${id}`;

type RulesetRef = { id: string; url: string; rules: string };

export class RulesetManager {
  readonly id: string;
  readonly url: string;
  readonly rules: string;

  constructor(ref: RulesetRef);
  constructor(id: string, url: string, rules?: string);
  constructor(idOrRef: string | RulesetRef, url?: string, rules?: string) {
    if (typeof idOrRef === "string") {
      this.id = idOrRef;
      this.url = url ?? "";
      this.rules = rules ?? "";
    } else {
      this.id = idOrRef.id;
      this.url = idOrRef.url;
      this.rules = idOrRef.rules;
    }
  }

  private get inline(): boolean {
    return this.rules !== "";
  }

  async get(options: { maxAge?: number } = {}): Promise<{ response: Response; cacheStatus: RulesetCacheStatus }> {
    if (this.inline) return this.buildInline();

    const cached = await this.readCached();
    if (cached && RulesetManager.isFresh(cached.cacheStatus.cachedAt, options.maxAge)) return cached;

    if (!this.url) {
      if (cached) return cached; // 无法重新拉取时回退到（可能已过期的）缓存
      throw HttpErr(400, "Ruleset has neither url nor rules");
    }

    const upstream = await this.fetchUpstream();
    return this.write(upstream.body, upstream.contentType, this.url);
  }

  /**
   * 缓存是否“足够新”以跳过上游重新拉取。
   *   maxAge undefined → 永远复用缓存
   *   maxAge <= 0      → 永不复用（强制刷新）
   *   否则             → 缓存年龄 < maxAge 秒才复用
   */
  private static isFresh(cachedAt: string, maxAge?: number): boolean {
    if (maxAge === undefined) return true;
    if (maxAge <= 0) return false;
    const ageSec = (Date.now() - new Date(cachedAt).getTime()) / 1000;
    return ageSec < maxAge;
  }

  /**
   * 拉取（受 maxAge 约束）→ 解析归类 → 把 `{classical,domain,ipcidr}` 副本写入 KV。
   * 返回归类结果（含 {@link RuleCollection}）及两个缓存状态。
   */
  async getParsed(options: { maxAge?: number } = {}): Promise<{
    parsed: ParsedRules;
    collection: RuleCollection;
    cacheStatus: RulesetCacheStatus;
    parsedStatus: ParsedCacheStatus;
  }> {
    const { response, cacheStatus } = await this.get(options);
    const text = await response.text();
    const collection = RuleCollection.fromRuleList(text);
    const parsed = collection.toGroups();

    const parsedStatus: ParsedCacheStatus = {
      cachedAt: new Date().toISOString(),
      counts: {
        classical: parsed.classical.length,
        domain: parsed.domain.length,
        ipcidr: parsed.ipcidr.length,
      },
    };

    await env.kv.put(parsedKey(this.id), collection.toJSON(), {
      metadata: parsedStatus,
      expirationTtl: 86400,
    });

    return { parsed, collection, cacheStatus, parsedStatus };
  }

  /**
   * 读取已存的 parsed 副本（rule-providers 形态）。
   * KV 命中则直接反序列化（不打上游）；未命中才即时计算并写回。
   * 订阅生成走这条路——“取 parsed 的结果”，新鲜度由全局 pull 维护。
   */
  async getParsedCollection(): Promise<RuleCollection> {
    const stored = await env.kv.get(parsedKey(this.id), "text");
    if (stored) return RuleCollection.fromJson(stored);
    const { collection } = await this.getParsed();
    return collection;
  }

  private buildInline(): { response: Response; cacheStatus: RulesetCacheStatus } {
    const body = new TextEncoder().encode(this.rules).buffer as ArrayBuffer;
    const contentType = "text/plain; charset=utf-8";
    const cacheStatus: RulesetCacheStatus = {
      sourceUrl: "inline",
      size: body.byteLength,
      cachedAt: new Date().toISOString(),
      contentType,
    };
    const response = new Response(body, {
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
      },
    });
    return { response, cacheStatus };
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

    await env.kv.put(kvKey(this.id), body, { metadata: status, expirationTtl: 86400 });

    const response = new Response(body, {
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
      },
    });
    return { response, cacheStatus: status };
  }

  private async fetchUpstream(): Promise<{ body: ArrayBuffer; contentType: string }> {
    let url = this.url;
    if (env.GITHUB_PROXY && url.includes("github")) {
      url = `${env.GITHUB_PROXY}${url}`;
    }

    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw HttpErr(502, `Upstream returned ${res.status}`);
    const body = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { body, contentType };
  }
}
