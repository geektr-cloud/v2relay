import { classical, defineRule, domainExact, domainSuffix, ipcidr } from "./base";
import type { Rule, RuleStatic } from "./types";

export { defineRule } from "./base";
export type { RuleOpts, RuleClass } from "./base";
export { RuleCollection } from "./collection";
export type { RuleSetGroups } from "./collection";
export type { Rule, RuleStatic, RuleSetType } from "./types";

/**
 * 所有支持的规则类（仿 `pkgs/protocols` 的 `Protocols`）。
 *
 * 顺序无关——{@link findRule} 按前缀精确匹配。逻辑组合 `AND/OR/NOT`、
 * `RULE-SET`、`SUB-RULE`、`MATCH` **不在此列**：它们引用其他规则/策略，
 * 无法降级为 rule-providers 载荷（classical 也明确排除 rule-set/sub-rule）。
 *
 * 第二个参数决定 {@link Rule.toRuleSetItem} 的降级目标；省略即 `classical`。
 */
export const Rules = [
  // 域名类
  defineRule("DOMAIN", domainExact),
  defineRule("DOMAIN-SUFFIX", domainSuffix),
  defineRule("DOMAIN-KEYWORD"),
  defineRule("DOMAIN-WILDCARD"),
  defineRule("DOMAIN-REGEX"),
  defineRule("GEOSITE"),
  // 目标 IP 类
  defineRule("IP-CIDR", ipcidr),
  defineRule("IP-CIDR6", ipcidr),
  defineRule("IP-SUFFIX"),
  defineRule("IP-ASN"),
  defineRule("GEOIP"),
  // 源 IP 类
  defineRule("SRC-GEOIP"),
  defineRule("SRC-IP-ASN"),
  defineRule("SRC-IP-CIDR"),
  defineRule("SRC-IP-SUFFIX"),
  // 端口类
  defineRule("DST-PORT"),
  defineRule("SRC-PORT"),
  // 入站类
  defineRule("IN-PORT"),
  defineRule("IN-TYPE"),
  defineRule("IN-USER"),
  defineRule("IN-NAME"),
  // 进程类
  defineRule("PROCESS-PATH"),
  defineRule("PROCESS-PATH-WILDCARD"),
  defineRule("PROCESS-PATH-REGEX"),
  defineRule("PROCESS-NAME"),
  defineRule("PROCESS-NAME-WILDCARD"),
  defineRule("PROCESS-NAME-REGEX"),
  // 其他
  defineRule("UID"),
  defineRule("NETWORK"),
  defineRule("DSCP"),
] as const satisfies readonly RuleStatic[];

/** 按前缀（精确）找到对应规则类，找不到返回 null。 */
export const findRule = (prefix: string): RuleStatic | null => Rules.find((R) => R.prefix === prefix) ?? null;

/**
 * 解析单行规则（template 形式，**不含 policy**）成规则实例；
 * 前缀未命中已知规则、空行、或仅含逗号无前缀时返回 null。
 */
export const parseRule = (line: string): Rule | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const i = trimmed.indexOf(",");
  const prefix = (i === -1 ? trimmed : trimmed.slice(0, i)).trim();
  const R = findRule(prefix);
  return R ? R.fromString(trimmed) : null;
};

/**
 * 把规则重新序列化成 mihomo 完整规则行：`<prefix>,<content>,<policy>[,no-resolve][,src]`。
 *
 * 注意附加参数必须排在 **policy 之后**——所以不能简单地 `rule.toString() + ","+ policy`。
 */
export const stringifyWithPolicy = (rule: Rule, policy: string): string => {
  const parts = [rule.prefix];
  if (rule.content) parts.push(rule.content);
  parts.push(policy);
  if (rule.no_resolve) parts.push("no-resolve");
  if (rule.src) parts.push("src");
  return parts.join(",");
};
