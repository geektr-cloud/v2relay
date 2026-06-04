import { AhoCorasick } from "@monyone/aho-corasick/greedy";
import Papa from "papaparse";
import countries from "world-countries";
import citiesCsv from "./cities.csv?raw";

const tag = (name: string): string => `region:${name}`;

const CONTINENT_ZH: Record<string, string> = {
  Africa: "非洲",
  Americas: "美洲",
  Asia: "亚洲",
  Europe: "欧洲",
  Oceania: "大洋洲",
  Antarctic: "南极洲",
};

/** Override where world-countries' `zho.common` is traditional (or otherwise off-mainland-canon). */
const COUNTRY_ZH_OVERRIDE: Record<string, string> = {
  TW: "台湾",
};

/** cca2 values whose tag set also includes `region:中国` (Greater China). */
const GREATER_CHINA = new Set(["TW", "HK", "MO"]);

/** Trailing Chinese admin suffixes stripped to form canonical city tag (台北市 → 台北). */
const ADMIN_SUFFIX_RE = /(市|县|縣|区|區|镇|鎮|村)$/;

type Country = (typeof countries)[number];

const zhCountryName = (c: Country): string =>
  COUNTRY_ZH_OVERRIDE[c.cca2] ?? c.translations.zho?.common ?? c.name.common;

type CityRow = { country_iso2: string; name: string; alt: string };

const buildKeywordMap = (): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();

  const add = (raw: string, tags: readonly string[], isEmoji = false): void => {
    if (!raw) return;
    const key = isEmoji ? raw : raw.toLowerCase().trim();
    if (!isEmoji && key.length < 2) return;
    const set = map.get(key) ?? new Set<string>();
    for (const t of tags) set.add(t);
    map.set(key, set);
  };

  const cca2ToTags = new Map<string, string[]>();

  for (const c of countries) {
    const baseTags = [tag(zhCountryName(c))];
    const continentZh = CONTINENT_ZH[c.region];
    if (continentZh) baseTags.push(tag(continentZh));
    if (GREATER_CHINA.has(c.cca2)) baseTags.push(tag("中国"));
    cca2ToTags.set(c.cca2, baseTags);

    add(c.name.common, baseTags);
    add(c.name.official, baseTags);
    for (const sp of c.altSpellings) if (sp.length >= 3) add(sp, baseTags);
    for (const t of Object.values(c.translations)) {
      add(t.common, baseTags);
      add(t.official, baseTags);
    }
    if (c.name.native) {
      for (const t of Object.values(c.name.native)) {
        add(t.common, baseTags);
        add(t.official, baseTags);
      }
    }
    if (c.flag) add(c.flag, baseTags, true);
    for (const cap of c.capital) add(cap, baseTags);
  }

  const parsed = Papa.parse<CityRow>(citiesCsv, { header: true, skipEmptyLines: true });
  for (const row of parsed.data) {
    if (!row?.country_iso2 || !row?.name) continue;
    const countryTags = cca2ToTags.get(row.country_iso2);
    if (!countryTags) continue;
    const stripped = row.name.replace(ADMIN_SUFFIX_RE, "").trim();
    const canonical = stripped || row.name;
    const cityTags = [tag(canonical), ...countryTags];
    add(row.name, cityTags);
    if (stripped && stripped !== row.name) add(stripped, cityTags);
    if (row.alt) {
      for (const a of row.alt.split("|")) add(a, cityTags);
    }
  }

  return map;
};

export class RegionMatcher {
  private readonly keywordToTags: Map<string, Set<string>>;
  private readonly ac: AhoCorasick;

  constructor() {
    this.keywordToTags = buildKeywordMap();
    this.ac = new AhoCorasick([...this.keywordToTags.keys()]);
  }

  match(text: string): string[] {
    const lower = text.toLowerCase();
    const hits = this.ac.matchInText(lower);
    const tags = new Set<string>();
    for (const hit of hits) {
      if (isLatin(hit.keyword)) {
        const before = hit.begin > 0 ? lower.codePointAt(hit.begin - 1) : undefined;
        const after = hit.end < lower.length ? lower.codePointAt(hit.end) : undefined;
        if (isWordChar(before) || isWordChar(after)) continue;
      }
      const tagSet = this.keywordToTags.get(hit.keyword);
      if (tagSet) for (const t of tagSet) tags.add(t);
    }
    return [...tags];
  }
}

const LATIN_RE = /^[\x20-\x7E]+$/;
const WORD_RE = /[\p{L}\p{N}_]/u;

const isLatin = (s: string): boolean => LATIN_RE.test(s);

const isWordChar = (cp: number | undefined): boolean => {
  if (cp === undefined) return false;
  return WORD_RE.test(String.fromCodePoint(cp));
};

export const regionMatcher = new RegionMatcher();
