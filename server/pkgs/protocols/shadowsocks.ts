import { base64UrlEncode, tryBase64UrlDecode } from "./base64";
import type { Protocol, ProtocolStatic } from "./types";

// ─── Ciphers ──────────────────────────────────────────────────────────────────
// 列表跟踪自 shadowsocks-org 最新规范：
//   - SIP022（AEAD-2022）：https://shadowsocks.org/doc/sip022.html
//   - AEAD（SIP004）：https://shadowsocks.org/doc/aead.html
//   - 历史 Stream 算法保留，便于解析旧订阅；新部署不建议使用

/** SIP022 AEAD-2022，PSK 必须是定长 base64，密码不再走 EVP_BytesToKey */
export const AEAD2022_CIPHERS = [
  "2022-blake3-aes-128-gcm",
  "2022-blake3-aes-256-gcm",
  "2022-blake3-chacha20-poly1305",
  "2022-blake3-chacha12-poly1305",
  "2022-blake3-chacha8-poly1305",
] as const;

/** SIP004 AEAD（推荐使用） */
export const AEAD_CIPHERS = [
  "aes-128-gcm",
  "aes-192-gcm",
  "aes-256-gcm",
  "chacha20-ietf-poly1305",
  "xchacha20-ietf-poly1305",
] as const;

/** Stream 算法，多数实现已弃用，仅保留以解析旧订阅 */
export const STREAM_CIPHERS = [
  "aes-128-cfb",
  "aes-192-cfb",
  "aes-256-cfb",
  "aes-128-ctr",
  "aes-192-ctr",
  "aes-256-ctr",
  "aes-128-ofb",
  "aes-192-ofb",
  "aes-256-ofb",
  "camellia-128-cfb",
  "camellia-192-cfb",
  "camellia-256-cfb",
  "chacha20",
  "chacha20-ietf",
  "xchacha20",
  "bf-cfb",
  "rc4-md5",
] as const;

/** 无加密模式，常配合 plugin/obfs 使用 */
export const NULL_CIPHERS = ["none", "plain"] as const;

export const SUPPORTED_CIPHERS = [...AEAD2022_CIPHERS, ...AEAD_CIPHERS, ...STREAM_CIPHERS, ...NULL_CIPHERS] as const;

export type Aead2022Cipher = (typeof AEAD2022_CIPHERS)[number];
export type AeadCipher = (typeof AEAD_CIPHERS)[number];
export type StreamCipher = (typeof STREAM_CIPHERS)[number];
export type NullCipher = (typeof NULL_CIPHERS)[number];
export type ShadowsocksCipher = Aead2022Cipher | AeadCipher | StreamCipher | NullCipher;

const SUPPORTED_CIPHER_SET = new Set<string>(SUPPORTED_CIPHERS);

export const isAead2022Cipher = (cipher: string): cipher is Aead2022Cipher =>
  (AEAD2022_CIPHERS as readonly string[]).includes(cipher);

export const isSupportedCipher = (cipher: string): cipher is ShadowsocksCipher => SUPPORTED_CIPHER_SET.has(cipher);

// ─── Plugin options helpers ───────────────────────────────────────────────────
// SIP002 / SIP003 plugin 参数串：`name;k=v;k2=v2`，分隔符和 `=`/`\\` 需用反斜杠转义

export type PluginOptions = Record<string, string>;

