import { describe, expect, it } from "vitest";
import { Rule } from "./index";

describe("Rule.parse", () => {
  it("parses basic domain rule", () => {
    const r = Rule.parse("DOMAIN,ad.com,REJECT")!;
    expect(r).toEqual(new Rule("DOMAIN", "ad.com", "REJECT", ""));
  });

  it("parses rule with additions", () => {
    const r = Rule.parse("IP-CIDR,127.0.0.0/8,DIRECT,no-resolve")!;
    expect(r).toEqual(new Rule("IP-CIDR", "127.0.0.0/8", "DIRECT", "no-resolve"));
  });

  it("parses MATCH (no argument)", () => {
    const r = Rule.parse("MATCH,auto")!;
    expect(r).toEqual(new Rule("MATCH", "", "auto", ""));
  });

  it("handles logical rules", () => {
    expect(Rule.parse("AND,((DOMAIN,baidu.com),(NETWORK,UDP)),DIRECT")).toEqual(
      new Rule("AND", "((DOMAIN,baidu.com),(NETWORK,UDP))", "DIRECT", ""),
    );
    expect(Rule.parse("NOT,((DOMAIN,baidu.com)),PROXY")).toEqual(new Rule("NOT", "((DOMAIN,baidu.com))", "PROXY", ""));
    expect(Rule.parse("SUB-RULE,(NETWORK,tcp),sub-rule")).toEqual(
      new Rule("SUB-RULE", "(NETWORK,tcp)", "sub-rule", ""),
    );
  });

  it("returns null for empty lines", () => {
    expect(Rule.parse("")).toBeNull();
    expect(Rule.parse("  ")).toBeNull();
  });

  it("parses process path with backslashes", () => {
    const r = Rule.parse("PROCESS-PATH,C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe,PROXY")!;
    expect(r).toEqual(
      new Rule("PROCESS-PATH", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "PROXY", ""),
    );
  });
});

describe("Rule.stringify", () => {
  it("stringifies basic rule", () => {
    expect(new Rule("DOMAIN", "ad.com", "REJECT", "").stringify()).toBe("DOMAIN,ad.com,REJECT");
  });

  it("stringifies rule with additions", () => {
    expect(new Rule("IP-CIDR", "127.0.0.0/8", "DIRECT", "no-resolve").stringify()).toBe(
      "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    );
  });

  it("stringifies MATCH", () => {
    expect(new Rule("MATCH", "", "auto", "").stringify()).toBe("MATCH,auto");
  });

  it("roundtrips logical rules", () => {
    const input = "AND,((DOMAIN,baidu.com),(NETWORK,UDP)),DIRECT";
    expect(Rule.parse(input)!.stringify()).toBe(input);
  });
});

describe("Rule.parseTemplate", () => {
  it("parses basic template", () => {
    expect(Rule.parseTemplate("DOMAIN,ad.com")).toEqual(new Rule("DOMAIN", "ad.com", "", ""));
  });

  it("parses template with additions", () => {
    expect(Rule.parseTemplate("IP-CIDR,127.0.0.0/8,no-resolve")).toEqual(
      new Rule("IP-CIDR", "127.0.0.0/8", "", "no-resolve"),
    );
  });

  it("parses MATCH (no argument, no policy)", () => {
    expect(Rule.parseTemplate("MATCH")).toEqual(new Rule("MATCH", "", "", ""));
  });

  it("parses logical template", () => {
    expect(Rule.parseTemplate("AND,((DOMAIN,baidu.com),(NETWORK,UDP))")).toEqual(
      new Rule("AND", "((DOMAIN,baidu.com),(NETWORK,UDP))", "", ""),
    );
  });

  it("parses IP-CIDR6 template", () => {
    expect(Rule.parseTemplate("IP-CIDR6,2620:0:2d0:200::7/32")).toEqual(
      new Rule("IP-CIDR6", "2620:0:2d0:200::7/32", "", ""),
    );
  });

  it("parses process path template", () => {
    expect(Rule.parseTemplate("PROCESS-PATH,C:\\Program Files\\chrome.exe")).toEqual(
      new Rule("PROCESS-PATH", "C:\\Program Files\\chrome.exe", "", ""),
    );
  });

  it("returns null for empty", () => {
    expect(Rule.parseTemplate("")).toBeNull();
  });
});
