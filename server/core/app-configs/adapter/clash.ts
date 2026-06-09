import YAML from "yaml";
import { prisma } from "@server/db";
import { RulesetManager } from "@server/core/rulesets/ruleset-manager";
import { RuleCollection } from "@server/pkgs/rules";
import { type Filter, filterNodes } from "@server/core/nodes/node-filter";
import { RuleAggregator } from "./rule-aggregator";
import type { Node } from "@server/core/nodes/schema";
import type { Route } from "@server/core/routes/schema";
import type { AppConfigAdapter } from "./base";

export interface ClashConfigData {
  routes: string[];
}

export class ClashConfigAdapter implements AppConfigAdapter {
  constructor(
    private template: string,
    private config: ClashConfigData,
    private nodeFilter: Filter = { type: "none" },
    private displayName: string = "",
    private keepNoResolve: boolean = false,
    private updateIntervalHours: number = 24,
  ) {}

  async build(): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = this.template ? (YAML.parse(this.template) ?? {}) : {};

    let allNodes = await prisma.node.findMany();
    if (this.nodeFilter && this.nodeFilter.type !== "none") {
      allNodes = filterNodes(allNodes, this.nodeFilter);
    }
    allNodes = allNodes.sort((a, b) => `${a.subscriptionId}-${a.name}`.localeCompare(`${b.subscriptionId}-${b.name}`));

    const proxies: unknown[] = [];
    const seenProxy = new Set<string>();
    const addProxy = (n: Node) => {
      if (!n.connInfo || seenProxy.has(n.name)) return;
      seenProxy.add(n.name);
      proxies.push(n.connInfo);
    };

    const routeRows: Route[] = this.config.routes.length
      ? ((await prisma.route.findMany({ where: { id: { in: this.config.routes } } })) as Route[])
      : [];
    const routeById = new Map<string, Route>(routeRows.map((r) => [r.id, r]));

    const allRulesetIds = new Set<string>();
    for (const r of routeRows) for (const id of r.rulesets) allRulesetIds.add(id);
    const rulesetRows = allRulesetIds.size
      ? await prisma.ruleset.findMany({ where: { id: { in: [...allRulesetIds] } } })
      : [];
    const rulesetById = new Map(rulesetRows.map((rs) => [rs.id, rs]));

    const proxyGroups: unknown[] = [];

    // 按 policy（目标）聚合 parsed 结果：同一目标的规则集 / 内联规则合并去重。
    const baseProviders = (base["rule-providers"] as Record<string, unknown>) ?? {};
    const aggregator = new RuleAggregator(Object.keys(baseProviders), !this.keepNoResolve);

    for (const id of this.config.routes) {
      const r = routeById.get(id);
      if (!r) continue;

      const target = r.overrideName || r.name;
      const policy = r.outbound === "PROXY" ? target : r.outbound;

      if (r.outbound === "PROXY") {
        const matched = filterNodes(allNodes, r.filter);
        matched.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
        const nodeNames: string[] = [];
        for (const n of matched) {
          addProxy(n);
          nodeNames.push(n.name);
        }

        const features = new Set(r.features);
        const members: string[] = [];

        if (features.has("lb")) {
          const lbName = `${target}-LB`;
          proxyGroups.push({
            name: lbName,
            type: "load-balance",
            proxies: nodeNames,
            url: "https://www.gstatic.com/generate_204",
            interval: 300,
          });
          members.push(lbName);
        }
        if (features.has("auto")) {
          const autoName = `${target}-Auto`;
          proxyGroups.push({
            name: autoName,
            type: "url-test",
            proxies: nodeNames,
            url: "https://www.gstatic.com/generate_204",
            interval: 300,
          });
          members.push(autoName);
        }
        for (const name of nodeNames) members.push(name);
        members.push("DIRECT", "REJECT");

        proxyGroups.push({ name: target, type: "select", proxies: members });
      }

      // 取各规则集已存的 parsed 副本并聚合（不打上游；坏规则集跳过，不让整份订阅失败）。
      const cols = await Promise.all(
        r.rulesets.map(async (rsId) => {
          const rs = rulesetById.get(rsId);
          if (!rs) return null;
          try {
            return await new RulesetManager(rs).getParsedCollection();
          } catch {
            return null;
          }
        }),
      );
      for (const col of cols) if (col) aggregator.aggCollection(policy, col);

      // 路由自身的内联规则同样并入该目标。
      if (r.rules) aggregator.aggCollection(policy, RuleCollection.fromRuleList(r.rules));
    }

    const { rules, providers } = aggregator.finish();

    if (!rules.some((r) => r.startsWith("MATCH"))) {
      rules.push("MATCH,DIRECT");
    }

    const out: Record<string, unknown> = { ...base, proxies, "proxy-groups": proxyGroups, rules };
    const mergedProviders = { ...baseProviders, ...providers };
    if (Object.keys(mergedProviders).length) out["rule-providers"] = mergedProviders;
    return out;
  }

  async serialize(): Promise<string> {
    return YAML.stringify(await this.build());
  }

  async send(): Promise<Response> {
    const headers: Record<string, string> = {
      "content-type": "text/yaml; charset=utf-8",
      "profile-update-interval": String(this.updateIntervalHours),
    };
    if (this.displayName) {
      // RFC 5987 encoded form so clients show non-ASCII names correctly.
      const encoded = encodeURIComponent(this.displayName);
      headers["content-disposition"] = `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
    }
    return new Response(await this.serialize(), { headers });
  }
}
