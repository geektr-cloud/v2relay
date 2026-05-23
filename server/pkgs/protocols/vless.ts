import type { Protocol, ProtocolStatic } from "./types";

// ─── 常量定义 ─────────────────────────────────────────────────────────────────

/** VLESS 流控（XTLS） */
export const VLESS_FLOWS = ["", "xtls-rprx-vision", "xtls-rprx-vision-udp443"] as const;
export type VLessFlow = (typeof VLESS_FLOWS)[number];

/** VLESS 传输层 */
export const VLESS_NETWORKS = ["tcp", "ws", "h2", "http", "grpc", "kcp", "quic", "httpupgrade", "xhttp"] as const;
export type VLessNetwork = (typeof VLESS_NETWORKS)[number];

/** TLS 层。VLESS 协议本身 encryption=none，传输安全由这里负责 */
export const VLESS_SECURITIES = ["", "none", "tls", "reality"] as const;
export type VLessSecurity = (typeof VLESS_SECURITIES)[number];

// ─── Class ────────────────────────────────────────────────────────────────────

export interface VLessInit {
  server: string;
  port: number;
  uuid: string;
  name?: string;
  /** encryption：VLESS 协议层加密，默认 "none"（传输安全由 security 负责） */
  encryption?: string;
  flow?: VLessFlow | (string & {});
  security?: VLessSecurity | (string & {});
  sni?: string;
  /** uTLS fingerprint */
  fingerprint?: string;
  alpn?: string;
  /** REALITY public key */
  publicKey?: string;
  /** REALITY short id */
  shortId?: string;
  /** REALITY spider X */
  spiderX?: string;
  network?: VLessNetwork | (string & {});
  /** type / headerType（tcp+http 时为 "http"） */
  headerType?: string;
  host?: string;
  path?: string;
  /** grpc serviceName */
  serviceName?: string;
  /** grpc mode: gun / multi */
  mode?: string;
  allowInsecure?: boolean;
  udp?: boolean;
}

export class VLess implements Protocol {
  static readonly protocol = "vless";
  readonly protocol = "vless";

  server: string;
  port: number;
  uuid: string;
  name: string;
  encryption: string;
  flow: VLessFlow | (string & {});
  security: VLessSecurity | (string & {});
  sni: string;
  fingerprint: string;
  alpn: string;
  publicKey: string;
  shortId: string;
  spiderX: string;
  network: VLessNetwork | (string & {});
  headerType: string;
  host: string;
  path: string;
  serviceName: string;
  mode: string;
  allowInsecure: boolean;
  udp: boolean;

  constructor(init: VLessInit) {
    this.server = init.server;
    this.port = init.port;
    this.uuid = init.uuid;
    this.name = init.name ?? `${init.server}:${init.port}`;
    this.encryption = init.encryption ?? "none";
    this.flow = init.flow ?? "";
    this.security = init.security ?? "";
    this.sni = init.sni ?? "";
    this.fingerprint = init.fingerprint ?? "";
    this.alpn = init.alpn ?? "";
    this.publicKey = init.publicKey ?? "";
    this.shortId = init.shortId ?? "";
    this.spiderX = init.spiderX ?? "";
    this.network = init.network ?? "tcp";
    this.headerType = init.headerType ?? "none";
    this.host = init.host ?? "";
    this.path = init.path ?? "";
    this.serviceName = init.serviceName ?? "";
    this.mode = init.mode ?? "";
    this.allowInsecure = init.allowInsecure ?? false;
    this.udp = init.udp ?? true;
  }

  // ── statics ────────────────────────────────────────────────────────────────

  static testUrl(url: string): boolean {
    return typeof url === "string" && url.trim().toLowerCase().startsWith("vless://");
  }

  static testClash(object: object): boolean {
    const o = object as Record<string, unknown>;
    return o.type === "vless" && typeof o.server === "string" && typeof o.uuid === "string";
  }

