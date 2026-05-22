import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64";
import {
  AEAD2022_CIPHERS,
  AEAD_CIPHERS,
  isAead2022Cipher,
  isSupportedCipher,
  parsePluginString,
  Shadowsocks,
  STREAM_CIPHERS,
  stringifyPluginString,
} from "./shadowsocks";

describe("Shadowsocks ciphers", () => {
  it("includes SIP022 AEAD-2022 ciphers", () => {
    expect(AEAD2022_CIPHERS).toContain("2022-blake3-aes-256-gcm");
    expect(AEAD2022_CIPHERS).toContain("2022-blake3-chacha20-poly1305");
  });

  it("includes SIP004 AEAD ciphers", () => {
    expect(AEAD_CIPHERS).toContain("aes-256-gcm");
    expect(AEAD_CIPHERS).toContain("chacha20-ietf-poly1305");
  });

  it("includes deprecated stream ciphers for backward compat", () => {
    expect(STREAM_CIPHERS).toContain("aes-256-cfb");
    expect(STREAM_CIPHERS).toContain("rc4-md5");
  });

  it("isAead2022Cipher distinguishes 2022 from legacy", () => {
    expect(isAead2022Cipher("2022-blake3-aes-256-gcm")).toBe(true);
    expect(isAead2022Cipher("aes-256-gcm")).toBe(false);
    expect(isAead2022Cipher("rc4-md5")).toBe(false);
  });

  it("isSupportedCipher recognizes all groups", () => {
    expect(isSupportedCipher("aes-256-gcm")).toBe(true);
    expect(isSupportedCipher("2022-blake3-aes-128-gcm")).toBe(true);
    expect(isSupportedCipher("none")).toBe(true);
    expect(isSupportedCipher("not-a-real-cipher")).toBe(false);
  });
});

describe("Shadowsocks plugin string parsing", () => {
  it("parses obfs-local plugin string", () => {
    const parsed = parsePluginString("obfs-local;obfs=http;obfs-host=example.com");
    expect(parsed).toEqual({
      name: "obfs-local",
      opts: { obfs: "http", "obfs-host": "example.com" },
    });
  });

  it("parses v2ray-plugin with tls flag (no value)", () => {
    const parsed = parsePluginString("v2ray-plugin;mode=websocket;tls;host=example.com;path=/ws");
    expect(parsed?.name).toBe("v2ray-plugin");
    expect(parsed?.opts).toMatchObject({
      mode: "websocket",
      tls: "",
      host: "example.com",
      path: "/ws",
    });
  });

  it("handles escaped delimiters", () => {
    // value contains a literal `;` escaped as `\;`
    const parsed = parsePluginString("plug;key=a\\;b");
    expect(parsed?.opts).toEqual({ key: "a;b" });
  });

  it("returns null for empty input", () => {
    expect(parsePluginString("")).toBe(null);
  });

  it("stringify is the inverse of parse for plain values", () => {
    const raw = "obfs-local;obfs=http;obfs-host=example.com";
    const parsed = parsePluginString(raw)!;
    expect(stringifyPluginString(parsed.name, parsed.opts)).toBe(raw);
  });

  it("stringify escapes special characters", () => {
    const out = stringifyPluginString("plug", { key: "a;b=c\\d" });
    expect(out).toBe("plug;key=a\\;b\\=c\\\\d");
  });
});

describe("Shadowsocks.testUrl / testObject", () => {
  it("testUrl matches ss:// prefix", () => {
    expect(Shadowsocks.testUrl("ss://abc@host:443")).toBe(true);
    expect(Shadowsocks.testUrl("  ss://abc  ")).toBe(true);
    expect(Shadowsocks.testUrl("SS://ABC@host:443")).toBe(true);
    expect(Shadowsocks.testUrl("vmess://abc")).toBe(false);
    expect(Shadowsocks.testUrl("")).toBe(false);
  });

  it("testObject matches clash ss shape", () => {
    expect(
      Shadowsocks.testObject({
        type: "ss",
        server: "1.2.3.4",
        port: 8388,
        cipher: "aes-256-gcm",
        password: "pw",
      }),
    ).toBe(true);
    expect(Shadowsocks.testObject({ type: "vmess", server: "x", port: 1, cipher: "auto", password: "p" })).toBe(false);
    expect(Shadowsocks.testObject({ type: "ss" })).toBe(false);
  });
});

