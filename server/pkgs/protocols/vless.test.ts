import { describe, expect, it } from "vitest";
import { VLess } from "./vless";

const REALITY_URL =
  "vless://a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa@example.com:443" +
  "?flow=xtls-rprx-vision&encryption=none&type=tcp&security=reality" +
  "&sni=learn.microsoft.com&fp=chrome&pbk=ptjHQxBQxTJ9MWr2cd5qWIflBSACHOevTauCQwa_71U" +
  "&sid=abcdef&spx=%2F" +
  "#reality-node";

const TLS_WS_URL =
  "vless://a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa@cdn.example.com:443" +
  "/?encryption=none&security=tls&sni=cdn.example.com&type=ws&host=cdn.example.com&path=%2Fwspath" +
  "#tls-ws-node";

const GRPC_URL =
  "vless://a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa@grpc.example.com:443" +
  "?encryption=none&security=tls&sni=grpc.example.com&type=grpc&serviceName=GrpcSrv&mode=multi" +
  "#grpc-node";

describe("VLess.testUrl / testObject", () => {
  it("matches vless:// prefix", () => {
    expect(VLess.testUrl("vless://abc")).toBe(true);
    expect(VLess.testUrl("VLESS://abc")).toBe(true);
    expect(VLess.testUrl("vmess://abc")).toBe(false);
  });

  it("matches clash vless shape", () => {
    expect(VLess.testObject({ type: "vless", server: "x", uuid: "u" })).toBe(true);
    expect(VLess.testObject({ type: "vmess", server: "x", uuid: "u" })).toBe(false);
  });
});

describe("VLess.formUrl REALITY", () => {
  const v = VLess.formUrl(REALITY_URL);

  it("parses uuid, host, port", () => {
    expect(v.uuid).toBe("a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa");
    expect(v.server).toBe("example.com");
    expect(v.port).toBe(443);
  });

  it("parses REALITY-specific params", () => {
    expect(v.security).toBe("reality");
    expect(v.flow).toBe("xtls-rprx-vision");
    expect(v.encryption).toBe("none");
    expect(v.sni).toBe("learn.microsoft.com");
    expect(v.fingerprint).toBe("chrome");
    expect(v.publicKey).toBe("ptjHQxBQxTJ9MWr2cd5qWIflBSACHOevTauCQwa_71U");
    expect(v.shortId).toBe("abcdef");
    expect(v.spiderX).toBe("/");
  });

  it("parses tag from fragment", () => {
    expect(v.name).toBe("reality-node");
  });
});

describe("VLess.formUrl TLS+WS", () => {
  const v = VLess.formUrl(TLS_WS_URL);

  it("parses transport params", () => {
    expect(v.security).toBe("tls");
    expect(v.network).toBe("ws");
    expect(v.host).toBe("cdn.example.com");
    expect(v.path).toBe("/wspath");
  });
});

describe("VLess.formUrl gRPC", () => {
  const v = VLess.formUrl(GRPC_URL);

  it("parses serviceName and mode", () => {
    expect(v.network).toBe("grpc");
    expect(v.serviceName).toBe("GrpcSrv");
    expect(v.mode).toBe("multi");
  });
});

describe("VLess.formUrl error handling", () => {
  it("throws for non-vless url", () => {
    expect(() => VLess.formUrl("vmess://abc")).toThrow(/not a vless/);
  });
  it("throws for missing userinfo", () => {
    expect(() => VLess.formUrl("vless://example.com:443")).toThrow(/missing userinfo/);
  });
});

describe("VLess.toUrl roundtrip", () => {
  it("REALITY preserves all params", () => {
    const v = VLess.formUrl(REALITY_URL);
    const r = VLess.formUrl(v.toUrl());
    expect(r.uuid).toBe(v.uuid);
    expect(r.server).toBe(v.server);
    expect(r.port).toBe(v.port);
    expect(r.security).toBe(v.security);
    expect(r.flow).toBe(v.flow);
    expect(r.sni).toBe(v.sni);
    expect(r.fingerprint).toBe(v.fingerprint);
    expect(r.publicKey).toBe(v.publicKey);
    expect(r.shortId).toBe(v.shortId);
    expect(r.spiderX).toBe(v.spiderX);
    expect(r.name).toBe(v.name);
  });

  it("TLS+WS preserves transport params", () => {
    const v = VLess.formUrl(TLS_WS_URL);
    const r = VLess.formUrl(v.toUrl());
    expect(r.network).toBe("ws");
    expect(r.host).toBe(v.host);
    expect(r.path).toBe(v.path);
    expect(r.security).toBe("tls");
  });
});

describe("VLess.toClash", () => {
  it("REALITY emits reality-opts + tls=true", () => {
    const out = VLess.formUrl(REALITY_URL).toClash() as Record<string, unknown>;
    expect(out["type"]).toBe("vless");
    expect(out["tls"]).toBe(true);
    expect(out["flow"]).toBe("xtls-rprx-vision");
    expect(out["servername"]).toBe("learn.microsoft.com");
    expect(out["client-fingerprint"]).toBe("chrome");
    expect(out["reality-opts"]).toEqual({
      "public-key": "ptjHQxBQxTJ9MWr2cd5qWIflBSACHOevTauCQwa_71U",
      "short-id": "abcdef",
    });
  });

  it("TLS+WS emits ws-opts", () => {
    const out = VLess.formUrl(TLS_WS_URL).toClash() as Record<string, unknown>;
    expect(out["network"]).toBe("ws");
    expect(out["ws-opts"]).toEqual({ path: "/wspath", headers: { Host: "cdn.example.com" } });
  });

  it("gRPC emits grpc-opts using serviceName", () => {
    const out = VLess.formUrl(GRPC_URL).toClash() as Record<string, unknown>;
    expect(out["grpc-opts"]).toEqual({ "grpc-service-name": "GrpcSrv" });
  });
});

describe("VLess.toV2Ray", () => {
  it("REALITY emits realitySettings", () => {
    const out = VLess.formUrl(REALITY_URL).toV2Ray() as Record<string, unknown>;
    expect(out["protocol"]).toBe("vless");
    const settings = out["settings"] as { vnext: { users: { id: string; flow?: string; encryption?: string }[] }[] };
    expect(settings.vnext[0]?.users[0]?.flow).toBe("xtls-rprx-vision");
    expect(settings.vnext[0]?.users[0]?.encryption).toBe("none");
    const stream = out["streamSettings"] as Record<string, unknown>;
    expect(stream["security"]).toBe("reality");
    expect(stream["realitySettings"]).toMatchObject({
      serverName: "learn.microsoft.com",
      fingerprint: "chrome",
      publicKey: "ptjHQxBQxTJ9MWr2cd5qWIflBSACHOevTauCQwa_71U",
      shortId: "abcdef",
    });
  });

  it("gRPC emits grpcSettings with multiMode based on mode", () => {
    const out = VLess.formUrl(GRPC_URL).toV2Ray() as Record<string, unknown>;
    const stream = out["streamSettings"] as Record<string, unknown>;
    expect(stream["network"]).toBe("grpc");
    expect(stream["grpcSettings"]).toEqual({ serviceName: "GrpcSrv", multiMode: true });
  });
});