const splitWithEscape = (input: string, delimiter: string): string[] => {
  const result: string[] = [];
  let buf = "";
  let escape = false;
  for (const ch of input) {
    if (escape) {
      buf += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === delimiter) {
      result.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  result.push(buf);
  return result;
};

const escapePluginToken = (token: string): string => token.replace(/[\\;=]/g, (m) => `\\${m}`);

/**
 * 解析 SIP002 plugin 字段（已 urlDecode 过），返回 `{ name, opts }`。
 * `obfs-local;obfs=http;obfs-host=example.com` → `{ name: "obfs-local", opts: { obfs: "http", "obfs-host": "example.com" } }`
 */
export const parsePluginString = (raw: string): { name: string; opts: PluginOptions } | null => {
  if (!raw) return null;
  const parts = splitWithEscape(raw, ";").filter((s) => s.length > 0);
  const [name, ...rest] = parts;
  if (!name) return null;
  const opts: PluginOptions = {};
  for (const seg of rest) {
    const [k, ...vs] = splitWithEscape(seg, "=");
    if (!k) continue;
    opts[k] = vs.join("=");
  }
  return { name, opts };
};

export const stringifyPluginString = (name: string, opts: PluginOptions): string => {
  const segs = [escapePluginToken(name)];
  for (const [k, v] of Object.entries(opts)) {
    segs.push(v === "" ? escapePluginToken(k) : `${escapePluginToken(k)}=${escapePluginToken(v)}`);
  }
  return segs.join(";");
};

// ─── Class ────────────────────────────────────────────────────────────────────

export interface ShadowsocksInit {
  server: string;
  port: number;
  password: string;
  /** 加密方式；放宽到 string 以便容忍订阅源出现的新算法，校验时再用 isSupportedCipher 判断 */
  method: ShadowsocksCipher | (string & {});
  name?: string;
  plugin?: string;
  pluginOpts?: PluginOptions;
  udp?: boolean;
}

export class Shadowsocks implements Protocol {
  static readonly protocol = "shadowsocks";
  readonly protocol = "shadowsocks";

  server: string;
  port: number;
  password: string;
  method: ShadowsocksCipher | (string & {});
  name: string;
  plugin?: string;
  pluginOpts: PluginOptions;
  udp: boolean;

  constructor(init: ShadowsocksInit) {
    this.server = init.server;
    this.port = init.port;
    this.password = init.password;
    this.method = init.method;
    this.name = init.name ?? `${init.server}:${init.port}`;
    this.plugin = init.plugin;
    this.pluginOpts = init.pluginOpts ?? {};
    this.udp = init.udp ?? true;
  }

  // ── statics ────────────────────────────────────────────────────────────────

  static testUrl(url: string): boolean {
    return typeof url === "string" && url.trim().toLowerCase().startsWith("ss://");
  }

  static testClash(object: object): boolean {
    const o = object as Record<string, unknown>;
    return (
      o.type === "ss" &&
      typeof o.server === "string" &&
      (typeof o.port === "number" || typeof o.port === "string") &&
      typeof o.password === "string" &&
      typeof o.cipher === "string"
    );
  }

  /** 从 clash / mihomo 节点对象构造实例（toClash 的反向操作） */
  static fromClash(object: object): Shadowsocks {
    const o = object as Record<string, unknown>;
    const rawOpts = o["plugin-opts"];
    let pluginOpts: PluginOptions | undefined;
    if (rawOpts && typeof rawOpts === "object") {
      pluginOpts = {};
      for (const [k, v] of Object.entries(rawOpts as Record<string, unknown>)) {
        if (v !== null && v !== undefined) pluginOpts[k] = String(v);
      }
    }
    return new Shadowsocks({
      server: String(o["server"] ?? ""),
      port: Number(o["port"] ?? 0),
      password: String(o["password"] ?? ""),
      method: String(o["cipher"] ?? ""),
      name: typeof o["name"] === "string" ? o["name"] : undefined,
      udp: typeof o["udp"] === "boolean" ? o["udp"] : undefined,
      plugin: typeof o["plugin"] === "string" ? o["plugin"] : undefined,
      pluginOpts,
    });
  }

  /**
   * 解析 ss:// URI。同时支持：
   *   1. SIP002：`ss://userinfo@host:port[/][?plugin=...][#tag]`
   *      - 非 2022 算法：userinfo = base64url(method:password)
   *      - 2022 算法：userinfo = percent-encoded `method:password`
   *   2. 传统 base64：`ss://base64(method:password@host:port)[#tag]`
   */
  static formUrl(url: string): Shadowsocks {
    if (!Shadowsocks.testUrl(url)) {
      throw new Error(`not a shadowsocks url: ${url}`);
    }

    let rest = url.trim().slice("ss://".length);

    let tag = "";
    const hashIdx = rest.indexOf("#");
    if (hashIdx >= 0) {
      tag = decodeURIComponent(rest.slice(hashIdx + 1));
      rest = rest.slice(0, hashIdx);
    }

    // 规范要求 plugin 存在时 host 与 `?` 之间有 `/`，宽松一点都剥掉
    rest = rest.replace(/\/(\?|$)/, "$1");

    let query = "";
    const qIdx = rest.indexOf("?");
    if (qIdx >= 0) {
      query = rest.slice(qIdx + 1);
      rest = rest.slice(0, qIdx);
    }

    let method: string;
    let password: string;
    let host: string;
    let port: number;

    const atIdx = rest.lastIndexOf("@");
    if (atIdx >= 0) {
      // SIP002 风格
      const userinfoRaw = rest.slice(0, atIdx);
      const hostport = rest.slice(atIdx + 1);
      const lastColon = hostport.lastIndexOf(":");
      if (lastColon < 0) throw new Error(`invalid shadowsocks url (missing port): ${url}`);
      host = hostport.slice(0, lastColon).replace(/^\[/, "").replace(/\]$/, "");
      port = Number.parseInt(hostport.slice(lastColon + 1), 10);

      // 先按 percent-encoded 试一遍（SIP022 必须如此；老版本也能容忍）
      const decoded = decodeURIComponent(userinfoRaw);
      const colon = decoded.indexOf(":");
      if (colon > 0 && isSupportedCipher(decoded.slice(0, colon))) {
        method = decoded.slice(0, colon);
        password = decoded.slice(colon + 1);
      } else {
        const b64 = tryBase64UrlDecode(userinfoRaw);
        if (b64 && b64.includes(":")) {
          const c = b64.indexOf(":");
          method = b64.slice(0, c);
          password = b64.slice(c + 1);
        } else {
          throw new Error(`invalid shadowsocks userinfo: ${userinfoRaw}`);
        }
      }
    } else {
      // 传统 base64 风格：整段是 base64(method:password@host:port)
      const decoded = tryBase64UrlDecode(rest);
      if (!decoded) throw new Error(`invalid shadowsocks legacy url: ${url}`);
      const match = decoded.match(/^(.+?):(.+)@(.+):(\d+)$/);
      if (!match) throw new Error(`invalid shadowsocks legacy payload: ${decoded}`);
      method = match[1]!;
      password = match[2]!;
      host = match[3]!.replace(/^\[/, "").replace(/\]$/, "");
      port = Number.parseInt(match[4]!, 10);
    }

    if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) {
      throw new Error(`invalid shadowsocks host/port: ${host}:${port}`);
    }
    if (!method || !password) {
      throw new Error(`invalid shadowsocks credentials in url: ${url}`);
    }

    let plugin: string | undefined;
    let pluginOpts: PluginOptions = {};
    if (query) {
      const params = new URLSearchParams(query);
      const raw = params.get("plugin");
      if (raw) {
        const parsed = parsePluginString(raw);
        if (parsed) {
          plugin = parsed.name;
          pluginOpts = parsed.opts;
        }
      }
    }

    return new Shadowsocks({
      server: host,
      port,
      password,
      method,
      name: tag || `${host}:${port}`,
      plugin,
      pluginOpts,
    });
  }

  // ── instance ───────────────────────────────────────────────────────────────

  toUrl(): string {
    const host = this.server.includes(":") ? `[${this.server}]` : this.server;
    let userinfo: string;
    if (isAead2022Cipher(this.method)) {
      // SIP022 强制要求明文 method:password 并 percent-encode
      userinfo = `${encodeURIComponent(this.method)}:${encodeURIComponent(this.password)}`;
    } else {
      userinfo = base64UrlEncode(`${this.method}:${this.password}`);
    }

    let url = `ss://${userinfo}@${host}:${this.port}`;
    if (this.plugin) {
      const pluginStr = stringifyPluginString(this.plugin, this.pluginOpts);
      url += `/?plugin=${encodeURIComponent(pluginStr)}`;
    }
    if (this.name) {
      url += `#${encodeURIComponent(this.name)}`;
    }
    return url;
  }

  /**
   * 输出 clash / mihomo 节点对象（参考 ClashProxy.Shadowsocks 形状）。
   *   - obfs-local / simple-obfs → plugin="obfs"
   *   - v2ray-plugin → plugin="v2ray-plugin"
   *   - 其他 plugin 原样透传（如 shadow-tls）
   */
  toClash(): object {
    const base = {
      name: this.name,
      type: "ss",
      server: this.server,
      port: this.port,
      cipher: this.method,
      password: this.password,
      udp: this.udp,
    };

    if (!this.plugin) return base;

    if (this.plugin === "obfs-local" || this.plugin === "simple-obfs" || this.plugin === "obfs") {
      const mode = this.pluginOpts["obfs"] ?? this.pluginOpts["mode"] ?? "http";
      const host = this.pluginOpts["obfs-host"] ?? this.pluginOpts["host"] ?? "";
      return {
        ...base,
        plugin: "obfs",
        "plugin-opts": { mode, host },
      };
    }

    if (this.plugin === "v2ray-plugin") {
      const opts: Record<string, unknown> = {
        mode: this.pluginOpts["mode"] || "websocket",
      };
      if (this.pluginOpts["tls"] === "true" || this.pluginOpts["tls"] === "") opts["tls"] = true;
      if (this.pluginOpts["skip-cert-verify"] === "true") opts["skip-cert-verify"] = true;
      if (this.pluginOpts["host"]) opts["host"] = this.pluginOpts["host"];
      if (this.pluginOpts["path"]) opts["path"] = this.pluginOpts["path"];
      if (this.pluginOpts["mux"] === "true") opts["mux"] = true;
      return {
        ...base,
        plugin: "v2ray-plugin",
        "plugin-opts": opts,
      };
    }

    return {
      ...base,
      plugin: this.plugin,
      "plugin-opts": { ...this.pluginOpts },
    };
  }

  /**
   * 输出完整的 V2Ray outbound 对象（含 streamSettings）。
   *
   * V2Ray/Xray 的 shadowsocks 协议**不识别 SIP003 `plugin` 字段**——
   * 不会启动 obfs-local / v2ray-plugin 外部进程。但若 plugin 是
   * simple-obfs 或 v2ray-plugin，可以通过 streamSettings 表达等价的
   * 传输层封装（v2fly 官方推荐的迁移路径）：
   *   - simple-obfs(http) → tcpSettings.header.type="http"
   *   - v2ray-plugin(ws)  → network="ws"，可选 security="tls"
   * 其他 plugin（如 shadow-tls）没有原生映射，会被忽略。
   */
  toV2Ray(): object {
    const out: Record<string, unknown> = {
      protocol: "shadowsocks",
      settings: {
        servers: [
          {
            address: this.server,
            port: this.port,
            method: this.method,
            password: this.password,
          },
        ],
      },
      tag: this.name,
    };

    const streamSettings = this.buildV2RayStreamSettings();
    if (streamSettings) out["streamSettings"] = streamSettings;

    return out;
  }

  /** 把 SIP003 plugin 映射成 V2Ray streamSettings；无法表达时返回 null */
  private buildV2RayStreamSettings(): object | null {
    if (!this.plugin) return null;

    if (this.plugin === "obfs-local" || this.plugin === "simple-obfs" || this.plugin === "obfs") {
      const mode = this.pluginOpts["obfs"] ?? this.pluginOpts["mode"] ?? "http";
      if (mode !== "http") return null;
      const host = this.pluginOpts["obfs-host"] ?? this.pluginOpts["host"];
      return {
        network: "tcp",
        tcpSettings: {
          header: {
            type: "http",
            request: {
              version: "1.1",
              method: "GET",
              path: ["/"],
              headers: host ? { Host: [host] } : {},
            },
            response: { version: "1.1", status: "200", reason: "OK", headers: {} },
          },
        },
      };
    }

    if (this.plugin === "v2ray-plugin") {
      const mode = this.pluginOpts["mode"] || "websocket";
      if (mode !== "websocket") return null;
      const stream: Record<string, unknown> = {
        network: "ws",
        wsSettings: {
          path: this.pluginOpts["path"] || "/",
          headers: this.pluginOpts["host"] ? { Host: this.pluginOpts["host"] } : {},
        },
      };
      if (this.pluginOpts["tls"] === "true" || this.pluginOpts["tls"] === "") {
        stream["security"] = "tls";
        stream["tlsSettings"] = {
          serverName: this.pluginOpts["host"] || this.server,
          allowInsecure: this.pluginOpts["skip-cert-verify"] === "true",
        };
      }
      return stream;
    }

    return null;
  }

  getServerInfo(): { name: string; ip: string } {
    return { name: this.name, ip: this.server };
  }
}

Shadowsocks satisfies ProtocolStatic;
