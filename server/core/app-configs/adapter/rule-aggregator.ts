import { parseRule, RuleCollection, stringifyWithPolicy } from "@server/pkgs/rules";

/**
 * 把按目标（policy）流式喂入的规则聚合成 clash 的 `rules` + `rule-providers`。
 *
 * 流式语义：连续相同 `target` 的集合合并去重；`target` 一变就 flush 上一个目标——
 * 因此规则顺序严格按喂入顺序保留（不跨目标重排）。flush 时：
 *   - domain / ipcidr 桶 → inline rule-provider + `RULE-SET,<name>,<target>` 引用
 *   - classical 桶 → 直接写进 `rules`（重解析 + stringifyWithPolicy 保证 policy 在附加参数之前）
 *
 * provider 名按 `[^A-Za-z0-9_.-]→_` slug 化，并对（含模板已有的）已用名去重。
 */
export class RuleAggregator {
  readonly rules: string[] = [];
  readonly providers: Record<string, unknown> = {};

  private currentTarget: string | null = null;
  private currentCollection: RuleCollection | null = null;
  private readonly usedNames: Set<string>;

  /**
   * @param reservedNames 模板里已存在的 rule-provider 名，用于避免命名冲突。
   * @param stripNoResolve 为 true 时丢弃 classical 规则的 `no-resolve` 附加参数。
   */
  constructor(
    reservedNames: Iterable<string> = [],
    private readonly stripNoResolve = false,
  ) {
    this.usedNames = new Set(reservedNames);
  }

  /** 把集合 c 聚合到目标 target 下；target 变化时先 flush 上一个目标。 */
  aggCollection(target: string, c: RuleCollection): void {
    if (target !== this.currentTarget) {
      this.flush();
      this.currentTarget = target;
      this.currentCollection = new RuleCollection();
    }
    this.currentCollection!.addCollections(c);
  }

  /** 收尾：flush 最后一个目标，返回最终结果。调用后 rules / providers 即完整。 */
  finish(): { rules: string[]; providers: Record<string, unknown> } {
    this.flush();
    return { rules: this.rules, providers: this.providers };
  }

  private flush(): void {
    if (!this.currentTarget || !this.currentCollection) return;
    const policy = this.currentTarget;
    const groups = this.currentCollection.toGroups();

    if (groups.domain.length) {
      const name = this.uniqueName(`${policy}-domain`);
      this.providers[name] = { type: "inline", behavior: "domain", payload: groups.domain };
      this.rules.push(`RULE-SET,${name},${policy}`);
    }
    if (groups.ipcidr.length) {
      const name = this.uniqueName(`${policy}-ipcidr`);
      this.providers[name] = { type: "inline", behavior: "ipcidr", payload: groups.ipcidr };
      this.rules.push(`RULE-SET,${name},${policy}`);
    }
    for (const payload of groups.classical) {
      const rule = parseRule(payload);
      if (rule && this.stripNoResolve) rule.no_resolve = undefined;
      this.rules.push(rule ? stringifyWithPolicy(rule, policy) : `${payload},${policy}`);
    }

    // 终端 MATCH 排在该目标最后：路由含 MATCH → `MATCH,<policy>`（PROXY 时即 target）。
    if (this.currentCollection.hasMatch) this.rules.push(`MATCH,${policy}`);

    this.currentTarget = null;
    this.currentCollection = null;
  }

  private uniqueName(want: string): string {
    const slug = want.replace(/[^A-Za-z0-9_.-]/g, "_") || "p";
    let name = slug;
    for (let i = 2; this.usedNames.has(name); i++) name = `${slug}-${i}`;
    this.usedNames.add(name);
    return name;
  }
}
