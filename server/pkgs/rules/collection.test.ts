import { describe, expect, it } from "vitest";
import { RuleCollection } from "./collection";

const SAMPLE = [
  "DOMAIN,ad.com",
  "DOMAIN-SUFFIX,google.com",
  "DOMAIN-KEYWORD,google",
  "IP-CIDR,127.0.0.0/8,no-resolve",
  "IP-CIDR6,2620:0:2d0:200::7/32",
  "SRC-IP-CIDR,192.168.1.201/32",
].join("\n");

describe("RuleCollection.fromRuleList", () => {
  it("classifies into classical/domain/ipcidr", () => {
    const groups = RuleCollection.fromRuleList(SAMPLE).toGroups();
    expect(groups.domain).toEqual(["ad.com", "+.google.com"]);
    expect(groups.ipcidr).toEqual(["127.0.0.0/8", "2620:0:2d0:200::7/32"]);
    expect(groups.classical).toEqual(["DOMAIN-KEYWORD,google", "SRC-IP-CIDR,192.168.1.201/32"]);
  });

  it("skips empty lines, comments, and unparseable rules", () => {
    const c = RuleCollection.fromRuleList("\n# a comment\nMATCH,auto\nDOMAIN,ok.com\n  ");
    expect(c.toGroups().domain).toEqual(["ok.com"]);
    expect(c.toGroups().classical).toEqual([]); // MATCH is not a bucket payload
    expect(c.hasMatch).toBe(true); // ...but its presence is remembered
  });

  it("dedupes by template string", () => {
    const groups = RuleCollection.fromRuleList("DOMAIN,a.com\nDOMAIN,a.com\nIP-CIDR,1.1.1.0/24\nIP-CIDR,1.1.1.0/24").toGroups();
    expect(groups.domain).toEqual(["a.com"]);
    expect(groups.ipcidr).toEqual(["1.1.1.0/24"]);
  });
});

describe("parseAddRule", () => {
  it("returns true on parse, false otherwise", () => {
    const c = new RuleCollection();
    expect(c.parseAddRule("DOMAIN,a.com")).toBe(true);
    expect(c.parseAddRule("# comment")).toBe(false);
    expect(c.parseAddRule("")).toBe(false);
  });

  it("records MATCH without bucketing it", () => {
    const c = new RuleCollection();
    expect(c.parseAddRule("MATCH,auto")).toBe(true);
    expect(c.hasMatch).toBe(true);
    expect(c.toGroups()).toEqual({ classical: [], domain: [], ipcidr: [] });
  });

  it("merges hasMatch across collections", () => {
    const a = RuleCollection.fromRuleList("DOMAIN,a.com");
    expect(a.hasMatch).toBe(false);
    a.addCollections(RuleCollection.fromRuleList("MATCH"));
    expect(a.hasMatch).toBe(true);
  });
});

describe("toJSON / fromJson roundtrip", () => {
  it("toJSON serializes groups", () => {
    const json = RuleCollection.fromRuleList("DOMAIN-SUFFIX,x.com\nIP-CIDR,10.0.0.0/8").toJSON();
    expect(JSON.parse(json)).toEqual({
      classical: [],
      domain: ["+.x.com"],
      ipcidr: ["10.0.0.0/8"],
    });
  });

  it("fromJson reconstructs rules (rule-list roundtrips)", () => {
    const original = RuleCollection.fromRuleList(SAMPLE);
    const rebuilt = RuleCollection.fromJson(original.toJSON());
    // groups survive the JSON roundtrip
    expect(rebuilt.toGroups()).toEqual(original.toGroups());
    // rebuilt rule lines: domain payloads reverse to DOMAIN / DOMAIN-SUFFIX,
    // ipcidr to IP-CIDR, classical verbatim. Note `no-resolve` is lost — the
    // ipcidr payload carries no additions (they live at the RULE-SET level).
    expect(rebuilt.toRuleList().split("\n")).toEqual([
      "DOMAIN-KEYWORD,google",
      "SRC-IP-CIDR,192.168.1.201/32",
      "DOMAIN,ad.com",
      "DOMAIN-SUFFIX,google.com",
      "IP-CIDR,127.0.0.0/8",
      "IP-CIDR,2620:0:2d0:200::7/32",
    ]);
  });

  it("ignores malformed json", () => {
    expect(RuleCollection.fromJson("not json").toGroups()).toEqual({ classical: [], domain: [], ipcidr: [] });
    expect(RuleCollection.fromJson("null").toGroups()).toEqual({ classical: [], domain: [], ipcidr: [] });
  });
});

describe("addCollections", () => {
  it("merges and dedupes", () => {
    const a = RuleCollection.fromRuleList("DOMAIN,a.com\nIP-CIDR,1.0.0.0/8");
    const b = RuleCollection.fromRuleList("DOMAIN,a.com\nDOMAIN,b.com");
    a.addCollections(b);
    expect(a.toGroups()).toEqual({
      classical: [],
      domain: ["a.com", "b.com"],
      ipcidr: ["1.0.0.0/8"],
    });
  });
});

describe("toRuleList", () => {
  it("keeps additions in classical payloads", () => {
    expect(RuleCollection.fromRuleList("SRC-IP-CIDR,192.168.1.201/32,no-resolve").toRuleList()).toBe(
      "SRC-IP-CIDR,192.168.1.201/32,no-resolve",
    );
  });

  it("drops additions from ipcidr/domain payloads", () => {
    expect(RuleCollection.fromRuleList("IP-CIDR,127.0.0.0/8,no-resolve").toRuleList()).toBe("IP-CIDR,127.0.0.0/8");
  });
});
