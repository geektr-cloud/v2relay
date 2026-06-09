import { parseRule } from "./index";
import type { Rule, RuleSetType } from "./types";

/** `{classical,domain,ipcidr}` 载荷分组——即 rule-providers 副本的 JSON 形状。 */
export type RuleSetGroups = Record<RuleSetType, string[]>;

const TYPES = ["classical", "domain", "ipcidr"] as const satisfies readonly RuleSetType[];

/**
 * 把一条 rule-providers 载荷反推回传统规则行（{@link Rule.toRuleSetItem} 的逆）：
 *   - classical：载荷本身就是完整规则行
 *   - domain：`+.x` → DOMAIN-SUFFIX，否则 DOMAIN（精确）
 *   - ipcidr：补回 IP-CIDR 前缀
 */
function itemToLine(type: RuleSetType, payload: string): string {
  switch (type) {
    case "classical":
      return payload;
    case "domain":
      return payload.startsWith("+.") ? `DOMAIN-SUFFIX,${payload.slice(2)}` : `DOMAIN,${payload}`;
    case "ipcidr":
      return `IP-CIDR,${payload}`;
  }
}

/**
 * 一批规则的容器，内部按 {@link RuleSetType}（classical/domain/ipcidr）分三个
 * `Set<string>` 存储 rule-providers 载荷，天然按载荷去重。
 *
 * 既能与传统规则行（{@link toRuleList}）互转，也能与 rule-providers 副本
 * （{@link toJSON} / {@link fromJson}）互转。
 *
 * 注意：`no-resolve` / `src` 等附加参数只保留在 classical 载荷里；domain / ipcidr
 * 载荷不含附加参数（它们属于 RULE-SET 引用层），入库时即丢弃。
 */
export class RuleCollection {
  private readonly buckets: Record<RuleSetType, Set<string>> = {
    classical: new Set(),
    domain: new Set(),
    ipcidr: new Set(),
  };

  /** 从 `{classical,domain,ipcidr}` JSON 字符串构造；非字符串载荷与解析失败被静默跳过。 */
  static fromJson(s: string): RuleCollection {
    const c = new RuleCollection();
    let doc: unknown;
    try {
      doc = JSON.parse(s);
    } catch {
      return c;
    }
    if (!doc || typeof doc !== "object") return c;
    const groups = doc as Partial<RuleSetGroups>;
    for (const type of TYPES) {
      const arr = groups[type];
      if (!Array.isArray(arr)) continue;
      for (const payload of arr) if (typeof payload === "string") c.buckets[type].add(payload);
    }
    return c;
  }

  /** 从传统规则行文本构造：逐行 {@link parseAddRule}，空行/注释/无法解析的行被跳过。 */
  static fromRuleList(s: string): RuleCollection {
    const c = new RuleCollection();
    for (const line of s.split("\n")) c.parseAddRule(line);
    return c;
  }

  /** 解析单行规则并加入；解析失败（空行、注释、未知前缀）返回 false。 */
  parseAddRule(s: string): boolean {
    const line = s.trim();
    if (!line || line.startsWith("#")) return false;
    const rule = parseRule(line);
    if (!rule) return false;
    this.addRule(rule);
    return true;
  }

  /** 加入一条规则实例：归类成载荷存入对应 set（按载荷去重）。 */
  addRule(rule: Rule): void {
    const [type, payload] = rule.toRuleSetItem();
    this.buckets[type].add(payload);
  }

  /** 合并其它若干 {@link RuleCollection}（按载荷去重）。 */
  addCollections(...collections: RuleCollection[]): void {
    for (const c of collections) for (const type of TYPES) for (const p of c.buckets[type]) this.buckets[type].add(p);
  }

  /** 归类成 `{classical,domain,ipcidr}` 载荷分组。 */
  toGroups(): RuleSetGroups {
    return {
      classical: Array.from(this.buckets.classical),
      domain: Array.from(this.buckets.domain),
      ipcidr: Array.from(this.buckets.ipcidr),
    };
  }

  /** 序列化成 rule-providers 副本（`{classical,domain,ipcidr}` JSON）。 */
  toJSON(): string {
    return JSON.stringify(this.toGroups());
  }

  /** 序列化回传统规则行文本（template 形式，不含 policy），换行分隔；顺序 classical→domain→ipcidr。 */
  toRuleList(): string {
    const lines: string[] = [];
    for (const type of TYPES) for (const payload of this.buckets[type]) lines.push(itemToLine(type, payload));
    return lines.join("\n");
  }
}
