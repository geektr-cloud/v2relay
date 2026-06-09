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

  async get(options: { forceReload?: boolean } = {}): Promise<{ response: Response; cacheStatus: RulesetCacheStatus }> {
    if (this.inline) return this.buildInline();

    if (!options.forceReload) {
      const cached = await this.readCached();
      if (cached) return cached;
    }

    if (!this.url) throw HttpErr(400, "Ruleset has neither url nor rules");

    const upstream = await this.fetchUpstream();
    return this.write(upstream.body, upstream.contentType, this.url);
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

  async *genClashRulesWithPolicy(policy: string): AsyncGenerator<string> {
    const { response } = await this.get();
    const text = await response.text();
    for (const raw of text.split("\n")) {
      const l = raw.trim();
      if (!l || l.startsWith("#")) continue;
      const r = Rule.parseTemplate(l);
      if (!r) continue;
      r.policy = policy;
      yield r.stringify();
    }
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
