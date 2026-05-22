import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64";
import {
  AnyTls,
  findProtocol,
  findProtocolByObject,
  parseUrl,
  Protocols,
  Shadowsocks,
  ShadowsocksR,
  VLess,
  VMess,
} from "./index";

const sampleVmessUrl = `vmess://${base64UrlEncode(
  JSON.stringify({
    v: "2",
    ps: "vmess",
    add: "example.com",
    port: "443",
    id: "a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa",
    aid: "0",
    scy: "auto",
    net: "tcp",
  }),
)}`;

const sampleSsUrl = `ss://${base64UrlEncode("aes-256-gcm:pw")}@1.2.3.4:8388#ss-node`;

const sampleVlessUrl = "vless://a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa@example.com:443?security=tls&type=tcp#vless-node";

const sampleSsrUrl = `ssr://${base64UrlEncode(`1.2.3.4:443:origin:aes-128-cfb:plain:${base64UrlEncode("pw")}`)}`;

const sampleAnytlsUrl = "anytls://pw@example.com:443/?sni=s.example.com#anytls-node";

describe("Protocols registry", () => {
  it("includes all five protocol classes", () => {
    expect(Protocols).toContain(Shadowsocks);
    expect(Protocols).toContain(ShadowsocksR);
    expect(Protocols).toContain(VMess);
    expect(Protocols).toContain(VLess);
    expect(Protocols).toContain(AnyTls);
    expect(Protocols.length).toBe(5);
  });

  it("each registered class declares a unique `protocol` name", () => {
    const names = Protocols.map((P) => P.protocol);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("findProtocol", () => {
  it.each([
    ["ss://", sampleSsUrl, Shadowsocks],
    ["ssr://", sampleSsrUrl, ShadowsocksR],
    ["vmess://", sampleVmessUrl, VMess],
    ["vless://", sampleVlessUrl, VLess],
    ["anytls://", sampleAnytlsUrl, AnyTls],
  ])("routes %s to the right class", (_label, url, expected) => {
    expect(findProtocol(url)).toBe(expected);
  });

  it("returns null for an unknown scheme", () => {
    expect(findProtocol("trojan://x@host:443")).toBe(null);
    expect(findProtocol("")).toBe(null);
  });
});

describe("findProtocolByObject", () => {
  it.each([
    [{ type: "ss", server: "x", port: 1, password: "p", cipher: "aes-256-gcm" }, Shadowsocks],
    [{ type: "ssr", server: "x", password: "p" }, ShadowsocksR],
    [{ type: "vmess", server: "x", uuid: "u" }, VMess],
    [{ type: "vless", server: "x", uuid: "u" }, VLess],
    [{ type: "anytls", server: "x", password: "p" }, AnyTls],
  ])("matches %j to its class", (obj, expected) => {
    expect(findProtocolByObject(obj)).toBe(expected);
  });

  it("returns null for an unknown type", () => {
    expect(findProtocolByObject({ type: "trojan" })).toBe(null);
  });
});

describe("parseUrl", () => {
  it("parses a shadowsocks URL into a Shadowsocks instance", () => {
    const p = parseUrl(sampleSsUrl);
    expect(p).toBeInstanceOf(Shadowsocks);
    expect(p?.protocol).toBe("shadowsocks");
    expect(p?.getServerInfo()).toEqual({ name: "ss-node", ip: "1.2.3.4" });
  });

  it("parses a vless URL into a VLess instance", () => {
    const p = parseUrl(sampleVlessUrl);
    expect(p).toBeInstanceOf(VLess);
    expect(p?.protocol).toBe("vless");
  });

  it("returns null for an unknown scheme", () => {
    expect(parseUrl("trojan://x@host:443")).toBe(null);
  });

  it("propagates underlying parse errors for known schemes", () => {
    // Known scheme (ss://) but malformed payload — formUrl should throw
    expect(() => parseUrl("ss://invalid-payload-with-no-userinfo")).toThrow();
  });
});
