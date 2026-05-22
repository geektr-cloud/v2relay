import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64";
import { ShadowsocksR } from "./ssr";

const buildSsrUrl = (opts: {
  server: string;
  port: number;
  ssrProtocol: string;
  method: string;
  obfs: string;
  password: string;
  obfsParam?: string;
  protoParam?: string;
  name?: string;
  group?: string;
}): string => {
  const head = [opts.server, opts.port, opts.ssrProtocol, opts.method, opts.obfs, base64UrlEncode(opts.password)].join(
    ":",
  );
  const params = new URLSearchParams();
  if (opts.obfsParam) params.set("obfsparam", base64UrlEncode(opts.obfsParam));
  if (opts.protoParam) params.set("protoparam", base64UrlEncode(opts.protoParam));
  if (opts.name) params.set("remarks", base64UrlEncode(opts.name));
  if (opts.group) params.set("group", base64UrlEncode(opts.group));
  const qs = params.toString();
  const payload = `${head}${qs ? `/?${qs}` : ""}`;
  return `ssr://${base64UrlEncode(payload)}`;
};

describe("ShadowsocksR.testUrl / testObject", () => {
  it("matches ssr:// prefix", () => {
    expect(ShadowsocksR.testUrl("ssr://abc")).toBe(true);
    expect(ShadowsocksR.testUrl("SSR://abc")).toBe(true);
    expect(ShadowsocksR.testUrl("ss://abc")).toBe(false);
  });

  it("matches clash ssr shape", () => {
    expect(ShadowsocksR.testObject({ type: "ssr", server: "x", password: "p" })).toBe(true);
    expect(ShadowsocksR.testObject({ type: "ss", server: "x", password: "p" })).toBe(false);
  });
});

describe("ShadowsocksR.formUrl", () => {
  it("parses full payload (with all params)", () => {
    const url = buildSsrUrl({
      server: "host.example.com",
      port: 8443,
      ssrProtocol: "auth_aes128_md5",
      method: "aes-256-cfb",
      obfs: "tls1.2_ticket_auth",
      password: "supersecret",
      obfsParam: "obfs.example.com",
      protoParam: "proto-data",
      name: "节点-1",
      group: "测试组",
    });
    const s = ShadowsocksR.formUrl(url);
    expect(s.server).toBe("host.example.com");
    expect(s.port).toBe(8443);
    expect(s.ssrProtocol).toBe("auth_aes128_md5");
    expect(s.method).toBe("aes-256-cfb");
    expect(s.obfs).toBe("tls1.2_ticket_auth");
    expect(s.password).toBe("supersecret");
    expect(s.obfsParam).toBe("obfs.example.com");
    expect(s.protoParam).toBe("proto-data");
    expect(s.name).toBe("节点-1");
    expect(s.group).toBe("测试组");
  });

  it("parses minimal payload (no params block)", () => {
    const url = buildSsrUrl({
      server: "1.2.3.4",
      port: 443,
      ssrProtocol: "origin",
      method: "aes-128-cfb",
      obfs: "plain",
      password: "pw",
    });
    const s = ShadowsocksR.formUrl(url);
    expect(s.ssrProtocol).toBe("origin");
    expect(s.obfsParam).toBe("");
    expect(s.protoParam).toBe("");
    expect(s.group).toBe("");
    expect(s.name).toBe("1.2.3.4:443");
  });

  it("throws when payload has wrong number of segments", () => {
    const broken = `ssr://${base64UrlEncode("only:two")}`;
    expect(() => ShadowsocksR.formUrl(broken)).toThrow(/6 segments/);
  });

  it("throws for non-ssr url", () => {
    expect(() => ShadowsocksR.formUrl("ss://abc")).toThrow(/not a ssr/);
  });
});

describe("ShadowsocksR.toUrl roundtrip", () => {
  it("parse → toUrl → parse preserves fields", () => {
    const url = buildSsrUrl({
      server: "host.example.com",
      port: 8443,
      ssrProtocol: "auth_chain_a",
      method: "chacha20-ietf",
      obfs: "http_simple",
      password: "secret!",
      obfsParam: "obfs.example.com",
      protoParam: "proto-data",
      name: "node",
      group: "g",
    });
    const a = ShadowsocksR.formUrl(url);
    const b = ShadowsocksR.formUrl(a.toUrl());
    expect(b.server).toBe(a.server);
    expect(b.port).toBe(a.port);
    expect(b.ssrProtocol).toBe(a.ssrProtocol);
    expect(b.method).toBe(a.method);
    expect(b.obfs).toBe(a.obfs);
    expect(b.password).toBe(a.password);
    expect(b.obfsParam).toBe(a.obfsParam);
    expect(b.protoParam).toBe(a.protoParam);
    expect(b.name).toBe(a.name);
    expect(b.group).toBe(a.group);
  });
});

describe("ShadowsocksR.toClash", () => {
  it("emits clash ssr shape", () => {
    const s = new ShadowsocksR({
      server: "1.2.3.4",
      port: 443,
      ssrProtocol: "auth_aes128_md5",
      method: "aes-256-cfb",
      obfs: "tls1.2_ticket_auth",
      password: "pw",
      obfsParam: "host.example.com",
      protoParam: "x",
      name: "n",
    });
    expect(s.toClash()).toEqual({
      name: "n",
      type: "ssr",
      server: "1.2.3.4",
      port: 443,
      cipher: "aes-256-cfb",
      password: "pw",
      obfs: "tls1.2_ticket_auth",
      protocol: "auth_aes128_md5",
      udp: true,
      "obfs-param": "host.example.com",
      "protocol-param": "x",
    });
  });

  it("omits obfs-param / protocol-param when empty", () => {
    const s = new ShadowsocksR({
      server: "1.2.3.4",
      port: 443,
      ssrProtocol: "origin",
      method: "aes-128-cfb",
      obfs: "plain",
      password: "pw",
    });
    const out = s.toClash() as Record<string, unknown>;
    expect(out["obfs-param"]).toBeUndefined();
    expect(out["protocol-param"]).toBeUndefined();
  });
});

describe("ShadowsocksR.toV2Ray", () => {
  it("returns null (V2Ray/Xray has no native SSR support)", () => {
    const s = new ShadowsocksR({
      server: "1.2.3.4",
      port: 443,
      ssrProtocol: "origin",
      method: "aes-128-cfb",
      obfs: "plain",
      password: "pw",
    });
    expect(s.toV2Ray()).toBe(null);
  });
});

describe("ShadowsocksR.getServerInfo", () => {
  it("returns { name, ip: server }", () => {
    const s = new ShadowsocksR({
      server: "1.2.3.4",
      port: 443,
      ssrProtocol: "origin",
      method: "aes-128-cfb",
      obfs: "plain",
      password: "pw",
      name: "node",
    });
    expect(s.getServerInfo()).toEqual({ name: "node", ip: "1.2.3.4" });
  });
});
