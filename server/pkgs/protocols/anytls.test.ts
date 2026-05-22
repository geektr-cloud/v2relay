import { describe, expect, it } from "vitest";
import { AnyTls } from "./anytls";

describe("AnyTls.testUrl / testObject", () => {
  it("matches anytls:// prefix", () => {
    expect(AnyTls.testUrl("anytls://abc")).toBe(true);
    expect(AnyTls.testUrl("ANYTLS://abc")).toBe(true);
    expect(AnyTls.testUrl("ss://abc")).toBe(false);
  });

  it("matches clash anytls shape", () => {
    expect(AnyTls.testObject({ type: "anytls", server: "x", password: "p" })).toBe(true);
    expect(AnyTls.testObject({ type: "ss", server: "x", password: "p" })).toBe(false);
  });
});

describe("AnyTls.formUrl (canonical examples from anytls-go spec)", () => {
  it("anytls://letmein@example.com/?sni=real.example.com", () => {
    const a = AnyTls.formUrl("anytls://letmein@example.com/?sni=real.example.com");
    expect(a.password).toBe("letmein");
    expect(a.server).toBe("example.com");
    expect(a.port).toBe(443);
    expect(a.sni).toBe("real.example.com");
    expect(a.insecure).toBe(false);
  });

  it("anytls://letmein@example.com/?sni=127.0.0.1&insecure=1", () => {
    const a = AnyTls.formUrl("anytls://letmein@example.com/?sni=127.0.0.1&insecure=1");
    expect(a.sni).toBe("127.0.0.1");
    expect(a.insecure).toBe(true);
  });

  it("supports IPv6 with explicit port and tag", () => {
    const a = AnyTls.formUrl("anytls://uuid-pass@[2409:8a71:6a00:1953::615]:8964/?insecure=1#ipv6");
    expect(a.password).toBe("uuid-pass");
    expect(a.server).toBe("2409:8a71:6a00:1953::615");
    expect(a.port).toBe(8964);
    expect(a.insecure).toBe(true);
    expect(a.name).toBe("ipv6");
  });

  it("percent-encoded passwords are decoded", () => {
    const a = AnyTls.formUrl("anytls://a%20b%3Ac@example.com");
    expect(a.password).toBe("a b:c");
    expect(a.port).toBe(443);
  });

  it("works without trailing slash before query", () => {
    const a = AnyTls.formUrl("anytls://pw@example.com:443?sni=s.example.com#n");
    expect(a.sni).toBe("s.example.com");
    expect(a.name).toBe("n");
  });
});

describe("AnyTls.formUrl error handling", () => {
  it("throws for non-anytls url", () => {
    expect(() => AnyTls.formUrl("vless://abc")).toThrow(/not an anytls/);
  });
  it("throws when password (userinfo) is missing", () => {
    expect(() => AnyTls.formUrl("anytls://example.com:443")).toThrow(/missing password/);
  });
});

describe("AnyTls.toUrl roundtrip", () => {
  it("preserves IPv4 + sni + insecure + tag", () => {
    const orig = "anytls://letmein@example.com:8443/?sni=real.example.com&insecure=1#node-1";
    const a = AnyTls.formUrl(orig);
    const b = AnyTls.formUrl(a.toUrl());
    expect(b.password).toBe(a.password);
    expect(b.server).toBe(a.server);
    expect(b.port).toBe(a.port);
    expect(b.sni).toBe(a.sni);
    expect(b.insecure).toBe(a.insecure);
    expect(b.name).toBe(a.name);
  });

  it("preserves IPv6 brackets after toUrl", () => {
    const a = AnyTls.formUrl("anytls://pw@[2001:db8::1]:8443/?insecure=1");
    const url = a.toUrl();
    expect(url).toContain("[2001:db8::1]");
    const b = AnyTls.formUrl(url);
    expect(b.server).toBe("2001:db8::1");
    expect(b.port).toBe(8443);
  });
});

describe("AnyTls.toClash", () => {
  it("emits mihomo anytls shape with sni + skip-cert-verify", () => {
    const a = new AnyTls({
      server: "1.2.3.4",
      port: 8443,
      password: "pw",
      sni: "real.example.com",
      insecure: true,
      alpn: "h2,http/1.1",
      fingerprint: "chrome",
      name: "n",
    });
    expect(a.toClash()).toEqual({
      name: "n",
      type: "anytls",
      server: "1.2.3.4",
      port: 8443,
      password: "pw",
      udp: true,
      sni: "real.example.com",
      "skip-cert-verify": true,
      "client-fingerprint": "chrome",
      alpn: ["h2", "http/1.1"],
    });
  });

  it("omits optional fields when not set", () => {
    const a = new AnyTls({ server: "1.2.3.4", password: "pw", name: "n" });
    const out = a.toClash() as Record<string, unknown>;
    expect(out["sni"]).toBeUndefined();
    expect(out["skip-cert-verify"]).toBeUndefined();
    expect(out["alpn"]).toBeUndefined();
    expect(out["client-fingerprint"]).toBeUndefined();
  });
});

describe("AnyTls.toV2Ray", () => {
  it("returns null (V2Ray has no native anytls support)", () => {
    const a = new AnyTls({ server: "1.2.3.4", password: "pw" });
    expect(a.toV2Ray()).toBe(null);
  });
});

describe("AnyTls.getServerInfo", () => {
  it("returns { name, ip: server }", () => {
    const a = new AnyTls({ server: "1.2.3.4", password: "pw", name: "n" });
    expect(a.getServerInfo()).toEqual({ name: "n", ip: "1.2.3.4" });
  });
});
