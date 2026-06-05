import YAML from "yaml";
import { prisma } from "@server/db";
import { RulesetManager } from "@server/core/rulesets/ruleset-manager";
import { filterNodes, type Filter } from "@server/core/nodes/node-filter";
import type { Node } from "@server/core/nodes/schema";
import type { AppConfigAdapter } from "./base";

export interface NodeGroup {
  name: string;
  filter: Filter;
}
export interface RulesetGroup {
  target: string;
  rulesets: string[];
}
export interface Routing {
  target: string;
  nodeGroups: string[];
  filter: Filter;
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

    let allNodes = await prisma.node.findMany();
    allNodes = allNodes.sort((a, b) =>
      `${a.subscriptionId}-${a.name}`.localeCompare(`${b.subscriptionId}-${b.name}`),
    );

    const proxies: unknown[] = [];
    const seenProxy = new Set<string>();
    const addProxy = (n: Node) => {
      if (!n.connInfo || seenProxy.has(n.name)) return;
      seenProxy.add(n.name);
      proxies.push(n.connInfo);
    };

    // Build proxy-groups from nodeGroups
    const proxyGroups: unknown[] = [];
    for (const g of this.config.nodeGroups) {
      const matched = filterNodes(allNodes, g.filter);
      const names: string[] = [];
      for (const n of matched) {
        addProxy(n);
        names.push(n.name);
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
      const matched = filterNodes(allNodes, r.filter);
      for (const n of matched) {
        addProxy(n);
        members.push(n.name);
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
