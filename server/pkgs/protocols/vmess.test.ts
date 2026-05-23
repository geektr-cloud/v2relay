import { describe, expect, it } from "vitest";
import { base64UrlEncode } from "./base64";
import { VMess } from "./vmess";

const sampleJson = {
  v: "2",
  ps: "demo-node",
  add: "example.com",
  port: "443",
  id: "a3a3a3a3-aaaa-bbbb-cccc-aaaaaaaaaaaa",
  aid: "0",
  scy: "auto",
  net: "ws",
  type: "none",
  host: "example.com",
  path: "/ws",
  tls: "tls",
  sni: "example.com",
  alpn: "",
  fp: "chrome",
};

describe("VMess.testUrl / testClash", () => {
  it("matches vmess:// prefix", () => {
    expect(VMess.testUrl("vmess://anything")).toBe(true);
    expect(VMess.testUrl("VMESS://anything")).toBe(true);
    expect(VMess.testUrl("ss://anything")).toBe(false);
  });

  it("matches clash vmess shape", () => {
    expect(VMess.testClash({ type: "vmess", server: "x", uuid: "u" })).toBe(true);
    expect(VMess.testClash({ type: "vless", server: "x", uuid: "u" })).toBe(false);
    expect(VMess.testClash({ type: "vmess" })).toBe(false);
  });
});

describe("VMess.formUrl (v2rayN base64 JSON)", () => {
  it("parses canonical v2rayN payload", () => {
    const url = `vmess://${base64UrlEncode(JSON.stringify(sampleJson))}`;
    const v = VMess.formUrl(url);
    expect(v.server).toBe("example.com");
    expect(v.port).toBe(443);
    expect(v.uuid).toBe(sampleJson.id);
    expect(v.alterId).toBe(0);
    expect(v.security).toBe("auto");
    expect(v.network).toBe("ws");
    expect(v.host).toBe("example.com");
    expect(v.path).toBe("/ws");
    expect(v.tls).toBe("tls");
    expect(v.sni).toBe("example.com");
    expect(v.fingerprint).toBe("chrome");
    expect(v.name).toBe("demo-node");
  });

  it("survives the base64 padding strip / append", () => {
    // 一个长度刚好不需要 padding 的 payload
    const payload = JSON.stringify({ ...sampleJson, ps: "x" });
    const url = `vmess://${base64UrlEncode(payload)}`;
    expect(() => VMess.formUrl(url)).not.toThrow();
  });
});

describe("VMess.formUrl (ShadowRocket format)", () => {
  it("falls back when payload looks like method:uuid@host:port", () => {
    const inner = `auto:${sampleJson.id}@example.com:443`;
    const url = `vmess://${base64UrlEncode(inner)}?remarks=rk&tls=1&path=/wpath&obfsParam=cf.example.com&obfs=websocket`;
    const v = VMess.formUrl(url);
    expect(v.uuid).toBe(sampleJson.id);
    expect(v.server).toBe("example.com");
    expect(v.port).toBe(443);
    expect(v.security).toBe("auto");
    expect(v.tls).toBe("tls");
    expect(v.network).toBe("ws");
    expect(v.path).toBe("/wpath");
    expect(v.host).toBe("cf.example.com");
    expect(v.name).toBe("rk");
  });
});

describe("VMess.toUrl roundtrip", () => {
  it("parse → toUrl → parse preserves all known fields", () => {
    const orig = `vmess://${base64UrlEncode(JSON.stringify(sampleJson))}`;
    const parsed = VMess.formUrl(orig);
    const reparsed = VMess.formUrl(parsed.toUrl());
    expect(reparsed.server).toBe(parsed.server);
    expect(reparsed.port).toBe(parsed.port);
    expect(reparsed.uuid).toBe(parsed.uuid);
    expect(reparsed.alterId).toBe(parsed.alterId);
    expect(reparsed.security).toBe(parsed.security);
    expect(reparsed.network).toBe(parsed.network);
    expect(reparsed.headerType).toBe(parsed.headerType);
    expect(reparsed.host).toBe(parsed.host);
    expect(reparsed.path).toBe(parsed.path);
    expect(reparsed.tls).toBe(parsed.tls);
    expect(reparsed.sni).toBe(parsed.sni);
    expect(reparsed.alpn).toBe(parsed.alpn);
    expect(reparsed.fingerprint).toBe(parsed.fingerprint);
    expect(reparsed.name).toBe(parsed.name);
  });
});

describe("VMess.toClash", () => {
  it("emits clash vmess with ws-opts for network=ws", () => {
    const v = VMess.formUrl(`vmess://${base64UrlEncode(JSON.stringify(sampleJson))}`);
    const out = v.toClash() as Record<string, unknown>;
    expect(out["type"]).toBe("vmess");
    expect(out["server"]).toBe("example.com");
    expect(out["uuid"]).toBe(sampleJson.id);
    expect(out["network"]).toBe("ws");
    expect(out["tls"]).toBe(true);
    expect(out["servername"]).toBe("example.com");
    expect(out["client-fingerprint"]).toBe("chrome");
    expect(out["ws-opts"]).toEqual({ path: "/ws", headers: { Host: "example.com" } });
  });

  it("emits grpc-opts for network=grpc", () => {
    const grpcJson = { ...sampleJson, net: "grpc", path: "GrpcService" };
    const v = VMess.formUrl(`vmess://${base64UrlEncode(JSON.stringify(grpcJson))}`);
    const out = v.toClash() as Record<string, unknown>;
    expect(out["network"]).toBe("grpc");
    expect(out["grpc-opts"]).toEqual({ "grpc-service-name": "GrpcService" });
  });

  it("plain tcp without tls emits no network/tls", () => {
    const plain = { ...sampleJson, net: "tcp", tls: "", host: "", path: "" };
    const v = VMess.formUrl(`vmess://${base64UrlEncode(JSON.stringify(plain))}`);
    const out = v.toClash() as Record<string, unknown>;
    expect(out["network"]).toBeUndefined();
    expect(out["tls"]).toBeUndefined();
    expect(out["ws-opts"]).toBeUndefined();
  });
});

describe("VMess.toV2Ray", () => {
  it("emits outbound with vnext + ws streamSettings", () => {
    const v = VMess.formUrl(`vmess://${base64UrlEncode(JSON.stringify(sampleJson))}`);
    const out = v.toV2Ray() as Record<string, unknown>;
    expect(out["protocol"]).toBe("vmess");
    expect(out["tag"]).toBe("demo-node");
    const settings = out["settings"] as { vnext: { address: string; port: number; users: { id: string }[] }[] };
    expect(settings.vnext[0]?.address).toBe("example.com");
    expect(settings.vnext[0]?.port).toBe(443);
    expect(settings.vnext[0]?.users[0]?.id).toBe(sampleJson.id);
    const stream = out["streamSettings"] as Record<string, unknown>;
    expect(stream["network"]).toBe("ws");
    expect(stream["security"]).toBe("tls");
    expect(stream["wsSettings"]).toEqual({ path: "/ws", headers: { Host: "example.com" } });
  });

  it("plain tcp without tls omits streamSettings", () => {
    const plain = { ...sampleJson, net: "tcp", tls: "", host: "", path: "" };
    const v = VMess.formUrl(`vmess://${base64UrlEncode(JSON.stringify(plain))}`);
    const out = v.toV2Ray() as Record<string, unknown>;
    expect(out["streamSettings"]).toBeUndefined();
  });
});
