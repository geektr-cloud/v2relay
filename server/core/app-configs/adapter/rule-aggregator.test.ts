import { describe, expect, it } from "vitest";
import { RuleCollection } from "@server/pkgs/rules";
import { RuleAggregator } from "./rule-aggregator";

const col = (...lines: string[]) => RuleCollection.fromRuleList(lines.join("\n"));

describe("RuleAggregator", () => {
  it("emits domain/ipcidr as inline providers and classical inline", () => {
    const agg = new RuleAggregator();
    agg.aggCollection("HK", col("DOMAIN-SUFFIX,google.com", "IP-CIDR,1.1.1.0/24", "GEOIP,CN"));
    const { rules, providers } = agg.finish();

    expect(providers).toEqual({
      "HK-domain": { type: "inline", behavior: "domain", payload: ["+.google.com"] },
      "HK-ipcidr": { type: "inline", behavior: "ipcidr", payload: ["1.1.1.0/24"] },
    });
    expect(rules).toEqual(["RULE-SET,HK-domain,HK", "RULE-SET,HK-ipcidr,HK", "GEOIP,CN,HK"]);
  });

  it("merges consecutive same-target collections (dedup)", () => {
    const agg = new RuleAggregator();
    agg.aggCollection("DIRECT", col("DOMAIN,a.com"));
    agg.aggCollection("DIRECT", col("DOMAIN,a.com", "DOMAIN,b.com"));
    const { providers } = agg.finish();
    expect(providers["DIRECT-domain"]).toEqual({
      type: "inline",
      behavior: "domain",
      payload: ["a.com", "b.com"],
    });
  });

  it("emits MATCH,<policy> when the collection has a MATCH (PROXY target)", () => {
    const agg = new RuleAggregator();
    agg.aggCollection("HK", col("DOMAIN,a.com", "MATCH"));
    const { rules } = agg.finish();
    // MATCH bound to the target, placed last
    expect(rules).toEqual(["RULE-SET,HK-domain,HK", "MATCH,HK"]);
  });

  it("keeps policy before additions for classical", () => {
    const agg = new RuleAggregator();
    agg.aggCollection("DIRECT", col("SRC-IP-CIDR,192.168.0.0/16,no-resolve"));
    expect(agg.finish().rules).toEqual(["SRC-IP-CIDR,192.168.0.0/16,DIRECT,no-resolve"]);
  });

  it("strips no-resolve when stripNoResolve is set", () => {
    const agg = new RuleAggregator([], true);
    agg.aggCollection("DIRECT", col("SRC-IP-CIDR,192.168.0.0/16,no-resolve", "GEOIP,CN,no-resolve"));
    expect(agg.finish().rules).toEqual(["SRC-IP-CIDR,192.168.0.0/16,DIRECT", "GEOIP,CN,DIRECT"]);
  });

  it("flushes on target change; non-adjacent same target gets a deduped provider name", () => {
    const agg = new RuleAggregator();
    agg.aggCollection("DIRECT", col("DOMAIN,a.com"));
    agg.aggCollection("HK", col("DOMAIN,b.com"));
    agg.aggCollection("DIRECT", col("DOMAIN,c.com"));
    const { rules, providers } = agg.finish();

    expect(Object.keys(providers)).toEqual(["DIRECT-domain", "HK-domain", "DIRECT-domain-2"]);
    expect(rules).toEqual(["RULE-SET,DIRECT-domain,DIRECT", "RULE-SET,HK-domain,HK", "RULE-SET,DIRECT-domain-2,DIRECT"]);
  });

  it("slugs non-identifier target names and avoids reserved names", () => {
    // "香港" slugs to "__"; the natural name "__-domain" is reserved → bumps to -2.
    const agg = new RuleAggregator(["__-domain"]);
    agg.aggCollection("香港", col("DOMAIN,a.com"));
    expect(Object.keys(agg.finish().providers)[0]).toBe("__-domain-2");
  });
});
