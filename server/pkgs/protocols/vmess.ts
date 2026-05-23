import { base64UrlEncode, tryBase64UrlDecode } from "./base64";
import type { Protocol, ProtocolStatic } from "./types";

// ─── 常量定义 ─────────────────────────────────────────────────────────────────
// VMess 加密方式（scy）和传输层（net）跟随主流客户端实现（v2rayN / mihomo）

/** VMess 加密方式 */
export const VMESS_CIPHERS = ["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"] as const;
export type VMessCipher = (typeof VMESS_CIPHERS)[number];

/** VMess 传输层 */
export const VMESS_NETWORKS = ["tcp", "ws", "h2", "http", "grpc", "kcp", "quic", "httpupgrade", "xhttp"] as const;
export type VMessNetwork = (typeof VMESS_NETWORKS)[number];

/** TLS 层 */
export const VMESS_SECURITIES = ["", "tls", "reality"] as const;
export type VMessSecurity = (typeof VMESS_SECURITIES)[number];

// ─── Class ────────────────────────────────────────────────────────────────────

export interface VMessInit {
  server: string;
  port: number;
  uuid: string;
  alterId?: number;
  name?: string;
  /** scy: 加密方式 */
  security?: VMessCipher | (string & {});
  /** net: 传输层 */
  network?: VMessNetwork | (string & {});
  /** type: header 类型（tcp+http 时为 "http"，kcp 时为 "srtp" 等） */
  headerType?: string;
  /** ws/h2/http 的 Host 头 */
  host?: string;
  /** ws/h2 的 path 或 grpc 的 serviceName */
  path?: string;
  /** tls: "" / "tls" / "reality" */
  tls?: VMessSecurity | (string & {});
  sni?: string;
  alpn?: string;
  fingerprint?: string;
  allowInsecure?: boolean;
  udp?: boolean;
}

export class VMess implements Protocol {
  static readonly protocol = "vmess";
  readonly protocol = "vmess";

  server: string;
  port: number;
  uuid: string;
  alterId: number;
  name: string;
  security: VMessCipher | (string & {});
  network: VMessNetwork | (string & {});
  headerType: string;
  host: string;
  path: string;
  tls: VMessSecurity | (string & {});
  sni: string;
  alpn: string;
  fingerprint: string;
  allowInsecure: boolean;
  udp: boolean;

  constructor(init: VMessInit) {
    this.server = init.server;
    this.port = init.port;
    this.uuid = init.uuid;
    this.alterId = init.alterId ?? 0;
    this.name = init.name ?? `${init.server}:${init.port}`;
    this.security = init.security ?? "auto";
    this.network = init.network ?? "tcp";
    this.headerType = init.headerType ?? "none";
    this.host = init.host ?? "";
    this.path = init.path ?? "";
    this.tls = init.tls ?? "";
    this.sni = init.sni ?? "";
    this.alpn = init.alpn ?? "";
    this.fingerprint = init.fingerprint ?? "";
    this.allowInsecure = init.allowInsecure ?? false;
    this.udp = init.udp ?? true;
  }

  // ── statics ────────────────────────────────────────────────────────────────

  static testUrl(url: string): boolean {
    return typeof url === "string" && url.trim().toLowerCase().startsWith("vmess://");
  }

  static testClash(object: object): boolean {
    const o = object as Record<string, unknown>;
    return o.type === "vmess" && typeof o.server === "string" && typeof o.uuid === "string";
  }

  /** 从 clash / mihomo vmess 节点对象构造实例（toClash 的反向操作） */
  static fromClash(object: object): VMess {
    const o = object as Record<string, unknown>;
    const network = typeof o["network"] === "string" ? o["network"] : "tcp";
    const { host, path, headerType } = pickVmessTransportOpts(o, network);
    const alpn = Array.isArray(o["alpn"]) ? (o["alpn"] as unknown[]).map(String).join(",") : "";
    return new VMess({
      server: String(o["server"] ?? ""),
      port: Number(o["port"] ?? 0),
      uuid: String(o["uuid"] ?? ""),
      alterId: Number(o["alterId"] ?? 0),
      name: typeof o["name"] === "string" ? o["name"] : undefined,
      security: typeof o["cipher"] === "string" ? o["cipher"] : "auto",
      network,
      headerType,
      host,
      path,
      tls: o["tls"] === true ? "tls" : "",
      sni: typeof o["servername"] === "string" ? o["servername"] : "",
      alpn,
      fingerprint: typeof o["client-fingerprint"] === "string" ? o["client-fingerprint"] : "",
      allowInsecure: o["skip-cert-verify"] === true,
      udp: typeof o["udp"] === "boolean" ? o["udp"] : undefined,
    });
  }