  /** 从 clash / mihomo vless 节点对象构造实例（toClash 的反向操作） */
  static fromClash(object: object): VLess {
    const o = object as Record<string, unknown>;
    const network = typeof o["network"] === "string" ? o["network"] : "tcp";
    const reality = o["reality-opts"] as { "public-key"?: string; "short-id"?: string; spx?: string } | undefined;
    const security = reality ? "reality" : o["tls"] === true ? "tls" : "";
    const { host, path, serviceName } = pickVlessTransportOpts(o, network);
    const alpn = Array.isArray(o["alpn"]) ? (o["alpn"] as unknown[]).map(String).join(",") : "";
    return new VLess({
      server: String(o["server"] ?? ""),
      port: Number(o["port"] ?? 0),
      uuid: String(o["uuid"] ?? ""),
      name: typeof o["name"] === "string" ? o["name"] : undefined,
      flow: typeof o["flow"] === "string" ? o["flow"] : "",
      security,
      sni: typeof o["servername"] === "string" ? o["servername"] : "",
      fingerprint: typeof o["client-fingerprint"] === "string" ? o["client-fingerprint"] : "",
      alpn,
      publicKey: reality?.["public-key"] ?? "",
      shortId: reality?.["short-id"] ?? "",
      spiderX: reality?.spx ?? "",
      network,
      host,
      path,
      serviceName,
      allowInsecure: o["skip-cert-verify"] === true,
      udp: typeof o["udp"] === "boolean" ? o["udp"] : undefined,
    });
  }

  /**
   * 解析 vless URI：`vless://uuid@host:port[/]?type=...&security=...&...#name`
   */
  static formUrl(url: string): VLess {
    if (!VLess.testUrl(url)) throw new Error(`not a vless url: ${url}`);
    let rest = url.trim().slice("vless://".length);

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
    if (atIdx < 0) throw new Error(`invalid vless url (missing userinfo): ${url}`);
    const uuid = decodeURIComponent(rest.slice(0, atIdx));
    const hostport = rest.slice(atIdx + 1);

    const { host, port } = splitHostPort(hostport, 443);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      throw new Error(`invalid vless port: ${hostport}`);
    }

