import type { Node } from "./schema";

export interface None {
  type: "none";
}

export interface All {
  type: "all";
}

export interface And {
  type: "and";
  value: Filter[];
}

export interface Or {
  type: "or";
  value: Filter[];
}

export interface Not {
  type: "not";
  value: Filter;
}

export interface Subscription {
  type: "subscription";
  value: string;
}

export interface Tag {
  type: "tag";
  value: string;
}

export interface Protocol {
  type: "protocol";
  value: string;
}

export interface Name {
  type: "name";
  value: {
    exact?: string;
    include?: string;
    exclude?: string;
  };
}

export type Filter = None | All | And | Or | Not | Subscription | Tag | Protocol | Name;

export function match(node: Node, rules: Filter): boolean {
  switch (rules.type) {
    case "none":
      return false;
    case "all":
      return true;
    case "and":
      for (const f of rules.value) if (!match(node, f)) return false;
      return true;
    case "or":
      for (const f of rules.value) if (match(node, f)) return true;
      return false;
    case "not":
      return !match(node, rules.value);
    case "subscription":
      return node.subscriptionId === rules.value;
    case "tag":
      return node.tags.includes(rules.value);
    case "protocol":
      return node.protocol === rules.value;
    case "name":
      if (rules.value.exact && node.name !== rules.value.exact) return false;
      if (rules.value.include && !node.name.includes(rules.value.include)) return false;
      if (rules.value.exclude && node.name.includes(rules.value.exclude)) return false;
      return true;
  }
}

export function filterNodes(nodes: Node[], rules: Filter): Node[] {
  return nodes.filter((n) => match(n, rules));
}
