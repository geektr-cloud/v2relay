export interface RuleStatic {
  // rule prefix, e.g. "SRC-IP-CIDR"
  readonly prefix: string;
  // create the rule from the url
  fromString(s: string): Rule | null;
}

export type RuleSetType = "classical" | "domain" | "ipcidr";

export interface Rule {
  // rule prefix, e.g. "shadowsocks"
  readonly prefix: string;
  content: string;
  no_resolve?: true;
  src?: true;
  toString(): string;
  toRuleSetItem(): [RuleSetType, string];
}