    const p = new URLSearchParams(queryStr);
    return new VLess({
      server: host,
      port,
      uuid,
      name: tag || `${host}:${port}`,
      encryption: p.get("encryption") ?? "none",
      flow: p.get("flow") ?? "",
      security: p.get("security") ?? "",
      sni: p.get("sni") ?? p.get("peer") ?? "",
      fingerprint: p.get("fp") ?? "",
      alpn: p.get("alpn") ?? "",
      publicKey: p.get("pbk") ?? "",
      shortId: p.get("sid") ?? "",
      spiderX: p.get("spx") ?? "",
      network: p.get("type") ?? "tcp",
      headerType: p.get("headerType") ?? "none",
      host: p.get("host") ?? "",
      path: p.get("path") ?? "",
      serviceName: p.get("serviceName") ?? "",
      mode: p.get("mode") ?? "",
      allowInsecure: p.get("allowInsecure") === "1",
    });
  }

  // ── instance ───────────────────────────────────────────────────────────────

  toUrl(): string {
    const host = this.server.includes(":") ? `[${this.server}]` : this.server;
    const params = new URLSearchParams();
    if (this.encryption) params.set("encryption", this.encryption);
    if (this.flow) params.set("flow", this.flow);
    if (this.security) params.set("security", this.security);
    if (this.sni) params.set("sni", this.sni);
    if (this.fingerprint) params.set("fp", this.fingerprint);
    if (this.alpn) params.set("alpn", this.alpn);
    if (this.publicKey) params.set("pbk", this.publicKey);
    if (this.shortId) params.set("sid", this.shortId);
    if (this.spiderX) params.set("spx", this.spiderX);
    if (this.network) params.set("type", this.network);
    if (this.headerType && this.headerType !== "none") params.set("headerType", this.headerType);
    if (this.host) params.set("host", this.host);
    if (this.path) params.set("path", this.path);
    if (this.serviceName) params.set("serviceName", this.serviceName);
    if (this.mode) params.set("mode", this.mode);
    if (this.allowInsecure) params.set("allowInsecure", "1");

    const qs = params.toString();
    const frag = this.name ? `#${encodeURIComponent(this.name)}` : "";
    return `vless://${encodeURIComponent(this.uuid)}@${host}:${this.port}${qs ? `?${qs}` : ""}${frag}`;
  }

  toClash(): object {
    const obj: Record<string, unknown> = {
      name: this.name,
      type: "vless",
      server: this.server,
      port: this.port,
      uuid: this.uuid,
      udp: this.udp,
    };
    if (this.flow) obj["flow"] = this.flow;
    if (this.security === "tls" || this.security === "reality") obj["tls"] = true;
    if (this.sni) obj["servername"] = this.sni;
    if (this.fingerprint) obj["client-fingerprint"] = this.fingerprint;
    if (this.allowInsecure) obj["skip-cert-verify"] = true;
    if (this.network && this.network !== "tcp") obj["network"] = this.network;
    if (this.alpn) obj["alpn"] = splitCsv(this.alpn);

    if (this.security === "reality") {
      const reality: Record<string, unknown> = {};
      if (this.publicKey) reality["public-key"] = this.publicKey;
      if (this.shortId) reality["short-id"] = this.shortId;
      obj["reality-opts"] = reality;
    }

    if (this.network === "ws") {
      const ws: Record<string, unknown> = {};
      if (this.path) ws["path"] = this.path;
      if (this.host) ws["headers"] = { Host: this.host };
      if (Object.keys(ws).length > 0) obj["ws-opts"] = ws;
    } else if (this.network === "grpc") {
      obj["grpc-opts"] = { "grpc-service-name": this.serviceName || this.path };
    } else if (this.network === "h2" || this.network === "http") {
      obj["h2-opts"] = { host: this.host ? [this.host] : [], path: this.path || "/" };
    }
    return obj;
  }

  toV2Ray(): object {
    const user: Record<string, unknown> = {
      id: this.uuid,
      encryption: this.encryption || "none",
    };
    if (this.flow) user["flow"] = this.flow;

    const out: Record<string, unknown> = {
      protocol: "vless",
      settings: {
        vnext: [
          {
            address: this.server,
            port: this.port,
            users: [user],
          },
        ],
      },
      tag: this.name,
    };
    out["streamSettings"] = this.buildV2RayStreamSettings();
    return out;
  }

  private buildV2RayStreamSettings(): object {
    const stream: Record<string, unknown> = { network: this.network || "tcp" };
    if (this.security) stream["security"] = this.security;

    if (this.security === "tls") {
      const tls: Record<string, unknown> = {};
      if (this.sni) tls["serverName"] = this.sni;
      if (this.fingerprint) tls["fingerprint"] = this.fingerprint;
      if (this.alpn) tls["alpn"] = splitCsv(this.alpn);
      if (this.allowInsecure) tls["allowInsecure"] = true;
      stream["tlsSettings"] = tls;
    } else if (this.security === "reality") {
      stream["realitySettings"] = {
        serverName: this.sni,
        fingerprint: this.fingerprint || "chrome",
        publicKey: this.publicKey,
        shortId: this.shortId,
        spiderX: this.spiderX,
      };
    }

    if (this.network === "ws") {
      stream["wsSettings"] = {
        path: this.path || "/",
        headers: this.host ? { Host: this.host } : {},
      };
    } else if (this.network === "grpc") {
      stream["grpcSettings"] = {
        serviceName: this.serviceName || this.path,
        multiMode: this.mode === "multi",
      };
    } else if (this.network === "h2" || this.network === "http") {
      stream["network"] = "http";
      stream["httpSettings"] = { host: this.host ? [this.host] : [], path: this.path || "/" };
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

    return stream;
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

/** 从 clash vless 节点对象中按 network 提取 host/path/serviceName */
const pickVlessTransportOpts = (
  o: Record<string, unknown>,
  network: string,
): { host: string; path: string; serviceName: string } => {
  let host = "";
  let path = "";
  let serviceName = "";

  if (network === "ws") {
    const ws = (o["ws-opts"] ?? {}) as { path?: string; headers?: Record<string, string> };
    path = ws.path ?? "";
    host = ws.headers?.["Host"] ?? ws.headers?.["host"] ?? "";
  } else if (network === "grpc") {
    const grpc = (o["grpc-opts"] ?? {}) as { "grpc-service-name"?: string };
    serviceName = grpc["grpc-service-name"] ?? "";
  } else if (network === "h2" || network === "http") {
    const h2 = (o["h2-opts"] ?? {}) as { host?: string[]; path?: string };
    host = h2.host?.[0] ?? "";
    path = h2.path ?? "";
  }
  return { host, path, serviceName };
};

const splitHostPort = (hostport: string, defaultPort: number): { host: string; port: number } => {
  // 处理 IPv6 [::]:443 / [::] 形式
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

VLess satisfies ProtocolStatic;
