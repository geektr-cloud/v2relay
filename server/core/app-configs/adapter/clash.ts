import YAML from "yaml";
import { prisma } from "@server/db";
import { RulesetManager } from "@server/core/rulesets/ruleset-manager";
import type { AppConfigAdapter } from "./base";

export interface NodeGroup {
  name: string;
  nodes: string[];
}
export interface RulesetGroup {
  target: string;
  rulesets: string[];
}
export interface Routing {
  target: string;
  nodeGroups: string[];
  nodes: string[];
}
export interface ClashConfigData {
  nodeGroups: NodeGroup[];
  rulesetGroups: RulesetGroup[];
  routing: Routing[];
}

export class ClashConfigAdapter implements AppConfigAdapter {
  constructor(
    private template: string,
    private config: ClashConfigData,
  ) {}

  async build(): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = this.template ? (YAML.parse(this.template) ?? {}) : {};

    const nodeIds = new Set<string>();
    for (const g of this.config.nodeGroups) for (const id of g.nodes) nodeIds.add(id);
    for (const r of this.config.routing) for (const id of r.nodes) nodeIds.add(id);

    let nodes = nodeIds.size ? await prisma.node.findMany({ where: { id: { in: [...nodeIds] } } }) : [];
    nodes = nodes.sort((a, b) => `${a.subscriptionId}-${a.name}`.localeCompare(`${b.subscriptionId}-${b.name}`));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const proxies: unknown[] = [];
    const seenProxy = new Set<string>();
    const addProxy = (id: string) => {
      const n = nodeMap.get(id);
      if (!n || !n.connInfo || seenProxy.has(n.name)) return;
      seenProxy.add(n.name);
      proxies.push(n.connInfo);
    };

    // Build proxy-groups from nodeGroups
    const proxyGroups: unknown[] = [];
    for (const g of this.config.nodeGroups) {
      const names: string[] = [];
      for (const id of g.nodes) {
        addProxy(id);
        const n = nodeMap.get(id);
        if (n) names.push(n.name);
      }

      proxyGroups.push({
        name: `${g.name}-auto`,
        type: "url-test",
        proxies: names,
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
      });

      proxyGroups.push({ name: g.name, type: "select", proxies: [`${g.name}-auto`, ...names] });
    }

    // Build routing proxy-groups
    for (const r of this.config.routing) {
      const members: string[] = [...r.nodeGroups];
      for (const id of r.nodes) {
        addProxy(id);
        const n = nodeMap.get(id);
        if (n) members.push(n.name);
      }
      proxyGroups.push({ name: r.target, type: "select", proxies: members });
    }

    // Build rules from rulesetGroups
    const rules: string[] = [];
    for (const rg of this.config.rulesetGroups) {
      const rulesets = await prisma.ruleset.findMany({ where: { id: { in: rg.rulesets } } });
      for (const rs of rulesets) {
        const mgr = new RulesetManager(rs.id, rs.url);
        const generated = await mgr.genClashRulesWithPolicy(rg.target);
        rules.push(...generated);
      }
    }
    rules.push("MATCH,DIRECT");

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
