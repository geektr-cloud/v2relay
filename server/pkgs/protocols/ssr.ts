import { base64UrlEncode, tryBase64UrlDecode } from "./base64";
import type { Protocol, ProtocolStatic } from "./types";

// ─── 常量定义 ─────────────────────────────────────────────────────────────────
// 参考 ShadowsocksR-Live wiki：https://github.com/ShadowsocksR-Live/shadowsocksr-native/wiki/QR-code-scheme

/** SSR 协议插件（套在 SS 流之上的扩展协议层） */
export const SSR_PROTOCOLS = [
  "origin",
  "verify_sha1",
  "auth_sha1_v4",
  "auth_aes128_md5",
  "auth_aes128_sha1",
  "auth_chain_a",
  "auth_chain_b",
  "auth_chain_c",
  "auth_chain_d",
  "auth_chain_e",
  "auth_chain_f",
] as const;
export type SSRProtocolPlugin = (typeof SSR_PROTOCOLS)[number];

/** SSR 混淆插件 */
export const SSR_OBFS = [
  "plain",
  "http_simple",
  "http_post",
  "random_head",
  "tls1.2_ticket_auth",
  "tls1.2_ticket_fastauth",
] as const;
export type SSRObfs = (typeof SSR_OBFS)[number];

/** SSR 支持的加密算法（大部分是 Stream 算法，原生 AEAD 没有正式纳入 SSR 体系） */
export const SSR_CIPHERS = [
  "none",
  "table",
  "rc4",
  "rc4-md5",
  "rc4-md5-6",
  "aes-128-cfb",
  "aes-192-cfb",
  "aes-256-cfb",
  "aes-128-ctr",
  "aes-192-ctr",
  "aes-256-ctr",
  "aes-128-ofb",
  "aes-192-ofb",
  "aes-256-ofb",
  "bf-cfb",
  "camellia-128-cfb",
  "camellia-192-cfb",
  "camellia-256-cfb",
  "cast5-cfb",
  "des-cfb",
  "idea-cfb",
  "rc2-cfb",
  "seed-cfb",
  "salsa20",
  "chacha20",
  "chacha20-ietf",
] as const;
export type SSRCipher = (typeof SSR_CIPHERS)[number];

// ─── Class ────────────────────────────────────────────────────────────────────

export interface ShadowsocksRInit {
  server: string;
  port: number;
  /** SSR 协议插件（origin / auth_aes128_md5 / auth_chain_a 等） */
  ssrProtocol: SSRProtocolPlugin | (string & {});
  /** 加密算法 */
  method: SSRCipher | (string & {});
  /** 混淆插件 */
  obfs: SSRObfs | (string & {});
  password: string;
  obfsParam?: string;
  protoParam?: string;
  name?: string;
  group?: string;
  udp?: boolean;
}

export class ShadowsocksR implements Protocol {
  static readonly protocol = "shadowsocksr";
  readonly protocol = "shadowsocksr";

  server: string;
  port: number;
  /** 这里不能叫 `protocol`，与外层协议族名冲突 */
  ssrProtocol: SSRProtocolPlugin | (string & {});
  method: SSRCipher | (string & {});
  obfs: SSRObfs | (string & {});
  password: string;
  obfsParam: string;
  protoParam: string;
  name: string;
  group: string;
  udp: boolean;

  constructor(init: ShadowsocksRInit) {
    this.server = init.server;
    this.port = init.port;
    this.ssrProtocol = init.ssrProtocol;
    this.method = init.method;
    this.obfs = init.obfs;
    this.password = init.password;
    this.obfsParam = init.obfsParam ?? "";
    this.protoParam = init.protoParam ?? "";
    this.name = init.name ?? `${init.server}:${init.port}`;
    this.group = init.group ?? "";
    this.udp = init.udp ?? true;
  }

  // ── statics ────────────────────────────────────────────────────────────────

  static testUrl(url: string): boolean {
    return typeof url === "string" && url.trim().toLowerCase().startsWith("ssr://");
  }

  static testClash(object: object): boolean {
    const o = object as Record<string, unknown>;
    return o.type === "ssr" && typeof o.server === "string" && typeof o.password === "string";
  }

