import { describe, expect, test } from "vitest";
import { regionMatcher } from "./region-matcher";

const matchSet = (text: string): Set<string> => new Set(regionMatcher.match(text));

describe("regionMatcher", () => {
  test("capital matches country + continent", () => {
    const tags = matchSet("v2fly Berlin node 5x rate");
    expect(tags.has("region:柏林")).toBe(true);
    expect(tags.has("region:德国")).toBe(true);
    expect(tags.has("region:欧洲")).toBe(true);
  });

  test("flag emoji matches country + continent", () => {
    const tags = matchSet("🇯🇵 ssr super fast node");
    expect(tags).toEqual(new Set(["region:日本", "region:亚洲"]));
  });

  test("native CJK name matches", () => {
    const tags = matchSet("日本 ssr");
    expect(tags).toEqual(new Set(["region:日本", "region:亚洲"]));
  });

  test("word boundary blocks substring noise (fas in fast)", () => {
    const tags = matchSet("super fast node");
    expect(tags.size).toBe(0);
  });

  test("word boundary blocks chad in chadwick-like contexts", () => {
    const tags = matchSet("checkpoint relay");
    expect(tags.size).toBe(0);
  });

  test("US flag + multi-word country", () => {
    const tags = matchSet("🇺🇸 east-coast 2x");
    expect(tags).toEqual(new Set(["region:美国", "region:美洲"]));
  });

  test("case insensitive country name", () => {
    const tags = matchSet("SINGAPORE relay");
    expect(tags.has("region:新加坡")).toBe(true);
    expect(tags.has("region:亚洲")).toBe(true);
  });

  test("Hong Kong via flag + Chinese name → adds Greater China parent", () => {
    const tags = matchSet("🇭🇰 香港 节点");
    expect(tags.has("region:香港")).toBe(true);
    expect(tags.has("region:中国")).toBe(true);
    expect(tags.has("region:亚洲")).toBe(true);
  });

  test("Tokyo capital implies country", () => {
    const tags = matchSet("Tokyo premium 5x");
    expect(tags.has("region:日本")).toBe(true);
    expect(tags.has("region:亚洲")).toBe(true);
  });

  test("multiple regions in one text dedupe continent", () => {
    const tags = matchSet("Berlin + Paris relay");
    expect(tags.has("region:柏林")).toBe(true);
    expect(tags.has("region:德国")).toBe(true);
    expect(tags.has("region:巴黎")).toBe(true);
    expect(tags.has("region:法国")).toBe(true);
    expect(tags.has("region:欧洲")).toBe(true);
  });

  test("empty text returns empty", () => {
    expect(regionMatcher.match("")).toEqual([]);
  });

  test("no region returns empty", () => {
    expect(regionMatcher.match("free node 2x rate v0.1")).toEqual([]);
  });

  test("United Kingdom long name not broken by word boundary", () => {
    const tags = matchSet("United Kingdom relay");
    expect(tags.has("region:英国")).toBe(true);
    expect(tags.has("region:欧洲")).toBe(true);
  });

  test("substring inside larger Latin word does not match", () => {
    const tags = matchSet("germanyland fictional");
    expect(tags.size).toBe(0);
  });

  test("Aruba (荷属阿鲁巴) matches by Chinese alt name", () => {
    const tags = matchSet("荷属阿鲁巴 节点");
    expect(tags.has("region:阿鲁巴")).toBe(true);
    expect(tags.has("region:美洲")).toBe(true);
  });

  test("Guernsey (根西岛) matches", () => {
    const tags = matchSet("根西岛 relay");
    expect(tags.has("region:根西岛")).toBe(true);
    expect(tags.has("region:欧洲")).toBe(true);
  });

  test("San Francisco (旧金山) matches city + country + continent", () => {
    const tags = matchSet("旧金山 5x");
    expect(tags.has("region:旧金山")).toBe(true);
    expect(tags.has("region:美国")).toBe(true);
    expect(tags.has("region:美洲")).toBe(true);
  });

  test("台北 → region:中国 region:台湾 region:台北 region:亚洲", () => {
    const tags = matchSet("台北 节点 5x");
    expect(tags.has("region:台北")).toBe(true);
    expect(tags.has("region:台湾")).toBe(true);
    expect(tags.has("region:中国")).toBe(true);
    expect(tags.has("region:亚洲")).toBe(true);
  });

  test("台北市 (full form) also resolves to same tag set", () => {
    const tags = matchSet("台北市 premium");
    expect(tags.has("region:台北")).toBe(true);
    expect(tags.has("region:台湾")).toBe(true);
    expect(tags.has("region:中国")).toBe(true);
  });

  test("Taipei (English alt) resolves to canonical Chinese city tag", () => {
    const tags = matchSet("Taipei super fast");
    expect(tags.has("region:台北")).toBe(true);
    expect(tags.has("region:台湾")).toBe(true);
    expect(tags.has("region:中国")).toBe(true);
  });
});
