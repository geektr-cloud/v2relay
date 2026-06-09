import { describe, expect, it } from "vitest";
import { findRule, parseRule, stringifyWithPolicy } from "./index";

describe("parseRule", () => {
  it("parses a basic rule (no policy)", () => {
    const r = parseRule("SRC-IP-CIDR,192.168.1.201/32")!;
    expect(r.prefix).toBe("SRC-IP-CIDR");
    expect(r.content).toBe("192.168.1.201/32");
    expect(r.no_resolve).toBeUndefined();
    expect(r.src).toBeUndefined();
  });

  it("parses trailing no-resolve addition", () => {
    const r = parseRule("IP-CIDR,127.0.0.0/8,no-resolve")!;
    expect(r.content).toBe("127.0.0.0/8");
    expect(r.no_resolve).toBe(true);
  });

  it("parses stacked additions (no-resolve + src)", () => {
    const r = parseRule("IP-CIDR,127.0.0.0/8,no-resolve,src")!;
    expect(r.content).toBe("127.0.0.0/8");
    expect(r.no_resolve).toBe(true);
    expect(r.src).toBe(true);
  });

  it("keeps backslashes in process paths", () => {
    const r = parseRule("PROCESS-PATH,C:\\Program Files\\chrome.exe")!;
    expect(r.content).toBe("C:\\Program Files\\chrome.exe");
  });

  it("returns null for empty / unknown / logical prefixes", () => {
    expect(parseRule("")).toBeNull();
    expect(parseRule("  ")).toBeNull();
    expect(parseRule("RULE-SET,foo")).toBeNull();
    expect(parseRule("AND,((DOMAIN,a.com)),DIRECT")).toBeNull();
    expect(parseRule("BOGUS,x")).toBeNull();
  });

  it("does not let IP-CIDR steal IP-CIDR6", () => {
    expect(parseRule("IP-CIDR6,2620:0:2d0:200::7/32")!.prefix).toBe("IP-CIDR6");
  });
});

describe("MATCH", () => {
  it("parses to the terminal MATCH rule (content-less)", () => {
    const r = parseRule("MATCH")!;
    expect(r.prefix).toBe("MATCH");
    expect(r.content).toBe("");
    expect(r.toString()).toBe("MATCH");
  });

  it("ignores any trailing token (templates carry no policy)", () => {
    expect(parseRule("MATCH,auto")!.prefix).toBe("MATCH");
  });

  it("re-emits with policy via stringifyWithPolicy", () => {
    expect(stringifyWithPolicy(parseRule("MATCH")!, "DIRECT")).toBe("MATCH,DIRECT");
  });
});

describe("Rule.toString", () => {
  it("roundtrips template form", () => {
    expect(parseRule("DOMAIN-SUFFIX,google.com")!.toString()).toBe("DOMAIN-SUFFIX,google.com");
    expect(parseRule("IP-CIDR,127.0.0.0/8,no-resolve")!.toString()).toBe("IP-CIDR,127.0.0.0/8,no-resolve");
  });
});

describe("stringifyWithPolicy", () => {
  it("places policy before additions", () => {
    const r = parseRule("IP-CIDR,127.0.0.0/8,no-resolve")!;
    expect(stringifyWithPolicy(r, "DIRECT")).toBe("IP-CIDR,127.0.0.0/8,DIRECT,no-resolve");
  });

  it("handles plain rule", () => {
    expect(stringifyWithPolicy(parseRule("DOMAIN,ad.com")!, "REJECT")).toBe("DOMAIN,ad.com,REJECT");
  });
});

describe("toRuleSetItem", () => {
  it("DOMAIN -> domain (exact)", () => {
    expect(parseRule("DOMAIN,google.com")!.toRuleSetItem()).toEqual(["domain", "google.com"]);
  });

  it("DOMAIN-SUFFIX -> domain (+. prefix)", () => {
    expect(parseRule("DOMAIN-SUFFIX,google.com")!.toRuleSetItem()).toEqual(["domain", "+.google.com"]);
  });

  it("IP-CIDR / IP-CIDR6 -> ipcidr (bare cidr)", () => {
    expect(parseRule("IP-CIDR,127.0.0.0/8")!.toRuleSetItem()).toEqual(["ipcidr", "127.0.0.0/8"]);
    expect(parseRule("IP-CIDR6,2620:0:2d0:200::7/32")!.toRuleSetItem()).toEqual([
      "ipcidr",
      "2620:0:2d0:200::7/32",
    ]);
  });

  it("SRC-IP-CIDR -> classical (full template line)", () => {
    expect(parseRule("SRC-IP-CIDR,192.168.1.201/32")!.toRuleSetItem()).toEqual([
      "classical",
      "SRC-IP-CIDR,192.168.1.201/32",
    ]);
  });

  it("DOMAIN-KEYWORD / GEOSITE fall back to classical", () => {
    expect(parseRule("DOMAIN-KEYWORD,google")!.toRuleSetItem()).toEqual(["classical", "DOMAIN-KEYWORD,google"]);
    expect(parseRule("GEOSITE,youtube")!.toRuleSetItem()).toEqual(["classical", "GEOSITE,youtube"]);
  });
});

describe("findRule", () => {
  it("matches by exact prefix", () => {
    expect(findRule("IP-CIDR")?.prefix).toBe("IP-CIDR");
    expect(findRule("nope")).toBeNull();
  });
});