describe("Shadowsocks.formUrl (SIP002 with base64url userinfo)", () => {
  it("parses standard SIP002 with base64url userinfo and tag", () => {
    const userinfo = base64UrlEncode("aes-256-gcm:p@ssword");
    const ss = Shadowsocks.formUrl(`ss://${userinfo}@1.2.3.4:8388#my%20node`);
    expect(ss.method).toBe("aes-256-gcm");
    expect(ss.password).toBe("p@ssword");
    expect(ss.server).toBe("1.2.3.4");
    expect(ss.port).toBe(8388);
    expect(ss.name).toBe("my node");
  });

  it("parses SIP002 with plugin query (obfs)", () => {
    const userinfo = base64UrlEncode("aes-256-gcm:pw");
    const pluginRaw = "obfs-local;obfs=http;obfs-host=example.com";
    const ss = Shadowsocks.formUrl(`ss://${userinfo}@1.2.3.4:8388/?plugin=${encodeURIComponent(pluginRaw)}#tag`);
    expect(ss.plugin).toBe("obfs-local");
    expect(ss.pluginOpts).toMatchObject({ obfs: "http", "obfs-host": "example.com" });
    expect(ss.name).toBe("tag");
  });
});

describe("Shadowsocks.formUrl (SIP022, percent-encoded userinfo)", () => {
  it("parses SIP022 with plain method:password", () => {
    // SIP022 spec example
    const pwd = "YctPZ6U7xPPcU+gp3u+0tx/tRizJN9K8y+uKlW2qjlI=";
    const userinfo = `2022-blake3-aes-256-gcm:${encodeURIComponent(pwd)}`;
    const ss = Shadowsocks.formUrl(`ss://${userinfo}@192.168.100.1:8888#Example3`);
    expect(ss.method).toBe("2022-blake3-aes-256-gcm");
    expect(ss.password).toBe(pwd);
    expect(ss.server).toBe("192.168.100.1");
    expect(ss.port).toBe(8888);
    expect(ss.name).toBe("Example3");
  });
});

describe("Shadowsocks.formUrl (legacy base64 without @)", () => {
  it("parses legacy base64-wrapped form", () => {
    const inner = "aes-256-cfb:legacypw@example.com:443";
    const ss = Shadowsocks.formUrl(`ss://${base64UrlEncode(inner)}#legacy`);
    expect(ss.method).toBe("aes-256-cfb");
    expect(ss.password).toBe("legacypw");
    expect(ss.server).toBe("example.com");
    expect(ss.port).toBe(443);
    expect(ss.name).toBe("legacy");
  });
});

describe("Shadowsocks.formUrl error handling", () => {
  it("throws for non-ss url", () => {
    expect(() => Shadowsocks.formUrl("vmess://something")).toThrow(/not a shadowsocks/);
  });
  it("throws for missing port", () => {
    const userinfo = base64UrlEncode("aes-256-gcm:pw");
    expect(() => Shadowsocks.formUrl(`ss://${userinfo}@1.2.3.4`)).toThrow(/missing port/);
  });
});

describe("Shadowsocks.toUrl", () => {
  it("produces base64url userinfo for legacy AEAD ciphers", () => {
    const ss = new Shadowsocks({ server: "1.2.3.4", port: 8388, method: "aes-256-gcm", password: "secret", name: "tag" });
    const url = ss.toUrl();
    const parsed = Shadowsocks.formUrl(url);
    expect(parsed.method).toBe("aes-256-gcm");
    expect(parsed.password).toBe("secret");
    expect(parsed.server).toBe("1.2.3.4");
    expect(parsed.port).toBe(8388);
    expect(parsed.name).toBe("tag");
  });

  it("uses percent-encoded userinfo for SIP022 ciphers (no base64)", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "2022-blake3-aes-256-gcm",
      password: "PSK!",
      name: "x",
    });
    const url = ss.toUrl();
    // 头部应能看到明文 method
    expect(url).toContain("2022-blake3-aes-256-gcm");
    expect(Shadowsocks.formUrl(url).password).toBe("PSK!");
  });

  it("appends /?plugin=... and #tag when plugin is set", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "obfs-local",
      pluginOpts: { obfs: "http", "obfs-host": "example.com" },
      name: "n",
    });
    const url = ss.toUrl();
    expect(url).toMatch(/\/\?plugin=/);
    const parsed = Shadowsocks.formUrl(url);
    expect(parsed.plugin).toBe("obfs-local");
    expect(parsed.pluginOpts).toMatchObject({ obfs: "http", "obfs-host": "example.com" });
  });
});

