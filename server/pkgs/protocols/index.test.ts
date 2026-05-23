import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64";
import {
  AnyTls,
  findProtocol,
  findProtocolByClash,
  fromNodelist,
  fromYaml,
  parseClash,
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

describe("findProtocolByClash", () => {
  it.each([
    [{ type: "ss", server: "x", port: 1, password: "p", cipher: "aes-256-gcm" }, Shadowsocks],
    [{ type: "ssr", server: "x", password: "p" }, ShadowsocksR],
    [{ type: "vmess", server: "x", uuid: "u" }, VMess],
    [{ type: "vless", server: "x", uuid: "u" }, VLess],
    [{ type: "anytls", server: "x", password: "p" }, AnyTls],
  ])("matches %j to its class", (obj, expected) => {
    expect(findProtocolByClash(obj)).toBe(expected);
  });

  it("returns null for an unknown type", () => {
    expect(findProtocolByClash({ type: "trojan" })).toBe(null);
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

describe("parseClash + clash round-trip", () => {
  const cases = [
    { label: "ss", url: sampleSsUrl, klass: Shadowsocks },
    { label: "ssr", url: sampleSsrUrl, klass: ShadowsocksR },
    { label: "vmess", url: sampleVmessUrl, klass: VMess },
    { label: "vless", url: sampleVlessUrl, klass: VLess },
    { label: "anytls", url: sampleAnytlsUrl, klass: AnyTls },
  ];

  it.each(cases)("$label: toClash -> parseClash preserves identity + key fields", ({ url, klass }) => {
    const orig = parseUrl(url)!;
    const clashObj = orig.toClash();
    const round = parseClash(clashObj);
    expect(round).toBeInstanceOf(klass);
    expect(round?.getServerInfo()).toEqual(orig.getServerInfo());
    // 比较一遍 toClash 应该等价
    expect(round?.toClash()).toEqual(clashObj);
  });

  it("returns null for non-object input", () => {
    expect(parseClash(null)).toBe(null);
    expect(parseClash(undefined)).toBe(null);
    expect(parseClash("ss://abc")).toBe(null);
    expect(parseClash(42)).toBe(null);
  });

  it("returns null for unknown type", () => {
    expect(parseClash({ type: "trojan", server: "x", password: "p" })).toBe(null);
  });
});

describe("fromNodelist", () => {
  it("parses multi-line subscription with mixed protocols", () => {
    const content = [sampleSsUrl, sampleVlessUrl, sampleVmessUrl, sampleAnytlsUrl, sampleSsrUrl].join("\n");
    const nodes = fromNodelist(content);
    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toBeInstanceOf(Shadowsocks);
    expect(nodes[1]).toBeInstanceOf(VLess);
    expect(nodes[2]).toBeInstanceOf(VMess);
    expect(nodes[3]).toBeInstanceOf(AnyTls);
    expect(nodes[4]).toBeInstanceOf(ShadowsocksR);
  });

  it("tolerates CRLF, blank lines, comments, and unknown schemes", () => {
    const content = ["# header comment", "", sampleSsUrl, "\r", "trojan://unknown@host:443", "  ", sampleVlessUrl].join(
      "\r\n",
    );
    const nodes = fromNodelist(content);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toBeInstanceOf(Shadowsocks);
    expect(nodes[1]).toBeInstanceOf(VLess);
  });

  it("skips lines whose payload throws during parsing", () => {
    const content = [sampleSsUrl, "ss://garbage-without-userinfo", sampleVlessUrl].join("\n");
    expect(fromNodelist(content)).toHaveLength(2);
  });

  it("returns empty array for blank input", () => {
    expect(fromNodelist("")).toEqual([]);
    expect(fromNodelist("\n\n\n")).toEqual([]);
  });
});

describe("fromYaml", () => {
  const clashYaml = `
proxies:
  - name: ss-node
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pw
  - name: ssr-node
    type: ssr
    server: 5.6.7.8
    port: 443
    cipher: aes-128-cfb
    password: pwssr
    obfs: plain
    protocol: origin
  - name: vmess-node
    type: vmess
    server: vmess.example.com
    port: 443
    uuid: a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa
    alterId: 0
    cipher: auto
    tls: true
    servername: vmess.example.com
    network: ws
    ws-opts:
      path: /ws
      headers:
        Host: vmess.example.com
  - name: vless-node
    type: vless
    server: vless.example.com
    port: 443
    uuid: a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa
    flow: xtls-rprx-vision
    tls: true
    servername: vless.example.com
    client-fingerprint: chrome
    reality-opts:
      public-key: pbk_value
      short-id: sid_value
  - name: anytls-node
    type: anytls
    server: any.example.com
    port: 443
    password: anypw
    sni: any.example.com
    skip-cert-verify: true
    alpn: [h2, http/1.1]
proxy-groups: []
rules: []
`;

  it("parses all proxies from a multi-protocol clash config", () => {
    const { protocols } = fromYaml(clashYaml);
    expect(protocols).toHaveLength(5);
    expect(protocols[0]).toBeInstanceOf(Shadowsocks);
    expect(protocols[1]).toBeInstanceOf(ShadowsocksR);
    expect(protocols[2]).toBeInstanceOf(VMess);
    expect(protocols[3]).toBeInstanceOf(VLess);
    expect(protocols[4]).toBeInstanceOf(AnyTls);
  });

  it("preserves transport details for vmess ws", () => {
    const vmess = fromYaml(clashYaml).protocols.find((n) => n.protocol === "vmess") as VMess | undefined;
    expect(vmess?.network).toBe("ws");
    expect(vmess?.host).toBe("vmess.example.com");
    expect(vmess?.path).toBe("/ws");
    expect(vmess?.tls).toBe("tls");
  });

  it("preserves REALITY details for vless", () => {
    const vless = fromYaml(clashYaml).protocols.find((n) => n.protocol === "vless") as VLess | undefined;
    expect(vless?.security).toBe("reality");
    expect(vless?.flow).toBe("xtls-rprx-vision");
    expect(vless?.publicKey).toBe("pbk_value");
    expect(vless?.shortId).toBe("sid_value");
    expect(vless?.fingerprint).toBe("chrome");
  });

  it("skips proxies with unknown type", () => {
    const yaml = `
proxies:
  - name: trojan-1
    type: trojan
    server: x
    port: 443
    password: p
  - name: ss-1
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pw
`;
    const { protocols } = fromYaml(yaml);
    expect(protocols).toHaveLength(1);
    expect(protocols[0]).toBeInstanceOf(Shadowsocks);
  });

  it("returns empty result when proxies field is missing", () => {
    const a = fromYaml("rules: []");
    expect(a.protocols).toEqual([]);
    expect(a.groups.size).toBe(0);
    const b = fromYaml("proxy-groups: []");
    expect(b.protocols).toEqual([]);
    expect(b.groups.size).toBe(0);
  });

  it("returns empty result for invalid YAML", () => {
    // 不闭合的引号 → YAML parser 抛错
    const { protocols, groups } = fromYaml('proxies: ["unterminated');
    expect(protocols).toEqual([]);
    expect(groups.size).toBe(0);
  });

  it("returns empty result for empty / null input", () => {
    for (const input of ["", "null", "[]"]) {
      const { protocols, groups } = fromYaml(input);
      expect(protocols).toEqual([]);
      expect(groups.size).toBe(0);
    }
  });
});

describe("fromYaml — proxy-groups", () => {
  it("builds reverse map of select proxy-groups", () => {
    const yaml = `
proxies:
  - name: ss-node
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: pw
proxy-groups:
  - name: 自动选择
    type: url-test
    proxies: [ss-node]
    url: http://www.gstatic.com/generate_204
    interval: 300
  - name: 手动选择
    type: select
    proxies:
      - ss-node
      - 自动选择
  - name: 备用
    type: select
    proxies:
      - ss-node
`;
    const { protocols, groups } = fromYaml(yaml);
    expect(protocols).toHaveLength(1);
    expect(groups.size).toBe(2);
    expect(groups.get("ss-node")).toEqual(new Set(["手动选择", "备用"]));
    expect(groups.get("自动选择")).toEqual(new Set(["手动选择"]));
  });

  it("ignores non-select groups and malformed entries", () => {
    const yaml = `
proxies: []
proxy-groups:
  - name: G1
    type: url-test
    proxies: [a, b]
  - name: G2
    type: select
    proxies: [a, "", 42, null, c]
  - type: select
    proxies: [a]
  - name: G3
    type: select
  - name: G4
    type: select
    proxies: not-an-array
`;
    const { groups } = fromYaml(yaml);
    expect(groups.get("a")).toEqual(new Set(["G2"]));
    expect(groups.get("c")).toEqual(new Set(["G2"]));
    expect(groups.has("b")).toBe(false);
    expect(groups.has("")).toBe(false);
  });
});