  /**
   * 解析 vmess:// URI。同时支持：
   *   1. v2rayN：`vmess://base64(JSON)` —— 当前最广泛兼容的形式
   *   2. ShadowRocket：`vmess://base64(method:uuid@server:port)?remarks=...&path=...`
   */
  static formUrl(url: string): VMess {
    if (!VMess.testUrl(url)) throw new Error(`not a vmess url: ${url}`);
    const body = url.trim().slice("vmess://".length);

    // v2rayN：base64 部分内不会出现 `@`，因此可以靠这个特征做初判
    const queryIdx = body.indexOf("?");
    const head = queryIdx >= 0 ? body.slice(0, queryIdx) : body;
    if (!head.includes("@")) {
      const decoded = tryBase64UrlDecode(head);
      if (decoded) {
        try {
          const json = JSON.parse(decoded) as Record<string, unknown>;
          return VMess.fromV2rayNJson(json);
        } catch {
          // 落入 ShadowRocket 分支
        }
      }
    }
    return VMess.fromShadowRocketUrl(body);
  }

  private static fromV2rayNJson(json: Record<string, unknown>): VMess {
    const port = Number.parseInt(String(json["port"] ?? "0"), 10);
    return new VMess({
      server: String(json["add"] ?? ""),
      port,
      uuid: String(json["id"] ?? ""),
      alterId: Number.parseInt(String(json["aid"] ?? "0"), 10) || 0,
      name: String(json["ps"] ?? ""),
      security: String(json["scy"] ?? "auto"),
      network: String(json["net"] ?? "tcp"),
      headerType: String(json["type"] ?? "none"),
      host: String(json["host"] ?? ""),
      path: String(json["path"] ?? ""),
      tls: String(json["tls"] ?? ""),
      sni: String(json["sni"] ?? ""),
      alpn: String(json["alpn"] ?? ""),
      fingerprint: String(json["fp"] ?? ""),
      allowInsecure: json["allowInsecure"] === true || json["allowInsecure"] === "true",
    });
  }

  private static fromShadowRocketUrl(body: string): VMess {
    const hashIdx = body.indexOf("#");
    const beforeHash = hashIdx >= 0 ? body.slice(0, hashIdx) : body;
    const tag = hashIdx >= 0 ? decodeURIComponent(body.slice(hashIdx + 1)) : "";

    const qIdx = beforeHash.indexOf("?");
    const headB64 = qIdx >= 0 ? beforeHash.slice(0, qIdx) : beforeHash;
    const queryStr = qIdx >= 0 ? beforeHash.slice(qIdx + 1) : "";

    const decoded = tryBase64UrlDecode(headB64);
    if (!decoded) throw new Error(`invalid vmess ShadowRocket payload: ${body}`);
    const m = decoded.match(/^(.+?):(.+?)@(.+):(\d+)$/);
    if (!m) throw new Error(`invalid vmess ShadowRocket head: ${decoded}`);
    const [, security, uuid, server, portStr] = m;

    const p = new URLSearchParams(queryStr);
    return new VMess({
      server: server!,
      port: Number.parseInt(portStr!, 10),
      uuid: uuid!,
      security: security!,
      name: tag || p.get("remarks") || "",
      network: p.get("obfs") === "websocket" ? "ws" : (p.get("network") ?? "tcp"),
      path: p.get("path") ?? "",
      host: p.get("obfsParam") ?? p.get("host") ?? "",
      tls: p.get("tls") === "1" ? "tls" : "",
      alterId: Number.parseInt(p.get("alterId") ?? "0", 10) || 0,
    });
  }

  // ── instance ───────────────────────────────────────────────────────────────

  /** 输出 v2rayN base64 JSON 形式（最广泛兼容） */
  toUrl(): string {
    const obj = {
      v: "2",
      ps: this.name,
      add: this.server,
      port: String(this.port),
      id: this.uuid,
      aid: String(this.alterId),
      scy: this.security,
      net: this.network,
      type: this.headerType,
      host: this.host,
      path: this.path,
      tls: this.tls,
      sni: this.sni,
      alpn: this.alpn,
      fp: this.fingerprint,
    };
    return `vmess://${base64UrlEncode(JSON.stringify(obj))}`;
  }

