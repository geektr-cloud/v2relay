import { env } from "cloudflare:workers";
import { NIL, v5 as uuidv5 } from "uuid";
import { HttpErr } from "@server/utils/http-errors";
import { isStructuredContentType, sniffContentType } from "@server/utils/sniff-content-type";
import { fromNodelist, fromYaml, type Protocol } from "@server/pkgs/protocols";
import { batchUpdate } from "@server/core/nodes/batch-update";
import type { Node } from "@server/generated/prisma/dto";
import { dnsResolve } from "@server/utils/dns-resolve";
import { createNotice, createNotices } from "../system-notices/create-notices";
import { tagMatcher } from "../tags/tag-matcher";
import type { AggregatedSubscription } from "./schema";
import { getProviderHooks } from "./provider-hooks";

/** uuid v5 namespace for deterministic node ids (derived once from NIL UUID) */
const uuidNodeNS = uuidv5("nodes", NIL);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

/** Well-known public DNS / placeholder IPs that providers sometimes use as bogus node addresses. */
const IGNORED_IPS = new Set([
  "0.0.0.0",
  "127.0.0.1",
  "1.1.1.1",
  "1.0.0.1",
  "8.8.8.8",
  "8.8.4.4",
  "9.9.9.9",
  "223.5.5.5",
  "223.6.6.6",
  "114.114.114.114",
  "114.114.115.115",
  "119.29.29.29",
  "180.76.76.76",
]);

export type SubscriptionCacheStatus = {
  sourceUrl: string;
  size: number;
  cachedAt: string;
  contentType: string;
};

const kvKey = (id: string): string => `subscription:${id}`;

export class SubscriptionManager {
  readonly id: string;
  readonly urls: string[];
  readonly syncTags: boolean;
  readonly price: number;

  constructor(readonly sub: AggregatedSubscription) {
    this.id = sub.id;
    this.urls = sub.urls;
    this.syncTags = sub.provider.syncTags;
    this.price = sub.price;
  }

  async get(
    options: { forceReload?: boolean } = {},
  ): Promise<{ response: Response; cacheStatus: SubscriptionCacheStatus }> {
    if (!options.forceReload) {
      const cached = await this.readCached();
      if (cached) return cached;
    }

    if (this.urls.length === 0) {
      // 无 url：禁用同步。已有缓存可由 forceReload=false 命中（上方已处理），
      // 否则只能等手动 PUT /content。
      throw HttpErr(400, "Subscription has no urls; sync disabled");
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
    await this.syncNodes(body, contentType);

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

  /**
   * 按 content-type 从原始内容中提取协议节点，并整体替换该订阅在 Node 表里的记录。
   * 只处理 yaml / nodelist；json 与其他类型不动 Node 表。
   * 调用 batchUpdate 在 KV 写入之前完成，DB 写失败时整体抛错、KV 不会被覆盖。
   */
  private async syncNodes(body: ArrayBuffer, contentType: string): Promise<void> {
    const hook = getProviderHooks(this.sub.provider.name);

    const ct = contentType.toLowerCase();
    let protocols: Protocol[];
    let groupToProxy: Map<string, Set<string>> = new Map();

    if (ct.includes("nodelist")) {
      protocols = fromNodelist(new TextDecoder().decode(body));
    } else if (ct.includes("yaml") || ct.includes("yml")) {
      const result = fromYaml(new TextDecoder().decode(body));
      protocols = result.protocols;
      groupToProxy = result.groupToProxy;
    } else {
      createNotice(`subscription ${this.id}: unrecognized content type: ${ct}`);
      return;
    }

    await tagMatcher.ready();

    const nodeNameToTags = new Map<string, Set<string>>();
    if (this.syncTags) {
      const notices: Set<string> = new Set();

      for (const [groupName, nodeNames] of groupToProxy) {
        const tags = tagMatcher.match(groupName);
        if (tags.length === 0) {
          notices.add(`subscription ${this.id}: unrecognized group: ${groupName}`);
          continue;
        }

        for (const nodeName of nodeNames) {
          const set = nodeNameToTags.get(nodeName) ?? new Set<string>();
          for (const tag of tags) set.add(tag);
          nodeNameToTags.set(nodeName, set);
        }
      }

      if (notices.size > 0) createNotices(notices);
    }

    if (hook?.rewriteProtocols) protocols = hook.rewriteProtocols(this.sub, protocols);

    let nodes: Node[] = protocols.map((p) => {
      const { name, ip } = p.getServerInfo();
      const tagSet = new Set(nodeNameToTags.get(name) ?? []);
      for (const t of tagMatcher.match(name)) tagSet.add(t);
      // 从节点名提取倍率（"数字x" 或 "x数字"，如 "3x" / "1.5X"），无则默认 1
      const rateMatch = name.match(/(\d+(?:\.\d+)?)\s*[xX]|[xX]\s*(\d+(?:\.\d+)?)/);
      const rateRaw = rateMatch ? parseFloat(rateMatch[1] ?? rateMatch[2] ?? "1") : 1;
      const priceRate = Number.isFinite(rateRaw) && rateRaw >= 0 ? rateRaw : 1;
      const price = Math.round(this.price * priceRate * 100) / 100;
      return {
        id: uuidv5(`${this.id}\n${p.toUrl()}`, uuidNodeNS),
        subscriptionId: this.id,
        tags: Array.from(tagSet),
        protocol: p.protocol,
        name,
        remark: "",
        ip,
        priceRate,
        price,
        connInfo: p.toClash() ?? {},
      };
    });

    const resolvedIps = await dnsResolve(nodes.map((n) => n.ip));
    nodes.forEach((n) => {
      n.ip = resolvedIps.get(n.ip) ?? n.ip;
    });

    nodes = nodes.filter((node, i) => {
      if (IGNORED_IPS.has(node.ip)) return false;
      const next = nodes[i + 1];
      if (!next) return true;
      const { name: _na, ...a } = node.connInfo;
      const { name: _nb, ...b } = next.connInfo;
      return JSON.stringify(a) !== JSON.stringify(b);
    });

    if (hook?.rewriteNodes) nodes = hook.rewriteNodes(this.sub, nodes);

    await batchUpdate(this.id, nodes);
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
