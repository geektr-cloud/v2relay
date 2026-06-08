import YAML from "yaml";
import { prisma } from "@server/db";
import { RulesetManager } from "@server/core/rulesets/ruleset-manager";
import { filterNodes } from "@server/core/nodes/node-filter";
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
  ) {}

  async build(): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = this.template ? (YAML.parse(this.template) ?? {}) : {};

    let allNodes = await prisma.node.findMany();
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
    const rules: string[] = [];

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
        members.push(...nodeNames);
        members.push("DIRECT", "REJECT");

        proxyGroups.push({ name: target, type: "select", proxies: members });
      }

      for (const rsId of r.rulesets) {
        const rs = rulesetById.get(rsId);
        if (!rs) continue;
        const mgr = new RulesetManager(rs);
        for await (const rule of mgr.genClashRulesWithPolicy(policy)) rules.push(rule);
      }

      if (r.rules) {
        const inline = new RulesetManager({ id: `inline-${r.id}`, url: "", rules: r.rules });
        for await (const rule of inline.genClashRulesWithPolicy(policy)) rules.push(rule);
      }
    }

    if (!rules.find((r) => r.startsWith("MATCH"))) {
      rules.push("MATCH,DIRECT");
    }

    return { ...base, proxies, "proxy-groups": proxyGroups, rules };
  }

  async serialize(): Promise<string> {
    return YAML.stringify(await this.build());
  }

  async send(): Promise<Response> {
    return new Response(await this.serialize(), {
      headers: { "content-type": "text/yaml; charset=utf-8" },
    });
  }
}