  /** 输出 clash / mihomo vmess 节点对象 */
  toClash(): object {
    const obj: Record<string, unknown> = {
      name: this.name,
      type: "vmess",
      server: this.server,
      port: this.port,
      uuid: this.uuid,
      alterId: this.alterId,
      cipher: this.security || "auto",
      udp: this.udp,
    };
    if (this.tls === "tls" || this.tls === "reality") obj["tls"] = true;
    if (this.sni) obj["servername"] = this.sni;
    if (this.allowInsecure) obj["skip-cert-verify"] = true;
    if (this.fingerprint) obj["client-fingerprint"] = this.fingerprint;
    if (this.network && this.network !== "tcp") obj["network"] = this.network;
    if (this.alpn) obj["alpn"] = splitCsv(this.alpn);

    if (this.network === "ws") {
      const ws: Record<string, unknown> = {};
      if (this.path) ws["path"] = this.path;
      if (this.host) ws["headers"] = { Host: this.host };
      if (Object.keys(ws).length > 0) obj["ws-opts"] = ws;
    } else if (this.network === "h2" || this.network === "http") {
      obj["h2-opts"] = { host: this.host ? [this.host] : [], path: this.path || "/" };
    } else if (this.network === "grpc") {
      obj["grpc-opts"] = { "grpc-service-name": this.path };
    } else if (this.network === "tcp" && this.headerType === "http") {
      obj["http-opts"] = {
        path: this.path ? [this.path] : ["/"],
        headers: this.host ? { Host: [this.host] } : {},
      };
    }
    return obj;
  }

  /** 输出完整的 v2ray outbound 对象 */
  toV2Ray(): object {
    const out: Record<string, unknown> = {
      protocol: "vmess",
      settings: {
        vnext: [
          {
            address: this.server,
            port: this.port,
            users: [
              {
                id: this.uuid,
                alterId: this.alterId,
                security: this.security || "auto",
              },
            ],
          },
        ],
      },
      tag: this.name,
    };
    const stream = this.buildV2RayStreamSettings();
    if (stream) out["streamSettings"] = stream;
    return out;
  }

  private buildV2RayStreamSettings(): object | null {
    const stream: Record<string, unknown> = { network: this.network || "tcp" };

    if (this.tls === "tls" || this.tls === "reality") {
      stream["security"] = this.tls;
      const tls: Record<string, unknown> = {};
      if (this.sni) tls["serverName"] = this.sni;
      if (this.allowInsecure) tls["allowInsecure"] = true;
      if (this.alpn) tls["alpn"] = splitCsv(this.alpn);
      if (this.fingerprint) tls["fingerprint"] = this.fingerprint;
      stream[this.tls === "tls" ? "tlsSettings" : "realitySettings"] = tls;
    }

    if (this.network === "ws") {
      stream["wsSettings"] = {
        path: this.path || "/",
        headers: this.host ? { Host: this.host } : {},
      };
    } else if (this.network === "h2" || this.network === "http") {
      stream["network"] = "http";
      stream["httpSettings"] = { host: this.host ? [this.host] : [], path: this.path || "/" };
    } else if (this.network === "grpc") {
      stream["grpcSettings"] = { serviceName: this.path };
    } else if (this.network === "tcp" && this.headerType === "http") {
      stream["tcpSettings"] = {
        header: {
          type: "http",
          request: {
            version: "1.1",
            method: "GET",
            path: [this.path || "/"],
            headers: this.host ? { Host: [this.host] } : {},
          },
          response: { version: "1.1", status: "200", reason: "OK", headers: {} },
        },
      };
    }

    // 默认 tcp 且无 tls/header 时不必返回 streamSettings
    return Object.keys(stream).length > 1 ? stream : null;
  }

  getServerInfo(): { name: string; ip: string } {
    return { name: this.name, ip: this.server };
  }
}

const splitCsv = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** 从 clash vmess 节点对象中按 network 提取 host/path/headerType */
const pickVmessTransportOpts = (
  o: Record<string, unknown>,
  network: string,
): { host: string; path: string; headerType: string } => {
  let host = "";
  let path = "";
  let headerType = "none";

  if (network === "ws") {
    const ws = (o["ws-opts"] ?? {}) as { path?: string; headers?: Record<string, string> };
    path = ws.path ?? "";
    host = ws.headers?.["Host"] ?? ws.headers?.["host"] ?? "";
  } else if (network === "grpc") {
    const grpc = (o["grpc-opts"] ?? {}) as { "grpc-service-name"?: string };
    path = grpc["grpc-service-name"] ?? "";
  } else if (network === "h2" || network === "http") {
    const h2 = (o["h2-opts"] ?? {}) as { host?: string[]; path?: string };
    host = h2.host?.[0] ?? "";
    path = h2.path ?? "";
  } else if (network === "tcp") {
    const http = (o["http-opts"] ?? {}) as { path?: string[]; headers?: Record<string, string[]> };
    if (http.path || http.headers) {
      headerType = "http";
      path = http.path?.[0] ?? "";
      host = http.headers?.["Host"]?.[0] ?? "";
    }
  }
  return { host, path, headerType };
};

VMess satisfies ProtocolStatic;
