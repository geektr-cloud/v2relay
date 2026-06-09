import type { Rule, RuleSetType, RuleStatic } from "./types";

/** 规则附加参数；目前 mihomo 仅有 `no-resolve` 与 `src` 两种。 */
const ADDITIONS = new Set(["no-resolve", "src"]);

export interface RuleOpts {
  no_resolve?: boolean;
  src?: boolean;
}

/** 由 {@link defineRule} 生成的规则类，同时满足静态侧 {@link RuleStatic} 与实例构造签名。 */
export type RuleClass = RuleStatic & (new (content: string, opts?: RuleOpts) => Rule);

/**
 * 把单行规则（**不含 policy**，即 template 形式）按前缀拆出 `content` 与附加参数。
 * 仅当行以 `<prefix>,` 开头（或恰好等于 `prefix`）时返回，否则返回 null。
 *
 * 附加参数只能尾随出现，从尾部逐个剥离；其余部分重新 join 回 `content`
 * （兼容路径中含逗号的边角情况，虽然现实里几乎不会出现）。
 */
function parseBody(prefix: string, line: string): { content: string; opts: RuleOpts } | null {
  const trimmed = line.trim();
  if (trimmed !== prefix && !trimmed.startsWith(`${prefix},`)) return null;

  const rest = trimmed === prefix ? "" : trimmed.slice(prefix.length + 1);
  const parts = rest.length ? rest.split(",") : [];

  const opts: RuleOpts = {};
  while (parts.length) {
    const last = parts[parts.length - 1]!.trim();
    if (last === "no-resolve") opts.no_resolve = true;
    else if (last === "src") opts.src = true;
    else break;
    parts.pop();
  }

  return { content: parts.join(",").trim(), opts };
}

/** classical rule-set：原样保留前缀与附加参数（去掉 policy）。 */
export const classical = (r: Rule): [RuleSetType, string] => ["classical", r.toString()];
/** domain rule-set，DOMAIN 精确匹配：payload 即裸域名。 */
export const domainExact = (r: Rule): [RuleSetType, string] => ["domain", r.content];
/** domain rule-set，DOMAIN-SUFFIX：payload 用 clash 通配前缀 `+.` 表示后缀匹配。 */
export const domainSuffix = (r: Rule): [RuleSetType, string] => ["domain", `+.${r.content}`];
/** ipcidr rule-set：payload 即裸 CIDR。 */
export const ipcidr = (r: Rule): [RuleSetType, string] => ["ipcidr", r.content];

/**
 * 工厂：给定前缀与 {@link Rule.toRuleSetItem} 行为，生成一个规则类。
 *
 * 仿照 `pkgs/protocols`：每个类的静态侧（`prefix` + `fromString`）即 {@link RuleStatic}，
 * 实例侧即 {@link Rule}。`toItem` 决定该前缀如何降级到 rule-providers 的三种载荷之一。
 */
export function defineRule(prefix: string, toItem: (r: Rule) => [RuleSetType, string] = classical): RuleClass {
  class GeneratedRule implements Rule {
    static readonly prefix = prefix;
    readonly prefix = prefix;
    content: string;
    no_resolve?: true;
    src?: true;

    constructor(content: string, opts: RuleOpts = {}) {
      this.content = content;
      if (opts.no_resolve) this.no_resolve = true;
      if (opts.src) this.src = true;
    }

    static fromString(s: string): Rule | null {
      const body = parseBody(prefix, s);
      return body ? new GeneratedRule(body.content, body.opts) : null;
    }

    /** template 形式：`<prefix>,<content>[,no-resolve][,src]`（不含 policy）。 */
    toString(): string {
      const parts = [prefix];
      if (this.content) parts.push(this.content);
      if (this.no_resolve) parts.push("no-resolve");
      if (this.src) parts.push("src");
      return parts.join(",");
    }

    toRuleSetItem(): [RuleSetType, string] {
      return toItem(this);
    }
  }

  // 让生成类有可读的名字（DOMAIN-SUFFIX → DOMAINSUFFIX），便于调试。
  Object.defineProperty(GeneratedRule, "name", { value: prefix.replace(/[^A-Za-z0-9]/g, "") });
  return GeneratedRule;
}

export { ADDITIONS };
