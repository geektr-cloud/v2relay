const LOGICAL_TYPES = new Set(["AND", "OR", "NOT", "SUB-RULE"]);
const ADDITIONS = new Set(["no-resolve", "src"]);

export class Rule {
  constructor(
    public type: string,
    public argument: string,
    public policy: string,
    public additions: string,
  ) {}

  static parse(line: string): Rule | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const firstComma = trimmed.indexOf(",");
    if (firstComma === -1) return null;

    const type = trimmed.slice(0, firstComma).trim();
    const rest = trimmed.slice(firstComma + 1);

    if (type === "MATCH") {
      return new Rule(type, "", rest.trim(), "");
    }

    const parts = rest.split(",");

    if (LOGICAL_TYPES.has(type)) {
      const policy = parts.pop()!.trim();
      return new Rule(type, parts.join(","), policy, "");
    }

    const last = parts[parts.length - 1]!.trim();
    let policy: string;
    let additions: string;
    if (ADDITIONS.has(last)) {
      additions = last;
      parts.pop();
      policy = parts.pop()?.trim() ?? "";
    } else {
      additions = "";
      policy = parts.pop()?.trim() ?? "";
    }

    return new Rule(type, parts.join(",").trim(), policy, additions);
  }

  static parseTemplate(line: string): Rule | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const firstComma = trimmed.indexOf(",");
    if (firstComma === -1) return new Rule(trimmed, "", "", "");

    const type = trimmed.slice(0, firstComma).trim();
    const rest = trimmed.slice(firstComma + 1);

    const parts = rest.split(",");
    const last = parts[parts.length - 1]!.trim();
    let additions = "";
    if (ADDITIONS.has(last)) {
      additions = last;
      parts.pop();
    }

    return new Rule(type, parts.join(",").trim(), "", additions);
  }

  stringify(): string {
    const parts = [this.type];
    if (this.argument) parts.push(this.argument);
    parts.push(this.policy);
    if (this.additions) parts.push(this.additions);
    return parts.join(",");
  }
}
