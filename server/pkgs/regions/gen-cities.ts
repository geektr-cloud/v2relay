/**
 * Generate cities.csv from Geonames dump (https://download.geonames.org/export/dump/).
 *
 * Inputs:
 *   - cities15000.zip       major populated places (>=15k pop)
 *   - alternateNamesV2.zip  multilingual alternate names with language codes
 *
 * Output (./cities.csv, alongside this script):
 *   country_iso2, name, alt
 *
 *   name = canonical Chinese name (cities without a zh translation are dropped).
 *         "－" and "-" replaced with spaces.
 *   alt  = pipe-joined, lowercased, language-agnostic alternate names.
 *
 * Run: `node --experimental-strip-types server/pkgs/regions/gen-cities.ts`
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import OpenCC from "opencc";

const t2s = new OpenCC("t2s.json");
const toSimplified = (s: string): string => t2s.convertSync(s);

const GEONAMES = "https://download.geonames.org/export/dump";
const CACHE_DIR = join(tmpdir(), "v2relay-geonames");
const ZH_LANGS = new Set(["zh", "zh-cn", "zh-hans", "zh-tw", "zh-hant", "zh-hk", "zh-sg"]);
const EN_LANGS = new Set(["en"]);

/** drop towns smaller than this — kills "Bailin (柏林镇, ~15k)" colliding with Berlin */
const MIN_POPULATION = 50_000;

/**
 * Geonames feature codes to keep. PPLC=capital, PPLA/A2/A3/A4=admin seat, PPL=generic populated place.
 * Excludes: PPLX (subdivision of city), PPLH (historical), PPLQ (abandoned), PPLF (farm village),
 * PPLW (destroyed), PPLL (locality), PPLS (populated places), PPLR (religious), PPLCH (historical capital).
 */
const KEEP_FCODES = new Set(["PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPL"]);

type CityRecord = {
  geonameid: string;
  country: string;
  /** Geonames canonical (usually English/ASCII). Stored for fallback into `alt`. */
  rawName: string;
  population: number;
  /** Chosen Chinese name. Filled from zh alternates. Cities with none are dropped. */
  nameZh: string | null;
  /** True once nameZh was set from an isPreferredName=1 row — don't overwrite. */
  nameZhPreferred: boolean;
  alt: Set<string>;
};

const normalizeName = (s: string): string => s.replace(/[-－]/g, " ").replace(/\s+/g, " ").trim();

const ensureCache = async (): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
};

const downloadAndExtract = async (filename: string): Promise<string> => {
  const zipPath = join(CACHE_DIR, filename);
  const txtName = filename.replace(/\.zip$/, ".txt");
  const txtPath = join(CACHE_DIR, txtName);

  try {
    await stat(txtPath);
    console.log(`cached: ${txtName}`);
    return txtPath;
  } catch {
    /* not cached */
  }

  try {
    await stat(zipPath);
  } catch {
    const url = `${GEONAMES}/${filename}`;
    console.log(`downloading ${url}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(zipPath, buf);
  }

  console.log(`unzipping ${filename}...`);
  execSync(`unzip -o "${zipPath}" -d "${CACHE_DIR}"`, { stdio: "ignore" });
  return txtPath;
};

const streamLines = async function* (path: string): AsyncGenerator<string[]> {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf-8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line || line.startsWith("#")) continue;
    yield line.split("\t");
  }
};

const main = async (): Promise<void> => {
  await ensureCache();
  const [citiesPath, altPath] = await Promise.all([
    downloadAndExtract("cities15000.zip"),
    downloadAndExtract("alternateNamesV2.zip"),
  ]);

  const byGeonameId = new Map<string, CityRecord>();
  let cityCount = 0;
  let droppedFcode = 0;
  let droppedPop = 0;
  for await (const cols of streamLines(citiesPath)) {
    const [geonameid, name, , , , , , fcode, countryCode, , , , , , populationStr] = cols;
    if (!geonameid || !name || !countryCode) continue;
    if (!fcode || !KEEP_FCODES.has(fcode)) {
      droppedFcode++;
      continue;
    }
    const population = Number(populationStr ?? "0") || 0;
    if (population < MIN_POPULATION) {
      droppedPop++;
      continue;
    }
    byGeonameId.set(geonameid, {
      geonameid,
      country: countryCode,
      rawName: name,
      population,
      nameZh: null,
      nameZhPreferred: false,
      alt: new Set([name.toLowerCase()]),
    });
    cityCount++;
  }
  console.log(`cities loaded: ${cityCount} (dropped fcode=${droppedFcode}, pop<${MIN_POPULATION}=${droppedPop})`);

  let altCount = 0;
  let altMatched = 0;
  for await (const cols of streamLines(altPath)) {
    altCount++;
    const [, geonameid, isolanguage, altName, isPreferred, , isColloquial, isHistoric] = cols;
    if (!geonameid || !isolanguage || !altName) continue;
    if (isHistoric === "1" || isColloquial === "1") continue;
    const rec = byGeonameId.get(geonameid);
    if (!rec) continue;
    const lang = isolanguage.toLowerCase();
    let normalized: string;
    if (EN_LANGS.has(lang)) {
      normalized = altName;
    } else if (ZH_LANGS.has(lang)) {
      normalized = toSimplified(altName);
      // promote nameZh: prefer isPreferredName=1, otherwise keep first-seen
      if (!rec.nameZh || (isPreferred === "1" && !rec.nameZhPreferred)) {
        rec.nameZh = normalized;
        if (isPreferred === "1") rec.nameZhPreferred = true;
      }
    } else {
      continue;
    }
    rec.alt.add(normalized.toLowerCase());
    altMatched++;
    if (altCount % 1_000_000 === 0) console.log(`  scanned ${altCount} alt rows...`);
  }
  console.log(`alt rows scanned: ${altCount}, matched: ${altMatched}`);

  /**
   * nameZh collision dedupe: if "柏林" is the canonical zh of both Bailin (CN, ~15k) and
   * Berlin (DE, ~3.5M), keep only the highest-pop owner. Loser's nameZh cleared → row dropped.
   */
  const zhOwner = new Map<string, CityRecord>();
  for (const rec of byGeonameId.values()) {
    if (!rec.nameZh) continue;
    const incumbent = zhOwner.get(rec.nameZh);
    if (!incumbent || rec.population > incumbent.population) zhOwner.set(rec.nameZh, rec);
  }
  let zhDropped = 0;
  for (const rec of byGeonameId.values()) {
    if (rec.nameZh && zhOwner.get(rec.nameZh) !== rec) {
      rec.nameZh = null;
      zhDropped++;
    }
  }
  console.log(`zh-name collisions dropped: ${zhDropped}`);

  const rows = [...byGeonameId.values()]
    .filter((r) => r.nameZh !== null)
    .map((r) => {
      const name = normalizeName(r.nameZh!);
      const alt = [...r.alt].filter((a) => a !== name).join("|");
      return { country_iso2: r.country, name, alt };
    })
    .sort((a, b) => a.country_iso2.localeCompare(b.country_iso2) || a.name.localeCompare(b.name));

  const csv = Papa.unparse(rows, { header: true, columns: ["country_iso2", "name", "alt"] });
  const outPath = join(dirname(fileURLToPath(import.meta.url)), "cities.csv");
  await writeFile(outPath, csv, "utf-8");
  console.log(`wrote ${rows.length} rows -> ${outPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