describe("Shadowsocks.toClash", () => {
  it("emits ShadowsocksSimple shape with no plugin", () => {
    const ss = new Shadowsocks({ server: "1.2.3.4", port: 8388, method: "aes-256-gcm", password: "pw", name: "n" });
    expect(ss.toClash()).toEqual({
      name: "n",
      type: "ss",
      server: "1.2.3.4",
      port: 8388,
      cipher: "aes-256-gcm",
      password: "pw",
      udp: true,
    });
  });

  it("maps obfs-local / simple-obfs to plugin: obfs", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "simple-obfs",
      pluginOpts: { obfs: "tls", "obfs-host": "example.com" },
    });
    const out = ss.toClash() as Record<string, unknown>;
    expect(out["plugin"]).toBe("obfs");
    expect(out["plugin-opts"]).toEqual({ mode: "tls", host: "example.com" });
  });

  it("maps v2ray-plugin with tls=true", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "v2ray-plugin",
      pluginOpts: { mode: "websocket", tls: "true", host: "example.com", path: "/ws" },
    });
    const out = ss.toClash() as Record<string, unknown>;
    expect(out["plugin"]).toBe("v2ray-plugin");
    expect(out["plugin-opts"]).toMatchObject({ mode: "websocket", tls: true, host: "example.com", path: "/ws" });
  });
});

describe("Shadowsocks.toV2Ray", () => {
  it("emits outbound with shadowsocks settings", () => {
    const ss = new Shadowsocks({ server: "1.2.3.4", port: 8388, method: "aes-256-gcm", password: "pw", name: "n" });
    const out = ss.toV2Ray() as Record<string, unknown>;
    expect(out["protocol"]).toBe("shadowsocks");
    expect(out["tag"]).toBe("n");
    expect(out["streamSettings"]).toBeUndefined();
    expect(out["settings"]).toEqual({
      servers: [{ address: "1.2.3.4", port: 8388, method: "aes-256-gcm", password: "pw" }],
    });
  });

  it("maps obfs(http) plugin to tcp + http header streamSettings", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "simple-obfs",
      pluginOpts: { obfs: "http", "obfs-host": "example.com" },
    });
    const out = ss.toV2Ray() as Record<string, unknown>;
    const stream = out["streamSettings"] as Record<string, unknown>;
    expect(stream["network"]).toBe("tcp");
    const tcpSettings = stream["tcpSettings"] as { header: { type: string; request: { headers: Record<string, string[]> } } };
    expect(tcpSettings.header.type).toBe("http");
    expect(tcpSettings.header.request.headers["Host"]).toEqual(["example.com"]);
  });

  it("maps v2ray-plugin(ws+tls) to network=ws + security=tls", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "v2ray-plugin",
      pluginOpts: { mode: "websocket", tls: "true", host: "example.com", path: "/ws" },
    });
    const stream = (ss.toV2Ray() as { streamSettings: Record<string, unknown> }).streamSettings;
    expect(stream["network"]).toBe("ws");
    expect(stream["security"]).toBe("tls");
    const ws = stream["wsSettings"] as { path: string; headers: Record<string, string> };
    expect(ws.path).toBe("/ws");
    expect(ws.headers["Host"]).toBe("example.com");
  });

  it("ignores unmappable plugins (e.g. shadow-tls)", () => {
    const ss = new Shadowsocks({
      server: "1.2.3.4",
      port: 8388,
      method: "aes-256-gcm",
      password: "pw",
      plugin: "shadow-tls",
      pluginOpts: { host: "x" },
    });
    const out = ss.toV2Ray() as Record<string, unknown>;
    expect(out["streamSettings"]).toBeUndefined();
  });
});

describe("Shadowsocks.getServerInfo", () => {
  it("returns { name, ip: server }", () => {
    const ss = new Shadowsocks({ server: "1.2.3.4", port: 8388, method: "aes-256-gcm", password: "pw", name: "node1" });
    expect(ss.getServerInfo()).toEqual({ name: "node1", ip: "1.2.3.4" });
  });
});
