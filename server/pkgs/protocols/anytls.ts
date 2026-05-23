import type { Protocol, ProtocolStatic } from "./types";

// 参考 anytls-go URI 规范：https://github.com/anytls/anytls-go/blob/main/docs/uri_scheme.md
// 形如：anytls://[auth@]hostname[:port]/?sni=...&insecure=0#name
// 默认端口 443；anytls-go URI 仅规定 sni / insecure，mihomo 节点对象额外支持
// alpn / client-fingerprint / skip-cert-verify / udp 等。

export interface AnyTlsInit {
  server: string;
  /** 默认 443 */
  port?: number;
  password: string;
  name?: string;
  sni?: string;
  /** 是否允许不安全 TLS（跳过证书校验） */
  insecure?: boolean;
  /** 逗号分隔，如 "h2,http/1.1" */
  alpn?: string;
  /** uTLS 指纹（chrome / firefox / safari / ...） */
  fingerprint?: string;
  udp?: boolean;
}

export class AnyTls implements Protocol {
  static readonly protocol = "anytls";
  readonly protocol = "anytls";

  server: string;
  port: number;
  password: string;
  name: string;
  sni: string;
  insecure: boolean;
  alpn: string;
  fingerprint: string;
  udp: boolean;

  constructor(init: AnyTlsInit) {
    this.server = init.server;
    this.port = init.port ?? 443;
    this.password = init.password;
    this.name = init.name ?? `${init.server}:${this.port}`;
    this.sni = init.sni ?? "";
    this.insecure = init.insecure ?? false;
    this.alpn = init.alpn ?? "";
    this.fingerprint = init.fingerprint ?? "";
    this.udp = init.udp ?? true;
  }

  // ── statics ────────────────────────────────────────────────────────────────

  static testUrl(url: string): boolean {
    return typeof url === "string" && url.trim().toLowerCase().startsWith("anytls://");
  }

  static testClash(object: object): boolean {
    const o = object as Record<string, unknown>;
    return o.type === "anytls" && typeof o.server === "string" && typeof o.password === "string";
  }

  /** 从 clash / mihomo anytls 节点对象构造实例（toClash 的反向操作） */
  static fromClash(object: object): AnyTls {
    const o = object as Record<string, unknown>;
    const alpn = Array.isArray(o["alpn"]) ? (o["alpn"] as unknown[]).map(String).join(",") : "";
    return new AnyTls({
      server: String(o["server"] ?? ""),
      port: typeof o["port"] === "number" ? o["port"] : Number(o["port"] ?? 443),
      password: String(o["password"] ?? ""),
      name: typeof o["name"] === "string" ? o["name"] : undefined,
      sni: typeof o["sni"] === "string" ? o["sni"] : "",
      insecure: o["skip-cert-verify"] === true,
      alpn,
      fingerprint: typeof o["client-fingerprint"] === "string" ? o["client-fingerprint"] : "",
      udp: typeof o["udp"] === "boolean" ? o["udp"] : undefined,
    });
  }

  /**
   * 解析 `anytls://password@host[:port][/?sni=...&insecure=...][#name]`
   * password 部分按 percent-encoding 处理；host 缺端口时默认 443。
   */
  static formUrl(url: string): AnyTls {
    if (!AnyTls.testUrl(url)) throw new Error(`not an anytls url: ${url}`);
    let rest = url.trim().slice("anytls://".length);

    let tag = "";
    const hashIdx = rest.indexOf("#");
    if (hashIdx >= 0) {
      tag = decodeURIComponent(rest.slice(hashIdx + 1));
      rest = rest.slice(0, hashIdx);
    }

    let queryStr = "";
    const qIdx = rest.indexOf("?");
    if (qIdx >= 0) {
      queryStr = rest.slice(qIdx + 1);
      rest = rest.slice(0, qIdx);
    }
    rest = rest.replace(/\/$/, "");

    const atIdx = rest.lastIndexOf("@");
    if (atIdx < 0) throw new Error(`invalid anytls url (missing password): ${url}`);
    const password = decodeURIComponent(rest.slice(0, atIdx));
    const hostport = rest.slice(atIdx + 1);

    const { host, port } = splitHostPort(hostport, 443);
    if (!host) throw new Error(`invalid anytls host: ${hostport}`);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      throw new Error(`invalid anytls port: ${hostport}`);
    }

    const p = new URLSearchParams(queryStr);
    return new AnyTls({
      server: host,
      port,
      password,
      name: tag || `${host}:${port}`,
      sni: p.get("sni") ?? "",
      insecure: p.get("insecure") === "1",
    });
  }

  // ── instance ───────────────────────────────────────────────────────────────

  toUrl(): string {
    const host = this.server.includes(":") ? `[${this.server}]` : this.server;
    const params = new URLSearchParams();
    if (this.sni) params.set("sni", this.sni);
    if (this.insecure) params.set("insecure", "1");
    const qs = params.toString();
    const frag = this.name ? `#${encodeURIComponent(this.name)}` : "";
    return `anytls://${encodeURIComponent(this.password)}@${host}:${this.port}${qs ? `/?${qs}` : ""}${frag}`;
  }

  /** mihomo `type: anytls` 节点形状 */
  toClash(): object {
    const obj: Record<string, unknown> = {
      name: this.name,
      type: "anytls",
      server: this.server,
      port: this.port,
      password: this.password,
      udp: this.udp,
    };
    if (this.sni) obj["sni"] = this.sni;
    if (this.insecure) obj["skip-cert-verify"] = true;
    if (this.fingerprint) obj["client-fingerprint"] = this.fingerprint;
    if (this.alpn) obj["alpn"] = splitCsv(this.alpn);
    return obj;
  }

  /** V2Ray / Xray 不支持 AnyTLS，sing-box / mihomo 才有实现，返回 null */
  toV2Ray(): object | null {
    return null;
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

const splitHostPort = (hostport: string, defaultPort: number): { host: string; port: number } => {
  if (hostport.startsWith("[")) {
    const close = hostport.indexOf("]");
    if (close < 0) return { host: hostport, port: defaultPort };
    const host = hostport.slice(1, close);
    const rest = hostport.slice(close + 1);
    if (rest.startsWith(":")) {
      return { host, port: Number.parseInt(rest.slice(1), 10) };
    }
    return { host, port: defaultPort };
  }
  const lastColon = hostport.lastIndexOf(":");
  if (lastColon < 0) return { host: hostport, port: defaultPort };
  return {
    host: hostport.slice(0, lastColon),
    port: Number.parseInt(hostport.slice(lastColon + 1), 10),
  };
};

AnyTls satisfies ProtocolStatic;