  /** 从 clash / mihomo 节点对象构造实例（toClash 的反向操作） */
  static fromClash(object: object): ShadowsocksR {
    const o = object as Record<string, unknown>;
    return new ShadowsocksR({
      server: String(o["server"] ?? ""),
      port: Number(o["port"] ?? 0),
      password: String(o["password"] ?? ""),
      method: String(o["cipher"] ?? ""),
      obfs: String(o["obfs"] ?? "plain"),
      ssrProtocol: String(o["protocol"] ?? "origin"),
      obfsParam: typeof o["obfs-param"] === "string" ? o["obfs-param"] : undefined,
      protoParam: typeof o["protocol-param"] === "string" ? o["protocol-param"] : undefined,
      name: typeof o["name"] === "string" ? o["name"] : undefined,
      group: typeof o["group"] === "string" ? o["group"] : undefined,
      udp: typeof o["udp"] === "boolean" ? o["udp"] : undefined,
    });
  }

  /**
   * 解析 `ssr://base64url(host:port:protocol:method:obfs:base64url(password)[/?obfsparam=...&protoparam=...&remarks=...&group=...])`
   */
  static formUrl(url: string): ShadowsocksR {
    if (!ShadowsocksR.testUrl(url)) throw new Error(`not a ssr url: ${url}`);
    const decoded = tryBase64UrlDecode(url.trim().slice("ssr://".length));
    if (!decoded) throw new Error(`invalid ssr url: ${url}`);

    const splitIdx = decoded.indexOf("/?");
    const head = splitIdx >= 0 ? decoded.slice(0, splitIdx) : decoded;
    const paramStr = splitIdx >= 0 ? decoded.slice(splitIdx + 2) : "";

    const segs = head.split(":");
    if (segs.length !== 6) throw new Error(`invalid ssr head (expect 6 segments): ${head}`);
    const [server, portStr, ssrProtocol, method, obfs, passwordB64] = segs;
    const port = Number.parseInt(portStr!, 10);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      throw new Error(`invalid ssr port: ${portStr}`);
    }
    const password = tryBase64UrlDecode(passwordB64!) ?? "";

    const params = new URLSearchParams(paramStr);
    const decodeParam = (key: string): string => {
      const v = params.get(key);
      return v ? (tryBase64UrlDecode(v) ?? "") : "";
    };

    const name = decodeParam("remarks") || `${server}:${port}`;
    return new ShadowsocksR({
      server: server!,
      port,
      ssrProtocol: ssrProtocol!,
      method: method!,
      obfs: obfs!,
      password,
      obfsParam: decodeParam("obfsparam"),
      protoParam: decodeParam("protoparam"),
      name,
      group: decodeParam("group"),
    });
  }

  // ── instance ───────────────────────────────────────────────────────────────

  toUrl(): string {
    const head = [
      this.server,
      this.port,
      this.ssrProtocol,
      this.method,
      this.obfs,
      base64UrlEncode(this.password),
    ].join(":");

    const params = new URLSearchParams();
    if (this.obfsParam) params.set("obfsparam", base64UrlEncode(this.obfsParam));
    if (this.protoParam) params.set("protoparam", base64UrlEncode(this.protoParam));
    if (this.name) params.set("remarks", base64UrlEncode(this.name));
    if (this.group) params.set("group", base64UrlEncode(this.group));

    const qs = params.toString();
    const payload = `${head}${qs ? `/?${qs}` : ""}`;
    return `ssr://${base64UrlEncode(payload)}`;
  }

  toClash(): object {
    const obj: Record<string, unknown> = {
      name: this.name,
      type: "ssr",
      server: this.server,
      port: this.port,
      cipher: this.method,
      password: this.password,
      obfs: this.obfs,
      protocol: this.ssrProtocol,
      udp: this.udp,
    };
    if (this.obfsParam) obj["obfs-param"] = this.obfsParam;
    if (this.protoParam) obj["protocol-param"] = this.protoParam;
    return obj;
  }

  /** V2Ray / Xray 内核不实现 SSR 协议，没法表达，返回 null */
  toV2Ray(): object | null {
    return null;
  }

  getServerInfo(): { name: string; ip: string } {
    return { name: this.name, ip: this.server };
  }
}

ShadowsocksR satisfies ProtocolStatic;
