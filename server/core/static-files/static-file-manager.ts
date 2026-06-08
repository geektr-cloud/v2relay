import { env } from "cloudflare:workers";
import { HttpErr } from "@server/utils/http-errors";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

export type StaticFileCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
  sha256: string;
};

const kvKey = (id: string): string => `static-file:${id}`;

type StaticFileRef = { id: string; url: string; expire: number };

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class StaticFileManager {
  readonly id: string;
  readonly url: string;
  readonly expire: number;

  constructor(ref: StaticFileRef) {
    this.id = ref.id;
    this.url = ref.url;
    this.expire = ref.expire;
  }

  async get(
    options: { forceReload?: boolean } = {},
  ): Promise<{ response: Response; cacheStatus: StaticFileCacheStatus }> {
    if (!options.forceReload) {
      const cached = await this.readCached();
      if (cached) return cached;
    }

    if (!this.url) throw HttpErr(400, "StaticFile has no url");

    const upstream = await this.fetchUpstream();
    return this.write(upstream.body, upstream.contentType);
  }

  private async readCached(): Promise<{ response: Response; cacheStatus: StaticFileCacheStatus } | null> {
    const { value, metadata } = await env.kv.getWithMetadata<StaticFileCacheStatus>(kvKey(this.id), {
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
  ): Promise<{ response: Response; cacheStatus: StaticFileCacheStatus }> {
    const status: StaticFileCacheStatus = {
      sourceUrl: this.url,
      size: body.byteLength,
      cachedAt: new Date().toISOString(),
      contentType,
      sha256: await sha256Hex(body),
    };

    await env.kv.put(kvKey(this.id), body, { metadata: status, expirationTtl: this.expire });

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
